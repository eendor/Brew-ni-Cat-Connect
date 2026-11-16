package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.brewnicat.connect.R
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.OrderView
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.IconTile
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.Logo
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Photo
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.SectionHeader
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.bold
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.semibold
import com.brewnicat.connect.ui.kit.softShadow

@Composable
fun HomeScreen(vm: AppViewModel, onItem: (MenuItem) -> Unit) {
    val c = Kit.colors
    Page("Brew ni Cat", trailing = { Logo(36.dp) }) {
        item(key = "hero") { Hero { vm.selectTab(Screen.Menu) } }
        item(key = "status") { OpenStatus(vm.hours, Modifier.padding(start = Gutter + 4.dp, end = Gutter, top = 14.dp)) }

        val latest = vm.savedOrders.firstOrNull()
        val latestView = latest?.let { (vm.orders[it.reference] as? Loadable.Ready)?.value }
        if (latest != null && latestView != null && !latestView.isFinal) {
            item(key = "active") {
                Section(header = "Your order") {
                    ListRow(
                        "Order ${latest.reference}", subtitle = OrderView.label(latestView.status),
                        leading = { IconTile(statusIcon(latestView.status), if (latestView.status == "ready") c.green else c.tint) },
                        detail = "Track", chevron = true,
                    ) { vm.open(Screen.Order(latest.reference)) }
                }
            }
        }

        val catalog = (vm.menu as? Loadable.Ready)?.value
        val favorites = catalog?.categories?.flatMap { it.items }?.filter { MenuImages.forItem(it.name) != null }.orEmpty()
        if (favorites.isNotEmpty()) {
            item(key = "favorites") {
                Column(Modifier.padding(top = 26.dp)) {
                    Box(Modifier.padding(horizontal = Gutter)) {
                        SectionHeader("Customer favorites", prominent = true, action = {
                            KitButton("See all", { vm.selectTab(Screen.Menu) }, style = ButtonStyle.Plain, size = ButtonSize.Small)
                        })
                    }
                    LazyRow(contentPadding = PaddingValues(horizontal = Gutter), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(favorites, key = { it.id }) { item -> FavoriteCard(item) { onItem(item) } }
                    }
                }
            }
        }

        item(key = "how") {
            Section(header = "How ordering works") {
                Step(KitIcons.Coffee, c.brown, "Pick your drinks and snacks from the menu.")
                Step(KitIcons.ShoppingBag, c.tint, "Place your order. No account needed.")
                Step(KitIcons.BellRing, c.orange, "Follow it here until it's ready, then pick it up and pay at the counter.")
            }
        }
    }
}

@Composable
private fun Hero(onOrder: () -> Unit) {
    val shape = RoundedCornerShape(30.dp)
    Box(
        Modifier.padding(horizontal = Gutter).padding(top = 6.dp).fillMaxWidth()
            .softShadow(shape, Color(0x40123F29), 26.dp, 10.dp)
            .clip(shape).background(Brush.linearGradient(listOf(Color(0xFF2A8156), Color(0xFF123F29)))),
    ) {
        Box(Modifier.align(Alignment.TopEnd).offset(x = 48.dp, y = (-36).dp).size(190.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.07f)))
        Photo(
            R.drawable.menu_lucky_green_neko_matcha, null,
            Modifier.align(Alignment.BottomEnd).offset(x = 28.dp, y = 28.dp).size(150.dp).rotate(-6f).clip(CircleShape)
                .border(3.dp, Color.White.copy(alpha = 0.55f), CircleShape),
        )
        Column(Modifier.padding(22.dp).fillMaxWidth(0.66f)) {
            Text("PICKUP IN KABACAN", style = KitType.caption1.semibold.copy(letterSpacing = 1.2.sp), color = Color(0xFFBFE3CE))
            Spacer(Modifier.height(6.dp))
            Text("Purr-fectly brewed, made for you", style = KitType.title2.bold, color = Color.White, modifier = Modifier.semantics { heading() })
            Spacer(Modifier.height(18.dp))
            Text(
                "Order now", style = KitType.subhead.semibold, color = Color(0xFF123F29),
                modifier = Modifier.pressable(onClick = onOrder).clip(CircleShape).background(Color.White).padding(horizontal = 20.dp, vertical = 11.dp),
            )
            Spacer(Modifier.height(10.dp))
        }
    }
}

@Composable
private fun FavoriteCard(item: MenuItem, onClick: () -> Unit) {
    val c = Kit.colors
    val shape = RoundedCornerShape(22.dp)
    Column(Modifier.width(150.dp).pressable(onClick = onClick).clip(shape).background(c.cell)) {
        Photo(MenuImages.forItem(item.name), item.name, Modifier.fillMaxWidth().aspectRatio(1f))
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(item.name, style = KitType.subhead.semibold, color = c.label, maxLines = 2, minLines = 2)
            Pricing.fromPrice(item)?.let { Text("From ${Pricing.formatPeso(it)}", style = KitType.footnote, color = c.label2, modifier = Modifier.padding(top = 2.dp)) }
        }
    }
}

@Composable
private fun Step(icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, text: String) {
    ListRow(text, leading = { IconTile(icon, color) })
}

