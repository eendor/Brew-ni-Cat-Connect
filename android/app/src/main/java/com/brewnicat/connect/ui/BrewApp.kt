package com.brewnicat.connect.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R
import com.brewnicat.connect.ui.kit.Alert
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.BarAction
import com.brewnicat.connect.ui.kit.Block
import com.brewnicat.connect.ui.kit.ButtonRow
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.CapsuleTabs
import com.brewnicat.connect.ui.kit.CheckRow
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.FieldRow
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.IconTile
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.LocalBackdrop
import com.brewnicat.connect.ui.kit.LocalBottomInset
import com.brewnicat.connect.ui.kit.LocalOverlayHost
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.OverlayHost
import com.brewnicat.connect.ui.kit.OverlayLayer
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Photo
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Segmented
import com.brewnicat.connect.ui.kit.Sheet
import com.brewnicat.connect.ui.kit.Spinner
import com.brewnicat.connect.ui.kit.StarRow
import com.brewnicat.connect.ui.kit.Stepper
import com.brewnicat.connect.ui.kit.TabBar
import com.brewnicat.connect.ui.kit.TabBarGap
import com.brewnicat.connect.ui.kit.TabBarHeight
import com.brewnicat.connect.ui.kit.TabItem
import com.brewnicat.connect.ui.kit.Toggle
import com.brewnicat.connect.ui.kit.groupItems
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

private val Tabs = listOf(
    TabItem("Home", KitIcons.House), TabItem("Menu", KitIcons.Coffee), TabItem("Orders", KitIcons.ReceiptText),
    TabItem("Account", KitIcons.UserRound), TabItem("Visit", KitIcons.Store),
)

/** Temporary: a gallery of the kit, to check it on a device before the screens move onto it. */
@Composable
fun BrewApp(@Suppress("UNUSED_PARAMETER") vm: AppViewModel) {
    val c = Kit.colors
    val overlays = remember { OverlayHost() }
    val backdrop = rememberHazeState()
    var tab by remember { mutableIntStateOf(0) }
    val navBar = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    CompositionLocalProvider(LocalOverlayHost provides overlays) {
        Box(Modifier.fillMaxSize().background(c.grouped)) {
            Box(Modifier.fillMaxSize().hazeSource(backdrop).then(if (overlays.modal) Modifier.clearAndSetSemantics {} else Modifier)) {
                CompositionLocalProvider(LocalBottomInset provides navBar + TabBarGap + TabBarHeight) {
                    when (tab) {
                        0 -> GalleryControls()
                        1 -> GalleryList()
                        else -> Page("Empty") {
                            item { EmptyState(KitIcons.ReceiptText, "No orders yet", "Orders you place in the app show up here so you can follow them.", Modifier.fillParentMaxHeight(0.75f), "Browse the menu", {}) }
                        }
                    }
                }
            }
            CompositionLocalProvider(LocalBackdrop provides backdrop) {
                Box(Modifier.align(Alignment.BottomCenter).padding(start = 24.dp, end = 24.dp, bottom = navBar + TabBarGap)) {
                    TabBar(Tabs, tab, { tab = it })
                }
                OverlayLayer(overlays)
            }
        }
    }
}

@Composable
private fun GalleryControls() {
    val overlays = LocalOverlayHost.current
    var on by remember { mutableStateOf(true) }
    var seg by remember { mutableIntStateOf(0) }
    var qty by remember { mutableIntStateOf(1) }
    var name by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var pick by remember { mutableIntStateOf(0) }
    var sheet by remember { mutableStateOf(false) }
    var alert by remember { mutableStateOf(false) }
    var cat by remember { mutableIntStateOf(0) }
    Page(
        "Rewards & points", onBack = {}, trailing = { BarAction("History", {}) },
        pinned = { CapsuleTabs(listOf("Coffee", "Matcha", "Frappe", "Snacks", "Noodles", "Add-ons"), cat, { cat = it }, Modifier.padding(horizontal = Gutter, vertical = 6.dp)) },
        bottomBar = { KitButton("Place order · ₱245.00", {}, Modifier.fillMaxWidth()) },
    ) {
        item {
            Section(header = "Preview", prominentHeader = true, headerAction = { KitButton("Action", {}, style = ButtonStyle.Plain, size = ButtonSize.Small) }) {
                ListRow("Title", detail = "Detail", chevron = true, onClick = {})
                ListRow("Title", subtitle = "Subtitle", leading = { IconTile(KitIcons.Gift, Kit.colors.orange) }, chevron = true, onClick = {})
                ListRow("Label", trailing = { Toggle(on, { on = it }) })
                ListRow("Quantity", trailing = { Stepper(qty, { qty = it }, "drink") })
                ButtonRow("Open sheet", { sheet = true })
                ButtonRow("Open alert", { alert = true })
                ButtonRow("Show toast", { overlays.toast("Added 2× Caramel Matcha Tail to your cart", actionLabel = "Sign in", onAction = {}) })
            }
        }
        item {
            Section(header = "Your details", footer = "Enter a valid mobile number.", footerColor = Kit.colors.red) {
                FieldRow("Full name", name, { name = it }, placeholder = "Juan dela Cruz")
                FieldRow("Notes for the shop (optional)", notes, { notes = it }, placeholder = "Less ice, extra sauce…", singleLine = false, minLines = 3)
            }
        }
        item {
            Section(header = "How will you pay at pickup?") {
                listOf("Cash", "GCash", "Maya").forEachIndexed { i, label -> CheckRow(label, pick == i, { pick = i }) }
            }
        }
        item {
            Block {
                Segmented(listOf("Correction", "Deletion"), seg, { seg = it })
                Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Badge("Preparing"); Badge("Ready", color = Kit.colors.green, solid = true); Badge("Rejected", color = Kit.colors.red); Spinner(); StarRow(4)
                }
                Notice("Order placed! Keep this app open or come back any time to see when it's ready.", Modifier.padding(top = 14.dp))
                Notice("The shop is closed right now. Opens tomorrow at 9:00 AM.", Modifier.padding(top = 10.dp), warning = true)
                Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KitButton("Tinted", {}, style = ButtonStyle.Tinted, size = ButtonSize.Medium, icon = KitIcons.Play)
                    KitButton("Gray", {}, style = ButtonStyle.Gray, size = ButtonSize.Medium)
                    KitButton("Busy", {}, size = ButtonSize.Medium, busy = true)
                }
            }
        }
        item { Section { ButtonRow("Sign out", {}, destructive = true, centered = true) } }
    }
    if (sheet) {
        Sheet(onDismiss = { sheet = false }, title = "Caramel Matcha Tail", footer = { dismiss -> KitButton("Add to cart · ₱120.00", dismiss, Modifier.fillMaxWidth()) }) {
            Photo(R.drawable.menu_caramel_matcha_tail, null, Modifier.padding(horizontal = 16.dp).fillMaxWidth().size(220.dp).clip(RoundedCornerShape(26.dp)))
            Section(header = "Choose size") {
                listOf("16 oz", "22 oz").forEachIndexed { i, label -> CheckRow(label, pick == i, { pick = i }, detail = "₱${95 + i * 25}") }
            }
            Section(header = "Quantity") { ListRow("How many?", trailing = { Stepper(qty, { qty = it }, "drink", min = 1) }) }
            Section(header = "Add-ons") {
                (1..6).forEach { ListRow("Add-on $it", detail = "+₱15.00", trailing = { Toggle(on, { on = it }) }) }
            }
        }
    }
    if (alert) {
        Alert("Redeem Free Iced Latte?", "This spends 120 loyalty points and gives you a verification code to show at the café counter.", "Confirm", { alert = false }, "Cancel", { alert = false })
    }
}

@Composable
private fun GalleryList() {
    var cat by remember { mutableIntStateOf(0) }
    Page("Menu", pinned = { CapsuleTabs(listOf("Coffee", "Matcha", "Frappe", "Snacks", "Noodles", "Add-ons"), cat, { cat = it }, Modifier.padding(horizontal = Gutter, vertical = 6.dp)) }) {
        item { Block { com.brewnicat.connect.ui.kit.SectionHeader("Matcha") } }
        groupItems((1..30).toList(), key = { it }) { n ->
            ListRow("Lucky Green Neko Matcha $n", subtitle = "16 oz · 22 oz", detail = "From ₱95.00", leading = { Photo(R.drawable.menu_lucky_green_neko_matcha, null, Modifier.size(56.dp).clip(RoundedCornerShape(14.dp))) }, onClick = {})
        }
    }
}
