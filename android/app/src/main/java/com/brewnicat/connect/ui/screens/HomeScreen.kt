package com.brewnicat.connect.ui.screens

import com.brewnicat.connect.ui.kit.GlassIconButton
import com.brewnicat.connect.ui.ProfileAvatar
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import android.content.Intent
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.core.net.toUri
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.data.HomeProduct
import com.brewnicat.connect.data.HomeRows
import com.brewnicat.connect.data.Availability
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Notice
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
import com.brewnicat.connect.ui.kit.glass
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
    val listState = rememberLazyListState()
    val session = vm.session
    val signedIn = session != null

    // "The Menu" (from Home or any other screen) scrolls down to the first category row.
    LaunchedEffect(vm.menuScrollRequest) {
        if (vm.menuScrollRequest > 0) {
            val index = listState.layoutInfo.visibleItemsInfo.firstOrNull { (it.key as? String)?.startsWith("row-") == true }?.index
                ?: menuRowIndex(vm)
            listState.animateScrollToItem(index)
        }
    }

    Page(
        "Brew ni Cat",
        state = listState,
        titleLeading = { Logo(40.dp) },
        trailing = {
            CoinsPill(HomeRows.coinsPill(signedIn, vm.loyaltyBalance), HomeRows.pointsLabel(signedIn, vm.loyaltyBalance)) {
                if (signedIn) vm.open(Screen.Rewards) else vm.selectTab(Screen.Account)
            }
            if (session != null) {
                val name = vm.profile?.fullName?.takeIf { it.isNotBlank() } ?: session.label
                Box(
                    Modifier.size(40.dp).clip(CircleShape).pressable(onClick = { vm.selectTab(Screen.Account) }, role = Role.Button)
                        .semantics(mergeDescendants = true) { contentDescription = "Account" },
                    contentAlignment = Alignment.Center,
                ) { ProfileAvatar(name, session.photoUrl, 36.dp) }
            } else {
                GlassIconButton(KitIcons.UserRound, "Account", { vm.selectTab(Screen.Account) })
            }
        },
    ) {
        item(key = "status") { OpenStatus(vm.hours, Modifier.padding(start = Gutter + 4.dp, end = Gutter, top = 12.dp)) }

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

        item(key = "tiles") {
            val tiles = listOf(
                HomeTile("The Menu", KitIcons.Coffee, c.brown) { vm.showMenu() },
                HomeTile("About", KitIcons.Info, c.tint) { vm.open(Screen.About) },
                HomeTile("Gallery", KitIcons.Heart, c.pink) { vm.open(Screen.Gallery) },
                HomeTile("Games", KitIcons.Gamepad2, c.purple) { vm.openGamesPopup() },
                HomeTile("Contact", KitIcons.MapPin, c.red) { vm.selectTab(Screen.Visit) },
                HomeTile("Reviews", KitIcons.MessageSquareText, c.indigo) { vm.open(Screen.Reviews) },
            )
            Column(
                Modifier.padding(horizontal = Gutter).padding(top = 18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val catalog = (vm.menu as? Loadable.Ready)?.value
                if (catalog?.categories?.any { category ->
                    category.items.any { it.dealPercent > 0 && it.availability == Availability.AVAILABLE }
                } == true) {
                    Notice("Deals today: look for the percentage-off badge on selected items.")
                }
                tiles.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { tile -> TileButton(tile, Modifier.weight(1f)) }
                    }
                }
            }
        }

        when (val menu = vm.menu) {
            is Loadable.Ready -> HomeRows.build(menu.value).forEach { row ->
                item(key = "row-${row.categoryId}") {
                    Column(Modifier.padding(top = 26.dp)) {
                        Box(Modifier.padding(horizontal = Gutter)) {
                            SectionHeader(row.title, prominent = true)
                        }
                        LazyRow(contentPadding = PaddingValues(horizontal = Gutter), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(row.products, key = { it.item.id }) { product -> ProductCard(product) { onItem(product.item) } }
                        }
                    }
                }
            }
            is Loadable.Failed -> item(key = "menu-failed") {
                Column(Modifier.padding(horizontal = Gutter).padding(top = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Notice("We couldn't load the menu. Check your connection and try again.", warning = true)
                    KitButton("Try again", { vm.loadMenu() }, style = ButtonStyle.Plain, size = ButtonSize.Small)
                }
            }
            else -> item(key = "menu-loading") { LoadingState(Modifier.padding(top = 24.dp)) }
        }

        item(key = "how") {
            Section(header = "How ordering works") {
                Step(KitIcons.Coffee, c.brown, "Pick your drinks and snacks from the menu.")
                Step(KitIcons.ShoppingBag, c.tint, "Place your order. No account needed.")
                Step(KitIcons.BellRing, c.orange, "Follow it here until it's ready, then pick it up and pay at the counter.")
            }
        }
    }

    if (vm.gamesPopupOpen && vm.current == Screen.Home) MiniGamesDialog(vm)
}

private data class HomeTile(
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val color: Color,
    val onClick: () -> Unit,
)

/** Index of the first category row: page title, status, the active order if any, then the tiles. */
private fun menuRowIndex(vm: AppViewModel): Int {
    val latest = vm.savedOrders.firstOrNull()
    val view = latest?.let { (vm.orders[it.reference] as? Loadable.Ready)?.value }
    return 3 + if (view != null && !view.isFinal) 1 else 0
}

/** A small glass capsule with a gold coin and the balance; opens Rewards, or Account to sign in. */
@Composable
private fun CoinsPill(text: String, spoken: String, onClick: () -> Unit) {
    val c = Kit.colors
    Row(
        Modifier.height(40.dp).glass(CircleShape)
            .pressable(onClick = onClick, role = Role.Button)
            .semantics(mergeDescendants = true) { contentDescription = spoken }
            .padding(start = 6.dp, end = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            Modifier.size(26.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFFFFD866), Color(0xFFE0A21B)))),
            contentAlignment = Alignment.Center,
        ) { Icon(KitIcons.PawPrint, null, tint = Color(0xFF6B4A00), size = 15.dp) }
        Text(text, style = KitType.subhead.semibold, color = c.label, maxLines = 1)
    }
}

@Composable
private fun TileButton(tile: HomeTile, modifier: Modifier) {
    val c = Kit.colors
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier.heightIn(min = 96.dp).clip(shape).background(c.cell)
            .pressable(onClick = tile.onClick, role = Role.Button)
            .semantics(mergeDescendants = true) { }
            .padding(vertical = 14.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        IconTile(tile.icon, tile.color, size = 44.dp)
        Text(tile.label, style = KitType.subhead.semibold, color = c.label, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp), maxLines = 1)
    }
}

@Composable
private fun ProductCard(product: HomeProduct, onClick: () -> Unit) {
    val c = Kit.colors
    val item = product.item
    val shape = RoundedCornerShape(22.dp)
    Column(Modifier.width(160.dp).pressable(onClick = onClick).clip(shape).background(c.cell)) {
        Box {
            Photo(MenuImages.forItem(item.name), item.name, placeholderFor = item.name, modifier = Modifier.fillMaxWidth().aspectRatio(1f).alpha(if (product.soldOut) 0.5f else 1f))
            if (product.soldOut) {
                Text(
                    "Sold out", style = KitType.caption1.semibold, color = Color.White,
                    modifier = Modifier.padding(8.dp).clip(CircleShape).background(Color(0xCC1C1C1E)).padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(item.name, style = KitType.subhead.semibold, color = c.label, maxLines = 2, minLines = 2)
            Text(product.flavors ?: " ", style = KitType.caption1, color = c.label2, maxLines = 2, minLines = 2, modifier = Modifier.padding(top = 2.dp))
            if (product.item.dealPercent > 0 && !product.soldOut) {
                Text("${product.item.dealPercent}% off", style = KitType.footnote.semibold, color = c.tint)
                Pricing.originalFromPrice(product.item)?.let { Text("Was ${Pricing.formatPeso(it)}", style = KitType.footnote, color = c.label2) }
            }
            product.fromPrice?.let { Text("From ${Pricing.formatPeso(it)}", style = KitType.footnote.semibold, color = c.tint, modifier = Modifier.padding(top = 4.dp)) }
        }
    }
}

@Composable
private fun Step(icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, text: String) {
    ListRow(text, leading = { IconTile(icon, color) })
}

