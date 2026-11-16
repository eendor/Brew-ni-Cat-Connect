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
import androidx.compose.material3.Icon
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
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.brewnicat.connect.ui.screens.pressable
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

    val c = Brand.colors
    Box(
        Modifier.fillMaxSize().background(c.canvas)
            .drawBehind {
                drawRect(Brush.radialGradient(listOf(c.accent.copy(alpha = 0.16f), Color.Transparent), Offset(size.width * 0.95f, -40f), size.width * 0.95f))
                drawRect(Brush.radialGradient(listOf(c.strong.copy(alpha = 0.10f), Color.Transparent), Offset(-40f, size.height * 0.78f), size.width * 0.9f))
            },
    ) {
        Box(Modifier.fillMaxSize().navigationBarsPaddingIf(!isTab)) {
            AnimatedContent(
                screen,
                transitionSpec = { (fadeIn(tween(220)) + scaleIn(tween(260), initialScale = 0.98f)) togetherWith fadeOut(tween(120)) },
                label = "screen",
            ) { s ->
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

        if (isTab) {
            Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(150.dp).background(Brush.verticalGradient(listOf(Color.Transparent, c.canvas.copy(alpha = 0.92f)))))
            Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp)) {
                if (screen != Screen.Orders && !vm.cart.isEmpty) {
                    CartPill(count = vm.cart.itemCount, total = Pricing.formatPeso(vm.cart.subtotal), onClick = { vm.open(Screen.Cart) })
                    Spacer(Modifier.height(10.dp))
                }
                GlassTabBar(screen) { vm.selectTab(it) }
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = if (isTab) (if (vm.cart.isEmpty) 96.dp else 152.dp) else 100.dp))
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

private fun Modifier.navigationBarsPaddingIf(on: Boolean): Modifier = if (on) this.navigationBarsPadding() else this

@Composable
private fun CartPill(count: Int, total: String, onClick: () -> Unit) {
    val c = Brand.colors
    Row(
        Modifier.fillMaxWidth().height(54.dp)
            .shadow(14.dp, RoundedCornerShape(50), spotColor = c.accentFill.copy(alpha = 0.55f))
            .clip(RoundedCornerShape(50))
            .background(Brush.verticalGradient(listOf(c.accentFill.copy(alpha = 0.92f), c.accentFill)))
            .border(0.8.dp, Color.White.copy(alpha = 0.28f), RoundedCornerShape(50))
            .pressable(onClick = onClick).padding(horizontal = 22.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.ShoppingBag, contentDescription = null, tint = c.onAccentFill)
        Spacer(Modifier.width(10.dp))
        Text("View cart", style = MaterialTheme.typography.labelLarge, color = c.onAccentFill, modifier = Modifier.weight(1f))
        Text("$count · $total", style = MaterialTheme.typography.labelLarge, color = c.onAccentFill)
    }
}

/** Floating, rounded tab bar. Real backdrop blur needs API 31+ (minSdk is 26), so the glass is a tinted translucent fill with a light rim. */
@Composable
private fun GlassTabBar(selected: Screen, onSelect: (Screen) -> Unit) {
    val c = Brand.colors
    val haptic = LocalHapticFeedback.current
    val shape = RoundedCornerShape(36.dp)
    Row(
        Modifier.fillMaxWidth().height(68.dp)
            .shadow(22.dp, shape, ambientColor = c.shadow.copy(alpha = 0.14f), spotColor = c.shadow.copy(alpha = 0.28f))
            .clip(shape).background(c.glass).border(0.8.dp, c.rim, shape).padding(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        tabs.forEach { tab ->
            val on = selected == tab.screen
            val bg by animateColorAsState(if (on) c.accentSurface else Color.Transparent, tween(220), label = "tabBg")
            val tint by animateColorAsState(if (on) c.accent else c.muted, tween(220), label = "tabTint")
            Column(
                Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(30.dp)).background(bg)
                    .pressable { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onSelect(tab.screen) }
                    .semantics { contentDescription = tab.label; role = Role.Tab; this.selected = on },
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
            ) {
                Icon(tab.icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
                Text(tab.label, style = MaterialTheme.typography.labelMedium.copy(fontSize = 11.sp), color = tint, maxLines = 1)
            }
        }
    }
}
