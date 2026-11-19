package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.kit.ButtonRow
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Photo
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Stepper
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.groupItems
import com.brewnicat.connect.ui.kit.semibold

@Composable
fun CartScreen(vm: AppViewModel) {
    val c = Kit.colors
    val cart = vm.cart
    Page(
        "Your cart", onBack = { vm.back() },
        bottomBar = if (cart.isEmpty) null else {
            {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Subtotal (${cart.itemCount} ${if (cart.itemCount == 1) "item" else "items"})", style = KitType.subhead, color = c.label2)
                        Text("Pickup only. You pay at the counter.", style = KitType.footnote, color = c.label2)
                    }
                    Text(Pricing.formatPeso(cart.subtotal), style = KitType.title2.semibold, color = c.label)
                }
                KitButton("Checkout", { vm.cartNotice = null; vm.open(Screen.Checkout) }, Modifier.fillMaxWidth().padding(top = 12.dp))
            }
        },
    ) {
        if (cart.isEmpty) {
            item {
                EmptyState(KitIcons.ShoppingBag, "Your cart is empty", "Add something tasty from the menu.", Modifier.fillParentMaxHeight(0.7f), "Browse the menu", { vm.showMenu() })
            }
            return@Page
        }
        vm.cartNotice?.let { n -> item(key = "notice") { Notice(n, Modifier.padding(horizontal = Gutter).padding(top = 8.dp), warning = true) } }
        item(key = "gap") { Column(Modifier.padding(top = 12.dp)) {} }
        groupItems(cart.lines, key = { it.key }) { line ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Photo(MenuImages.forItem(line.itemName, Pricing.splitAddOns(line.flavor).flavor), null, placeholderFor = line.itemName, modifier = Modifier.size(60.dp).clip(RoundedCornerShape(14.dp)))
                Column(Modifier.weight(1f).padding(start = 12.dp, end = 8.dp)) {
                    Text(line.itemName, style = KitType.body.semibold, color = c.label, maxLines = 2)
                    val detail = lineDetail(line.variantName, line.flavor)
                    if (detail.isNotEmpty()) Text(detail, style = KitType.footnote, color = c.label2, maxLines = 2)
                    Text(Pricing.formatPeso(line.lineTotal), style = KitType.subhead.semibold, color = c.label, modifier = Modifier.padding(top = 2.dp))
                }
                Stepper(line.quantity, { vm.setQuantity(line.key, it) }, line.itemName, min = 0, max = Pricing.MAX_QUANTITY)
            }
        }
        item(key = "more") {
            Section { ButtonRow("Add more items", { vm.showMenu() }) }
        }
    }
}
