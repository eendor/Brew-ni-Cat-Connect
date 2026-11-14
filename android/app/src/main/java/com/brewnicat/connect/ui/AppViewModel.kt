package com.brewnicat.connect.ui

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.data.Api
import com.brewnicat.connect.data.Cart
import com.brewnicat.connect.data.Checkout
import com.brewnicat.connect.data.MenuCatalog
import com.brewnicat.connect.data.OrderView
import com.brewnicat.connect.data.PlaceOrderResult
import com.brewnicat.connect.data.SavedOrder
import com.brewnicat.connect.data.ShopHours
import com.brewnicat.connect.data.Store
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

sealed interface Loadable<out T> {
    data object Loading : Loadable<Nothing>
    data class Ready<T>(val value: T) : Loadable<T>
    data class Failed(val message: String) : Loadable<Nothing>
}

/** Where the customer is. Tabs sit at the bottom; the rest open over them. */
sealed interface Screen {
    data object Home : Screen
    data object Menu : Screen
    data object Orders : Screen
    data object Visit : Screen
    data object Cart : Screen
    data object Checkout : Screen
    data class Order(val reference: String) : Screen
}

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val store = Store(app)
    val api = Api(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_PUBLISHABLE_KEY, BuildConfig.SITE_URL)

    // Navigation: a small back stack, with a tab always at the bottom.
    val stack = mutableStateListOf<Screen>(Screen.Home)
    val current: Screen get() = stack.last()

    fun selectTab(tab: Screen) { stack.clear(); stack.add(tab) }
    fun open(screen: Screen) { if (stack.last() != screen) stack.add(screen) }
    fun back(): Boolean = if (stack.size > 1) { stack.removeAt(stack.lastIndex); true } else if (stack.last() != Screen.Home) { selectTab(Screen.Home); true } else false

    // Menu and hours
    var menu by mutableStateOf<Loadable<MenuCatalog>>(Loadable.Loading); private set
    var hours by mutableStateOf<ShopHours?>(null); private set
    var cartNotice by mutableStateOf<String?>(null)

    fun loadMenu() {
        if (!api.isConfigured) { menu = Loadable.Failed(NOT_CONFIGURED); return }
        if (menu !is Loadable.Ready) menu = Loadable.Loading
        viewModelScope.launch {
            menu = runCatching { api.fetchMenu() }.fold(
                { catalog -> revalidateCart(catalog); Loadable.Ready(catalog) },
                { if (menu is Loadable.Ready) menu else Loadable.Failed(MENU_FAILED) },
            )
        }
        viewModelScope.launch { runCatching { api.fetchShopHours() }.onSuccess { hours = it } }
    }

    // Cart
    var cart by mutableStateOf(store.loadCart()); private set

    private fun updateCart(next: Cart) { cart = next; store.saveCart(next) }

    /** Null when added, or a message saying why it couldn't be. */
    fun addToCart(itemId: String, variantId: String, flavor: String?, quantity: Int): String? {
        val catalog = (menu as? Loadable.Ready)?.value ?: return "The menu is still loading. Please try again."
        return when (val r = cart.add(catalog, itemId, variantId, flavor, quantity)) {
            is Cart.AddResult.Added -> { updateCart(r.cart); null }
            is Cart.AddResult.Failed -> when (r.reason) {
                "item-unavailable" -> "Sorry, this item is unavailable right now."
                "availability-unknown" -> "We can't confirm this item is available right now."
                "unknown-flavor", "missing-price" -> "Please pick a flavor for this size."
                else -> "This item can't be added right now."
            }
        }
    }

    fun setQuantity(key: String, quantity: Int) = updateCart(cart.setQuantity(key, quantity))

    private fun revalidateCart(catalog: MenuCatalog) {
        if (cart.isEmpty) return
        val r = cart.revalidate(catalog)
        if (r.cart != cart) updateCart(r.cart)
        val notes = buildList {
            if (r.removed.isNotEmpty()) add("Removed from your cart because they can't be ordered now: ${r.removed.distinct().joinToString()}.")
            if (r.repriced.isNotEmpty()) add("New menu prices for: ${r.repriced.distinct().joinToString()}.")
        }
        if (notes.isNotEmpty()) cartNotice = notes.joinToString(" ")
    }

    // Checkout
    var details by mutableStateOf(store.loadDetails())
    var fieldErrors by mutableStateOf<Map<String, String>>(emptyMap()); private set
    var placing by mutableStateOf(false); private set
    var placeNotice by mutableStateOf<String?>(null); private set
    /** The new subtotal when menu prices changed; Place order again confirms it. */
    var confirmedSubtotal by mutableStateOf<Double?>(null); private set
    private var attempt: Triple<String, String, String>? = null // draft, idempotency key, tracking token

    fun updateDetails(next: Checkout.Details) {
        details = next
        fieldErrors = fieldErrors.filterKeys { k ->
            when (k) { "name" -> next.name.isBlank(); "phone" -> !Checkout.isValidPhone(next.phone); else -> true }
        }
    }

    fun placeOrder() {
        if (placing || cart.isEmpty) return
        val errors = Checkout.validate(details)
        fieldErrors = errors
        if (errors.isNotEmpty()) { placeNotice = "Please check your details, then place your order again."; return }
        val status = hours?.status()
        if (status is ShopHours.Status.Closed) { placeNotice = status.message; return }

        val expected = confirmedSubtotal ?: cart.subtotal
        val draft = Checkout.request("", "", details, cart, expected).toString()
        val (_, key, token) = attempt?.takeIf { it.first == draft }
            ?: Triple(draft, Checkout.newIdempotencyKey(), Checkout.newTrackingToken()).also { attempt = it }
        placing = true
        placeNotice = null
        viewModelScope.launch {
            val result = api.placeOrder(Checkout.request(key, token, details, cart, expected))
            placing = false
            when (result) {
                is PlaceOrderResult.Placed -> {
                    attempt = null
                    confirmedSubtotal = null
                    store.saveDetails(details)
                    store.saveOrder(SavedOrder(result.reference, result.trackingToken, System.currentTimeMillis()))
                    savedOrders = store.loadOrders()
                    details = details.copy(notes = "")
                    updateCart(Cart())
                    stack.clear(); stack.add(Screen.Orders); stack.add(Screen.Order(result.reference))
                    justPlaced = result.reference
                }
                is PlaceOrderResult.Failed -> {
                    fieldErrors = result.fieldErrors
                    placeNotice = result.message
                    when (result.reason) {
                        "price-changed" -> { confirmedSubtotal = result.newSubtotal; loadMenu() }
                        "line-unavailable" -> loadMenu()
                        "server-error" -> Unit // Place order again sends the same key, so it can't order twice.
                        else -> attempt = null
                    }
                }
            }
        }
    }

    // Orders placed from this phone, and the one being followed
    var savedOrders by mutableStateOf(store.loadOrders()); private set
    var justPlaced by mutableStateOf<String?>(null)
    val orders = mutableStateMapOf<String, Loadable<OrderView>>()
    private var tracking: Job? = null

    fun refreshOrderList() {
        savedOrders.take(10).forEach { saved ->
            if (orders[saved.reference] !is Loadable.Ready) orders[saved.reference] = Loadable.Loading
            viewModelScope.launch { loadOrder(saved) }
        }
    }

    private suspend fun loadOrder(saved: SavedOrder) {
        orders[saved.reference] = runCatching { api.fetchOrder(saved.reference, saved.trackingToken) }.fold(
            { it?.let { o -> Loadable.Ready(o) } ?: Loadable.Failed("We couldn't find this order.") },
            { orders[saved.reference] as? Loadable.Ready ?: Loadable.Failed("We couldn't load this order. Check your connection.") },
        )
    }

    /** Follows one order, checking every few seconds until it's finished. */
    fun track(reference: String) {
        tracking?.cancel()
        val saved = savedOrders.firstOrNull { it.reference == reference } ?: run {
            orders[reference] = Loadable.Failed("This order wasn't placed from this phone. Open its order link instead."); return
        }
        tracking = viewModelScope.launch {
            while (isActive) {
                loadOrder(saved)
                if ((orders[reference] as? Loadable.Ready)?.value?.isFinal == true) break
                delay(POLL_MS)
            }
        }
    }

    fun stopTracking() { tracking?.cancel(); tracking = null }

    /** An order link (https://…/orders/BNC-XXXXXX#token=…) opened in the app. */
    fun openOrderLink(reference: String, token: String) {
        if (!Checkout.isOrderReference(reference) || !Checkout.isTrackingToken(token)) return
        store.saveOrder(SavedOrder(reference, token, System.currentTimeMillis()))
        savedOrders = store.loadOrders()
        stack.clear(); stack.add(Screen.Orders); stack.add(Screen.Order(reference))
    }

    init { loadMenu() }

    companion object {
        const val POLL_MS = 8_000L
        const val MENU_FAILED = "We couldn't load the menu. Check your connection and try again."
        const val NOT_CONFIGURED = "This build of the app isn't connected to the shop."
    }
}
