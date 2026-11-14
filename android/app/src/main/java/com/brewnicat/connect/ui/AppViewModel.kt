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
import com.brewnicat.connect.data.ApiAuthException
import com.brewnicat.connect.data.AuthCallback
import com.brewnicat.connect.data.AuthPkce
import com.brewnicat.connect.data.AuthSession
import com.brewnicat.connect.data.Cart
import com.brewnicat.connect.data.Checkout
import com.brewnicat.connect.data.CustomerProfile
import com.brewnicat.connect.data.DataRequestEntry
import com.brewnicat.connect.data.DataRequestValidation
import com.brewnicat.connect.data.LoyaltyFormat
import com.brewnicat.connect.data.LoyaltySettings
import com.brewnicat.connect.data.LoyaltyTransaction
import com.brewnicat.connect.data.MenuCatalog
import com.brewnicat.connect.data.OrderHistoryEntry
import com.brewnicat.connect.data.OrderHistoryPage
import com.brewnicat.connect.data.OrderView
import com.brewnicat.connect.data.PlaceOrderResult
import com.brewnicat.connect.data.PostReviewResult
import com.brewnicat.connect.data.ProfileValidation
import com.brewnicat.connect.data.RedeemResult
import com.brewnicat.connect.data.Reorder
import com.brewnicat.connect.data.ReviewItem
import com.brewnicat.connect.data.ReviewValidation
import com.brewnicat.connect.data.ReviewsPage
import com.brewnicat.connect.data.RewardItem
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
    data object Account : Screen
    data object Visit : Screen
    data object Cart : Screen
    data object Checkout : Screen
    data class Order(val reference: String) : Screen
    data object Profile : Screen
    data object OrderHistory : Screen
    data object Favorites : Screen
    data object Rewards : Screen
    data object LoyaltyHistory : Screen
    data object Reviews : Screen
    data object DataRequests : Screen
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
            val result = try {
                val activeSession = session
                if (activeSession == null) {
                    api.placeOrder(Checkout.request(key, token, details, cart, expected))
                } else {
                    withValidToken(activeSession) { accessToken ->
                        api.placeOrder(Checkout.request(key, token, details, cart, expected), accessToken)
                    }
                }
            } catch (_: ApiAuthException) {
                placing = false
                placeNotice = "Your sign-in session expired. Please sign in again on the Account tab, or sign out to place a guest order."
                return@launch
            }
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
            viewModelScope.launch { loadOrder(saved.reference, saved.trackingToken) }
        }
    }

    private suspend fun loadOrder(reference: String, trackingToken: String?) {
        orders[reference] = runCatching {
            val activeSession = session
            if (!trackingToken.isNullOrBlank()) {
                api.fetchOrder(reference, trackingToken, activeSession?.accessToken)
            } else if (activeSession != null) {
                withValidToken(activeSession) { token -> api.fetchOrder(reference, null, token) }
            } else {
                null
            }
        }.fold(
            { it?.let { o -> Loadable.Ready(o) } ?: Loadable.Failed("We couldn't find this order.") },
            { orders[reference] as? Loadable.Ready ?: Loadable.Failed("We couldn't load this order. Check your connection.") },
        )
    }

    /** Follows one order, checking every few seconds until it's finished. */
    fun track(reference: String) {
        tracking?.cancel()
        val saved = savedOrders.firstOrNull { it.reference == reference }
        if (saved == null && session == null) {
            orders[reference] = Loadable.Failed("This order wasn't placed from this phone. Open its order link instead.")
            return
        }
        tracking = viewModelScope.launch {
            while (isActive) {
                loadOrder(reference, saved?.trackingToken)
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

    // --- Account, auth & loyalty (Phase 2) ---

    var session by mutableStateOf(store.loadSession()); private set
    var authBusy by mutableStateOf(false); private set
    var authError by mutableStateOf<String?>(null); private set

    var profile by mutableStateOf<CustomerProfile?>(null); private set
    var profileLoading by mutableStateOf(false); private set
    var profileSaving by mutableStateOf(false); private set
    var profileNotice by mutableStateOf<String?>(null); private set
    var profileError by mutableStateOf<String?>(null); private set

    var favoriteIds by mutableStateOf<Set<String>>(emptySet()); private set
    var favoritesLoading by mutableStateOf(false); private set
    var favoritesError by mutableStateOf<String?>(null); private set

    var loyaltyBalance by mutableStateOf<Int?>(null); private set
    var rewards by mutableStateOf<List<RewardItem>>(emptyList()); private set
    var loyaltySettings by mutableStateOf(LoyaltySettings()); private set
    var loyaltyHistory by mutableStateOf<List<LoyaltyTransaction>>(emptyList()); private set
    var rewardsLoading by mutableStateOf(false); private set
    var rewardsError by mutableStateOf<String?>(null); private set
    var redeeming by mutableStateOf(false); private set
    var lastRedeem by mutableStateOf<RedeemResult.Success?>(null); private set
    var redeemError by mutableStateOf<String?>(null); private set

    var orderHistory by mutableStateOf<Loadable<OrderHistoryPage>?>(null); private set
    var orderHistoryPage by mutableStateOf(1); private set

    var reviewsState by mutableStateOf<Loadable<ReviewsPage>>(Loadable.Loading); private set
    var loadedReviews by mutableStateOf<List<ReviewItem>>(emptyList()); private set
    var reviewsPage by mutableStateOf(0); private set
    var reviewsTotalCount by mutableStateOf(0); private set
    var reviewsAverage by mutableStateOf(0.0); private set
    var reviewsLoadingMore by mutableStateOf(false); private set
    var myReview by mutableStateOf<ReviewItem?>(null); private set
    var reviewSubmitting by mutableStateOf(false); private set
    var reviewNotice by mutableStateOf<String?>(null); private set
    var reviewError by mutableStateOf<String?>(null); private set

    var dataRequests by mutableStateOf<Loadable<List<DataRequestEntry>>>(Loadable.Loading); private set
    var dataRequestSubmitting by mutableStateOf(false); private set
    var dataRequestNotice by mutableStateOf<String?>(null); private set
    var dataRequestError by mutableStateOf<String?>(null); private set

    fun startGoogleSignIn(): String {
        authError = null
        val verifier = AuthPkce.generateCodeVerifier()
        store.savePendingPkceVerifier(verifier)
        return AuthPkce.buildGoogleAuthorizeUrl(BuildConfig.SUPABASE_URL, AuthPkce.codeChallenge(verifier))
    }

    fun handleAuthCallback(uriString: String) {
        when (val cb = AuthPkce.parseCallback(uriString)) {
            is AuthCallback.None -> return
            is AuthCallback.Error -> {
                store.savePendingPkceVerifier(null)
                authBusy = false
                authError = cb.message
            }
            is AuthCallback.Code -> {
                val verifier = store.loadPendingPkceVerifier()
                store.savePendingPkceVerifier(null)
                if (verifier.isNullOrBlank()) {
                    authError = "Your sign-in check expired before completing. Please try again."
                    return
                }
                authBusy = true
                authError = null
                viewModelScope.launch {
                    runCatching { api.exchangePkceCode(cb.code, verifier) }.fold(
                        onSuccess = { nextSession ->
                            store.saveSession(nextSession)
                            session = nextSession
                            authBusy = false
                            loadAccountSummary()
                            if (stack.none { it == Screen.Account }) {
                                selectTab(Screen.Account)
                            }
                        },
                        onFailure = {
                            authBusy = false
                            authError = "We couldn't finish signing you in with Google. Please try again."
                        },
                    )
                }
            }
        }
    }

    fun clearAuthError() { authError = null }

    fun signOut() {
        val currentToken = session?.accessToken
        store.saveSession(null)
        store.savePendingPkceVerifier(null)
        session = null
        clearAccountState()
        viewModelScope.launch {
            if (!currentToken.isNullOrBlank()) api.signOut(currentToken)
        }
    }

    private fun clearAccountState() {
        profile = null
        favoriteIds = emptySet()
        loyaltyBalance = null
        loyaltyHistory = emptyList()
        lastRedeem = null
        redeemError = null
        orderHistory = null
        myReview = null
        dataRequests = Loadable.Ready(emptyList())
    }

    private suspend fun <T> withValidToken(
        active: AuthSession,
        block: suspend (String) -> T,
    ): T {
        var current = active
        if (current.isExpired()) {
            current = refreshAndPersist(current)
        }
        return try {
            block(current.accessToken)
        } catch (e: ApiAuthException) {
            val refreshed = try {
                refreshAndPersist(current)
            } catch (_: Exception) {
                throw e
            }
            block(refreshed.accessToken)
        }
    }

    private suspend fun refreshAndPersist(current: AuthSession): AuthSession = try {
        val refreshed = api.refreshSession(current.refreshToken)
        store.saveSession(refreshed)
        session = refreshed
        refreshed
    } catch (e: ApiAuthException) {
        store.saveSession(null)
        session = null
        clearAccountState()
        authError = "Your session expired. Please sign in again."
        throw e
    }

    fun loadAccountSummary() {
        val active = session ?: return
        viewModelScope.launch {
            runCatching {
                withValidToken(active) { token ->
                    val loadedProfile = runCatching { api.fetchProfile(active.userId, token) }.getOrNull()
                    val loadedFavs = runCatching { api.fetchFavorites(active.userId, token) }.getOrNull()
                    val loadedBal = runCatching { api.fetchLoyaltyBalance(active.userId, token) }.getOrNull()
                    Triple(loadedProfile, loadedFavs, loadedBal)
                }
            }.onSuccess { (p, favs, bal) ->
                if (p != null) {
                    profile = p
                    prefillDetailsFromProfile(p)
                }
                if (favs != null) favoriteIds = favs.map { it.itemId }.toSet()
                if (bal != null) loyaltyBalance = bal
            }
        }
    }

    private fun prefillDetailsFromProfile(p: CustomerProfile) {
        val current = details
        val nextName = current.name.ifBlank { p.fullName }
        val nextPhone = current.phone.ifBlank { p.phone.orEmpty() }
        if (nextName != current.name || nextPhone != current.phone) {
            details = current.copy(name = nextName, phone = nextPhone)
        }
    }

    fun loadProfile() {
        val active = session ?: return
        profileLoading = true
        profileError = null
        profileNotice = null
        viewModelScope.launch {
            runCatching { withValidToken(active) { token -> api.fetchProfile(active.userId, token) } }.fold(
                onSuccess = { loaded ->
                    profile = loaded
                    loaded?.let(::prefillDetailsFromProfile)
                    profileLoading = false
                },
                onFailure = {
                    profileLoading = false
                    profileError = "Unable to load profile. Please try again later."
                },
            )
        }
    }

    fun saveProfile(fullName: String, phone: String) {
        val active = session ?: return
        val check = ProfileValidation.validate(fullName, phone)
        if (!check.isValid) {
            profileError = check.fullNameError ?: check.phoneError
            profileNotice = null
            return
        }
        profileSaving = true
        profileError = null
        profileNotice = null
        viewModelScope.launch {
            runCatching {
                withValidToken(active) { token ->
                    api.saveProfile(active.userId, check.normalizedName!!, check.normalizedPhone!!, token)
                }
            }.fold(
                onSuccess = { saved ->
                    profile = saved
                    val updated = details.copy(name = saved.fullName, phone = saved.phone.orEmpty())
                    details = updated
                    store.saveDetails(updated)
                    profileSaving = false
                    profileNotice = "Profile saved."
                },
                onFailure = {
                    profileSaving = false
                    profileError = "We couldn't save your profile. Please try again."
                },
            )
        }
    }

    fun toggleFavorite(itemId: String, onNeedSignIn: () -> Unit = {}) {
        val active = session ?: run { onNeedSignIn(); return }
        val wasFavorite = itemId in favoriteIds
        favoriteIds = if (wasFavorite) favoriteIds - itemId else favoriteIds + itemId
        viewModelScope.launch {
            runCatching {
                withValidToken(active) { token ->
                    if (wasFavorite) api.removeFavorite(active.userId, itemId, token)
                    else api.addFavorite(active.userId, itemId, token)
                }
            }.onFailure {
                favoriteIds = if (wasFavorite) favoriteIds + itemId else favoriteIds - itemId
                favoritesError = "Couldn't update favorite. Check your connection."
            }
        }
    }

    fun loadFavoritesScreen() {
        val active = session ?: return
        favoritesLoading = true
        favoritesError = null
        if (menu !is Loadable.Ready) loadMenu()
        viewModelScope.launch {
            runCatching { withValidToken(active) { token -> api.fetchFavorites(active.userId, token) } }.fold(
                onSuccess = { list ->
                    favoriteIds = list.map { it.itemId }.toSet()
                    favoritesLoading = false
                },
                onFailure = {
                    favoritesLoading = false
                    favoritesError = "Unable to load your favorites. Please try again later."
                },
            )
        }
    }

    fun loadRewards() {
        val active = session ?: return
        rewardsLoading = true
        rewardsError = null
        viewModelScope.launch {
            runCatching {
                withValidToken(active) { token ->
                    val bal = api.fetchLoyaltyBalance(active.userId, token)
                    val catalog = api.fetchLoyaltyRewards(token)
                    val settings = api.fetchLoyaltySettings(token)
                    Triple(bal, catalog, settings)
                }
            }.fold(
                onSuccess = { (bal, cat, set) ->
                    loyaltyBalance = bal
                    rewards = cat
                    loyaltySettings = set
                    rewardsLoading = false
                },
                onFailure = {
                    rewardsLoading = false
                    rewardsError = "Unable to load rewards and points. Please try again later."
                },
            )
        }
    }

    fun loadLoyaltyHistory() {
        val active = session ?: return
        rewardsLoading = true
        rewardsError = null
        viewModelScope.launch {
            runCatching { withValidToken(active) { token -> api.fetchLoyaltyHistory(active.userId, token) } }.fold(
                onSuccess = { list ->
                    loyaltyHistory = list
                    rewardsLoading = false
                },
                onFailure = {
                    rewardsLoading = false
                    rewardsError = "Unable to load points history. Please try again later."
                },
            )
        }
    }

    fun redeemReward(rewardId: String) {
        val active = session ?: return
        redeeming = true
        redeemError = null
        viewModelScope.launch {
            runCatching { withValidToken(active) { token -> api.redeemReward(rewardId, token) } }.fold(
                onSuccess = { result ->
                    redeeming = false
                    when (result) {
                        is RedeemResult.Success -> {
                            lastRedeem = result
                            loyaltyBalance = result.newBalance
                            loadRewards()
                        }
                        is RedeemResult.Failure -> {
                            redeemError = LoyaltyFormat.redeemErrorMessage(result)
                        }
                    }
                },
                onFailure = {
                    redeeming = false
                    redeemError = "We couldn't complete this redemption. Please try again."
                },
            )
        }
    }

    fun dismissRedeemFeedback() {
        lastRedeem = null
        redeemError = null
    }

    fun loadOrderHistory(page: Int = orderHistoryPage) {
        val active = session ?: return
        orderHistoryPage = page.coerceAtLeast(1)
        orderHistory = Loadable.Loading
        viewModelScope.launch {
            orderHistory = runCatching {
                withValidToken(active) { token -> api.fetchOrderHistory(active.userId, token, orderHistoryPage, 10) }
            }.fold(
                { Loadable.Ready(it) },
                { Loadable.Failed("Unable to load order history. Please try again later.") },
            )
        }
    }

    fun openOrderFromHistory(reference: String) {
        open(Screen.Order(reference))
    }

    fun reorderFromHistory(entry: OrderHistoryEntry): String? {
        val catalog = (menu as? Loadable.Ready)?.value ?: return "Menu is still loading. Try again in a moment."
        val res = Reorder.reorder(entry.items, catalog, cart)
        updateCart(res.cart)
        val notes = buildList {
            res.summaryMessage?.let(::add)
            addAll(res.allNotices)
        }
        if (notes.isNotEmpty()) cartNotice = notes.joinToString("\n")
        if (res.addedQuantity > 0) open(Screen.Cart)
        return if (res.addedQuantity == 0) res.unavailableNotices.firstOrNull() ?: "None of these items are available right now." else null
    }

    fun loadReviews(reset: Boolean = true) {
        val targetPage = if (reset) 0 else reviewsPage + 1
        if (reset) {
            reviewsState = Loadable.Loading
            reviewsPage = 0
        } else {
            if (reviewsLoadingMore) return
            reviewsLoadingMore = true
        }
        viewModelScope.launch {
            runCatching { api.fetchReviews(targetPage, 10) }.fold(
                onSuccess = { page ->
                    val merged = if (reset) page.reviews else loadedReviews + page.reviews
                    loadedReviews = merged
                    reviewsPage = targetPage
                    reviewsTotalCount = page.totalCount
                    reviewsAverage = page.averageRating
                    reviewsState = Loadable.Ready(ReviewsPage(merged, page.totalCount, page.averageRating))
                    reviewsLoadingMore = false
                },
                onFailure = {
                    if (reset) reviewsState = Loadable.Failed("Unable to load reviews. Check your connection.")
                    reviewsLoadingMore = false
                },
            )
            val active = session
            if (reset && active != null) {
                runCatching { withValidToken(active) { token -> api.fetchMyReview(token) } }
                    .onSuccess { myReview = it }
            }
        }
    }

    fun submitReview(rating: Int, body: String) {
        val check = ReviewValidation.validate(rating, body)
        if (!check.isValid) {
            reviewError = check.ratingError ?: check.bodyError
            reviewNotice = null
            return
        }
        reviewSubmitting = true
        reviewError = null
        reviewNotice = null
        val editingExisting = session != null && myReview != null
        viewModelScope.launch {
            runCatching {
                val active = session
                if (active == null) api.postReview(rating, check.trimmedBody!!, null)
                else withValidToken(active) { token -> api.postReview(rating, check.trimmedBody!!, token) }
            }.fold(
                onSuccess = { res ->
                    reviewSubmitting = false
                    when (res) {
                        is PostReviewResult.Success -> {
                            myReview = if (session != null) res.review else myReview
                            reviewNotice = if (editingExisting) "Review updated." else "Thank you! Your review has been posted."
                            loadReviews(reset = true)
                        }
                        is PostReviewResult.Failure -> reviewError = res.message
                    }
                },
                onFailure = {
                    reviewSubmitting = false
                    reviewError = "We couldn't submit your review right now. Please try again."
                },
            )
        }
    }

    fun loadDataRequests() {
        val active = session ?: return
        dataRequests = Loadable.Loading
        dataRequestError = null
        viewModelScope.launch {
            dataRequests = runCatching {
                withValidToken(active) { token -> api.fetchDataRequests(active.userId, token) }
            }.fold(
                { Loadable.Ready(it) },
                { Loadable.Failed("Unable to load your data requests. Please try again later.") },
            )
        }
    }

    fun submitDataRequest(kind: String, message: String) {
        val active = session ?: return
        val err = DataRequestValidation.validate(message)
        if (err != null) {
            dataRequestError = err
            dataRequestNotice = null
            return
        }
        dataRequestSubmitting = true
        dataRequestError = null
        dataRequestNotice = null
        viewModelScope.launch {
            runCatching { withValidToken(active) { token -> api.submitDataRequest(kind, message, token) } }.fold(
                onSuccess = {
                    dataRequestSubmitting = false
                    dataRequestNotice = "Your request has been submitted."
                    loadDataRequests()
                },
                onFailure = {
                    dataRequestSubmitting = false
                    dataRequestError = "We couldn't send your request. Please try again."
                },
            )
        }
    }

    init {
        loadMenu()
        if (session != null) loadAccountSummary()
    }

    companion object {
        const val POLL_MS = 8_000L
        const val MENU_FAILED = "We couldn't load the menu. Check your connection and try again."
        const val NOT_CONFIGURED = "This build of the app isn't connected to the shop."
    }
}
