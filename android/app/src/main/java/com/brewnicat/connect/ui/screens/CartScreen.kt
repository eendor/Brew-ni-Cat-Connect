package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.theme.Brand

@Composable
fun CartScreen(vm: AppViewModel) {
    Column(Modifier.fillMaxSize()) {
        TopBar("Your cart", { vm.back() })
        val cart = vm.cart
        if (cart.isEmpty) {
            MessageState("🛒", "Your cart is empty", "Add something tasty from the menu.", action = "Browse the menu") { vm.selectTab(Screen.Menu) }
            return
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            vm.cartNotice?.let { n -> item { Notice(n) } }
            items(cart.lines, key = { it.key }) { line ->
                Row(
                    Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(Brand.colors.card).padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    val flavorPart = Pricing.splitAddOns(line.flavor).flavor
                    Photo(MenuImages.forItem(line.itemName, flavorPart), null, Modifier.size(64.dp).clip(MaterialTheme.shapes.medium))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(line.itemName, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                        val detail = listOfNotNull(line.variantName.takeIf { it.isNotBlank() && it.lowercase() != "regular" }, line.flavor).joinToString(" · ")
                        if (detail.isNotEmpty()) Text(detail, style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                        Text(Pricing.formatPeso(line.lineTotal), style = MaterialTheme.typography.titleSmall, color = Brand.colors.accent)
                        Stepper(line.quantity, { vm.setQuantity(line.key, it) }, line.itemName, min = 0, max = Pricing.MAX_QUANTITY)
                    }
                }
            }
            item {
                TextButton(onClick = { vm.selectTab(Screen.Menu) }) { Text("+ Add more items", color = Brand.colors.accent) }
            }
        }
        Column(Modifier.fillMaxWidth().background(Brand.colors.warm).padding(20.dp)) {
            Row {
                Text("Subtotal (${cart.itemCount} ${if (cart.itemCount == 1) "item" else "items"})", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                Text(Pricing.formatPeso(cart.subtotal), style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
            }
            Text("Pickup only. You pay at the counter.", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
            Spacer(Modifier.height(12.dp))
            PrimaryButton("Checkout", { vm.cartNotice = null; vm.open(Screen.Checkout) }, Modifier.fillMaxWidth())
        }
    }
}
