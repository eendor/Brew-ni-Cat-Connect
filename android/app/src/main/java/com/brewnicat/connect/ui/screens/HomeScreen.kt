package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.data.ShopHours
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.theme.Brand

@Composable
fun HomeScreen(vm: AppViewModel, onItem: (MenuItem) -> Unit) {
    val bottomPad = if (vm.cart.isEmpty) 24.dp else 88.dp
    Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = bottomPad)) {
        BrandHeader()
        Hero(vm)
        Spacer(Modifier.height(20.dp))
        OpenStatus(vm.hours, Modifier.padding(horizontal = 20.dp))
        val latest = vm.savedOrders.firstOrNull()
        val latestView = latest?.let { (vm.orders[it.reference] as? Loadable.Ready)?.value }
        if (latest != null && latestView != null && !latestView.isFinal) {
            Spacer(Modifier.height(14.dp))
            Card(Modifier.padding(horizontal = 20.dp).fillMaxWidth().clickable { vm.open(Screen.Order(latest.reference)) }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🧋", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Your order ${latest.reference}", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                        Text(com.brewnicat.connect.data.OrderView.label(latestView.status), style = MaterialTheme.typography.bodyMedium, color = Brand.colors.accent)
                    }
                    Text("Track ›", style = MaterialTheme.typography.labelLarge, color = Brand.colors.accent)
                }
            }
        }
        Spacer(Modifier.height(26.dp))
        val catalog = (vm.menu as? Loadable.Ready)?.value
        if (catalog != null) {
            val favorites = catalog.categories.flatMap { it.items }.filter { MenuImages.forItem(it.name) != null }
            if (favorites.isNotEmpty()) {
                SectionTitle("Customer favorites", Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(12.dp))
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    favorites.forEach { item -> FavoriteCard(item) { onItem(item) } }
                }
            }
        }
        Spacer(Modifier.height(26.dp))
        Card(Modifier.padding(horizontal = 20.dp).fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("How ordering works", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                Step("1", "Pick your drinks and snacks from the menu.")
                Step("2", "Place your order. No account needed.")
                Step("3", "Follow it here until it's ready, then pick it up and pay at the counter.")
            }
        }
    }
}

@Composable
private fun Hero(vm: AppViewModel) {
    Box(
        Modifier.padding(horizontal = 20.dp).fillMaxWidth().clip(MaterialTheme.shapes.extraLarge)
            .background(Brush.linearGradient(listOf(Brand.colors.accentFill, Color(0xFF14492F)))),
    ) {
        Photo(
            R.drawable.menu_lucky_green_neko_matcha, null,
            Modifier.align(Alignment.CenterEnd).padding(end = 0.dp).size(170.dp).clip(CircleShape),
        )
        Column(Modifier.padding(22.dp).fillMaxWidth(0.62f)) {
            Text("Purr-fectly brewed, made for you", style = MaterialTheme.typography.headlineMedium, color = Color.White)
            Spacer(Modifier.height(8.dp))
            Text("Order ahead and pick it up in Kabacan.", style = MaterialTheme.typography.bodyMedium, color = Color(0xFFE3ECE2))
            Spacer(Modifier.height(16.dp))
            Text(
                "Order now", style = MaterialTheme.typography.labelLarge, color = Color(0xFF1D2A21),
                modifier = Modifier.clip(CircleShape).background(Color(0xFFF6EEE1)).clickable { vm.selectTab(Screen.Menu) }
                    .padding(horizontal = 20.dp, vertical = 12.dp),
            )
        }
    }
}

@Composable
fun OpenStatus(hours: ShopHours?, modifier: Modifier = Modifier) {
    if (hours == null) return
    val status = hours.status()
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        val open = status is ShopHours.Status.Open
        Box(Modifier.size(10.dp).clip(CircleShape).background(if (open) Brand.colors.success else Brand.colors.strong))
        Spacer(Modifier.width(8.dp))
        Text(
            when (status) {
                is ShopHours.Status.Open -> "Open now · until ${ShopHours.formatTime(status.closes)}"
                is ShopHours.Status.Closed -> status.message
            },
            style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink,
        )
    }
}

@Composable
private fun FavoriteCard(item: MenuItem, onClick: () -> Unit) {
    Column(Modifier.width(150.dp).clip(MaterialTheme.shapes.large).background(Brand.colors.card).clickable(onClick = onClick)) {
        Photo(MenuImages.forItem(item.name), item.name, Modifier.fillMaxWidth().aspectRatio(1f))
        Column(Modifier.padding(12.dp)) {
            Text(item.name, style = MaterialTheme.typography.titleSmall, color = Brand.colors.ink, maxLines = 2)
            Pricing.fromPrice(item)?.let { Text("From ${Pricing.formatPeso(it)}", style = MaterialTheme.typography.bodySmall, color = Brand.colors.accent) }
        }
    }
}

@Composable
private fun Step(n: String, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(28.dp).clip(CircleShape).background(Brand.colors.accentSurface), contentAlignment = Alignment.Center) {
            Text(n, style = MaterialTheme.typography.labelLarge, color = Brand.colors.accent)
        }
        Spacer(Modifier.width(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink)
    }
}
