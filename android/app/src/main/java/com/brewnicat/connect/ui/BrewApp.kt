package com.brewnicat.connect.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LocalCafe
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.screens.AccountScreen
import com.brewnicat.connect.ui.screens.CartScreen
import com.brewnicat.connect.ui.screens.CheckoutScreen
import com.brewnicat.connect.ui.screens.DataRequestScreen
import com.brewnicat.connect.ui.screens.FavoritesScreen
import com.brewnicat.connect.ui.screens.HomeScreen
import com.brewnicat.connect.ui.screens.ItemSheet
import com.brewnicat.connect.ui.screens.LoyaltyHistoryScreen
import com.brewnicat.connect.ui.screens.MenuScreen
import com.brewnicat.connect.ui.screens.OrderHistoryScreen
import com.brewnicat.connect.ui.screens.OrderScreen
import com.brewnicat.connect.ui.screens.OrdersScreen
import com.brewnicat.connect.ui.screens.ProfileScreen
import com.brewnicat.connect.ui.screens.ReviewsScreen
import com.brewnicat.connect.ui.screens.RewardsScreen
import com.brewnicat.connect.ui.screens.VisitScreen
import com.brewnicat.connect.ui.theme.Brand
import kotlinx.coroutines.launch

private data class Tab(val screen: Screen, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Screen.Home, "Home", Icons.Rounded.Home),
    Tab(Screen.Menu, "Menu", Icons.Rounded.LocalCafe),
    Tab(Screen.Orders, "Orders", Icons.AutoMirrored.Rounded.ReceiptLong),
    Tab(Screen.Account, "Account", Icons.Rounded.Person),
    Tab(Screen.Visit, "Visit", Icons.Rounded.Storefront),
)

@Composable
fun BrewApp(vm: AppViewModel) {
    val screen = vm.current
    val isTab = tabs.any { it.screen == screen }
    var sheetItem by remember { mutableStateOf<MenuItem?>(null) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun promptFavoriteSignIn() {
        sheetItem = null
        scope.launch {
            val res = snackbar.showSnackbar(
                message = "Sign in on the Account tab to save favorites.",
                actionLabel = "Sign in",
            )
            if (res == SnackbarResult.ActionPerformed) vm.selectTab(Screen.Account)
        }
    }

    BackHandler(enabled = vm.stack.size > 1 || screen != Screen.Home) { vm.back() }

    Scaffold(
        containerColor = Brand.colors.canvas,
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            if (isTab && screen != Screen.Orders && !vm.cart.isEmpty) {
                ExtendedFloatingActionButton(
                    onClick = { vm.open(Screen.Cart) },
                    containerColor = Brand.colors.accentFill, contentColor = Brand.colors.onAccentFill,
                    icon = {
                        BadgedBox(badge = { Badge(containerColor = Brand.colors.strong) { Text("${vm.cart.itemCount}") } }) {
                            Icon(Icons.Rounded.ShoppingBag, contentDescription = null)
                        }
                    },
                    text = { Text("View cart · ${Pricing.formatPeso(vm.cart.subtotal)}") },
                )
            }
        },
        bottomBar = {
            if (isTab) {
                NavigationBar(containerColor = Brand.colors.card) {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = screen == tab.screen,
                            onClick = { vm.selectTab(tab.screen) },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(tab.label, maxLines = 1) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Brand.colors.accent, selectedTextColor = Brand.colors.accent,
                                indicatorColor = Brand.colors.accentSurface,
                                unselectedIconColor = Brand.colors.muted, unselectedTextColor = Brand.colors.muted,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            AnimatedContent(screen, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "screen") { s ->
                when (s) {
                    Screen.Home -> HomeScreen(vm) { sheetItem = it }
                    Screen.Menu -> MenuScreen(vm, onNeedSignIn = ::promptFavoriteSignIn) { sheetItem = it }
                    Screen.Orders -> OrdersScreen(vm)
                    Screen.Account -> AccountScreen(vm)
                    Screen.Visit -> VisitScreen(vm)
                    Screen.Cart -> CartScreen(vm)
                    Screen.Checkout -> CheckoutScreen(vm)
                    is Screen.Order -> OrderScreen(vm, s.reference)
                    Screen.Profile -> ProfileScreen(vm)
                    Screen.OrderHistory -> OrderHistoryScreen(vm)
                    Screen.Favorites -> FavoritesScreen(vm) { sheetItem = it }
                    Screen.Rewards -> RewardsScreen(vm)
                    Screen.LoyaltyHistory -> LoyaltyHistoryScreen(vm)
                    Screen.Reviews -> ReviewsScreen(vm)
                    Screen.DataRequests -> DataRequestScreen(vm)
                }
            }
        }
    }

    sheetItem?.let { item ->
        ItemSheet(
            item = item,
            isFavorite = item.id in vm.favoriteIds,
            onToggleFavorite = { vm.toggleFavorite(item.id, ::promptFavoriteSignIn) },
            onAdd = { variantId, flavor, quantity ->
                vm.addToCart(item.id, variantId, flavor, quantity).also { error ->
                    if (error == null) {
                        sheetItem = null
                        scope.launch { snackbar.showSnackbar("Added ${quantity}× ${item.name} to your cart") }
                    }
                }
            },
            onDismiss = { sheetItem = null },
        )
    }
}
