package com.brewnicat.connect.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.AppUpdate
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.kit.Alert
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.LocalBackdrop
import com.brewnicat.connect.ui.kit.LocalBottomInset
import com.brewnicat.connect.ui.kit.LocalOverlayHost
import com.brewnicat.connect.ui.kit.OverlayHost
import com.brewnicat.connect.ui.kit.OverlayLayer
import com.brewnicat.connect.ui.kit.TabBar
import com.brewnicat.connect.ui.kit.TabBarGap
import com.brewnicat.connect.ui.kit.TabBarHeight
import com.brewnicat.connect.ui.kit.TabItem
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.glass
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.semibold
import com.brewnicat.connect.ui.screens.AboutScreen
import com.brewnicat.connect.ui.screens.AccountScreen
import com.brewnicat.connect.ui.screens.GalleryScreen
import com.brewnicat.connect.ui.screens.CartScreen
import com.brewnicat.connect.ui.screens.CheckoutScreen
import com.brewnicat.connect.ui.screens.DataRequestScreen
import com.brewnicat.connect.ui.screens.FavoritesScreen
import com.brewnicat.connect.ui.screens.HomeScreen
import com.brewnicat.connect.ui.screens.ItemSheet
import com.brewnicat.connect.ui.screens.LoyaltyHistoryScreen
import com.brewnicat.connect.ui.screens.OrderHistoryScreen
import com.brewnicat.connect.ui.screens.OrderScreen
import com.brewnicat.connect.ui.screens.OrdersScreen
import com.brewnicat.connect.ui.screens.ProfileScreen
import com.brewnicat.connect.ui.screens.ReviewsScreen
import com.brewnicat.connect.ui.screens.RewardsScreen
import com.brewnicat.connect.ui.screens.VisitScreen
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

private val tabScreens = listOf(Screen.Home, Screen.Orders, Screen.Account, Screen.Visit)
private val tabItems = listOf(
    TabItem("Home", KitIcons.House),
    TabItem("Orders", KitIcons.ReceiptText),
    TabItem("Account", KitIcons.UserRound),
    TabItem("Visit", KitIcons.Store),
)

private data class NavState(val screen: Screen, val depth: Int)

private val CartPillHeight = 52.dp
private val CartPillGap = 10.dp

/**
 * The app shell, built from Apple's iOS 27 UI Kit: screens push and pop like a
 * navigation stack, tab roots float a Liquid Glass tab bar (and the cart capsule)
 * over their content, and sheets, alerts and banners draw above everything.
 */
@Composable
fun BrewApp(vm: AppViewModel) {
    val overlays = remember { OverlayHost() }
    val backdrop = rememberHazeState()
    val screen = vm.current
    val depth = vm.stack.size
    val onTabRoot = depth == 1 && screen in tabScreens
    val showCart = onTabRoot && screen != Screen.Orders && !vm.cart.isEmpty
    var sheetItem by remember { mutableStateOf<MenuItem?>(null) }
    var sheetOpen by remember { mutableStateOf(false) }
    val saveable = rememberSaveableStateHolder()

    fun showItem(item: MenuItem) { sheetItem = item; sheetOpen = true }
    fun promptFavoriteSignIn() {
        sheetOpen = false
        overlays.toast("Sign in on the Account tab to save favorites.", KitIcons.Heart, "Sign in") { vm.selectTab(Screen.Account) }
    }

    BackHandler(enabled = depth > 1 || screen != Screen.Home) { vm.back() }

    val navBar = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    val bottomInset = if (onTabRoot) navBar + TabBarGap + TabBarHeight + (if (showCart) CartPillHeight + CartPillGap else 0.dp) else navBar

    CompositionLocalProvider(LocalOverlayHost provides overlays) {
        Box(Modifier.fillMaxSize().background(Kit.colors.grouped)) {
            Box(
                Modifier.fillMaxSize().hazeSource(backdrop)
                    .then(if (overlays.modal) Modifier.clearAndSetSemantics {} else Modifier),
            ) {
                CompositionLocalProvider(LocalBottomInset provides bottomInset) {
                    AnimatedContent(
                        NavState(screen, depth),
                        transitionSpec = {
                            val ease = tween<androidx.compose.ui.unit.IntOffset>(380, easing = FastOutSlowInEasing)
                            when {
                                targetState.depth > initialState.depth ->
                                    slideInHorizontally(ease) { it } togetherWith (slideOutHorizontally(ease) { -it / 3 } + fadeOut(tween(380)))
                                targetState.depth < initialState.depth ->
                                    (slideInHorizontally(ease) { -it / 3 } + fadeIn(tween(380))) togetherWith slideOutHorizontally(ease) { it }
                                else -> fadeIn(tween(200)) togetherWith fadeOut(tween(160))
                            }.apply { targetContentZIndex = targetState.depth.toFloat() }
                        },
                        contentKey = { it.screen },
                        label = "nav",
                    ) { state ->
                        saveable.SaveableStateProvider(state.screen.toString()) {
                            Box(Modifier.fillMaxSize().background(Kit.colors.grouped)) {
                                when (val s = state.screen) {
                                    Screen.Home -> HomeScreen(vm, ::showItem)
                                    Screen.Orders -> OrdersScreen(vm)
                                    Screen.Account -> AccountScreen(vm)
                                    Screen.Visit -> VisitScreen(vm)
                                    Screen.Cart -> CartScreen(vm)
                                    Screen.Checkout -> CheckoutScreen(vm)
                                    is Screen.Order -> OrderScreen(vm, s.reference)
                                    Screen.Profile -> ProfileScreen(vm)
                                    Screen.OrderHistory -> OrderHistoryScreen(vm)
                                    Screen.Favorites -> FavoritesScreen(vm, ::showItem)
                                    Screen.Rewards -> RewardsScreen(vm)
                                    Screen.LoyaltyHistory -> LoyaltyHistoryScreen(vm)
                                    Screen.Reviews -> ReviewsScreen(vm)
                                    Screen.DataRequests -> DataRequestScreen(vm)
                                    Screen.About -> AboutScreen(vm)
                                    Screen.Gallery -> GalleryScreen(vm)
                                }
                            }
                        }
                    }
                }
            }

            CompositionLocalProvider(LocalBackdrop provides backdrop) {
                AnimatedVisibility(
                    onTabRoot,
                    Modifier.align(Alignment.BottomCenter),
                    enter = slideInVertically(tween(300)) { it } + fadeIn(tween(200)),
                    exit = slideOutVertically(tween(260)) { it } + fadeOut(tween(160)),
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, bottom = navBar + TabBarGap),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        AnimatedVisibility(showCart, enter = fadeIn() + slideInVertically { it / 2 }, exit = fadeOut() + slideOutVertically { it / 2 }) {
                            CartPill(vm.cart.itemCount, Pricing.formatPeso(vm.cart.subtotal)) { vm.open(Screen.Cart) }
                        }
                        TabBar(tabItems, tabScreens.indexOf(screen), { vm.selectTab(tabScreens[it]) })
                    }
                }
                OverlayLayer(overlays)
            }
        }

        sheetItem?.let { item ->
            ItemSheet(
                item = item,
                open = sheetOpen,
                isFavorite = item.id in vm.favoriteIds,
                onToggleFavorite = { vm.toggleFavorite(item.id, ::promptFavoriteSignIn) },
                onAdd = { variantId, flavor, quantity ->
                    vm.addToCart(item.id, variantId, flavor, quantity).also { error ->
                        if (error == null) {
                            sheetOpen = false
                            overlays.toast("Added $quantity× ${item.name} to your cart", KitIcons.ShoppingBag)
                        }
                    }
                },
                onDismiss = { sheetItem = null; sheetOpen = false },
            )
        }

        // In-app update (FR-117): Android shows its own install confirmation after this.
        val update = vm.availableUpdate
        if (update != null && vm.updatePromptOpen) {
            val size = AppUpdate.sizeLabel(update.size)?.let { " ($it)" }.orEmpty()
            val notes = update.notes.takeIf { it.isNotEmpty() }?.let { "\n\n$it" }.orEmpty()
            Alert(
                title = "Update available",
                message = "Brew ni Cat ${update.versionName} is ready to download from the shop's website$size.$notes",
                primary = "Update",
                onPrimary = vm::startUpdate,
                secondary = "Later",
                onDismiss = vm::snoozeUpdate,
            )
        }
        LaunchedEffect(vm.updateMessage) {
            vm.updateMessage?.let { overlays.toast(it, KitIcons.RefreshCw); vm.clearUpdateMessage() }
        }
    }
}

/** The cart, floating above the tab bar as a tinted Liquid Glass capsule. */
@Composable
private fun CartPill(count: Int, total: String, onClick: () -> Unit) {
    val c = Kit.colors
    Row(
        Modifier.padding(bottom = CartPillGap).widthIn(max = 430.dp).fillMaxWidth().pressable(onClickLabel = "Open cart", onClick = onClick)
            .height(CartPillHeight).glass(CircleShape, tint = c.tintFill, tintAlpha = 0.9f).padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(KitIcons.ShoppingBag, null, tint = c.onTint, size = 20.dp)
        Text("View cart", style = KitType.headline, color = c.onTint, modifier = Modifier.weight(1f))
        Text("$count · $total", style = KitType.subhead.semibold, color = c.onTint)
    }
}
