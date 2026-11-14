package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.PriceResult
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.theme.Brand

/** Size, flavor, add-ons and quantity for one item, like the website's order dialog. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ItemSheet(
    item: MenuItem,
    isFavorite: Boolean = false,
    onToggleFavorite: (() -> Unit)? = null,
    onAdd: (variantId: String, flavor: String?, quantity: Int) -> String?,
    onDismiss: () -> Unit,
) {
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var variantId by remember(item.id) { mutableStateOf(item.variants.firstOrNull()?.id) }
    var picked by remember(item.id) { mutableStateOf(listOf<String>()) }
    var mix by remember(item.id) { mutableStateOf(false) }
    var addOns by remember(item.id) { mutableStateOf(setOf<String>()) }
    var quantity by remember(item.id) { mutableIntStateOf(1) }
    var error by remember(item.id) { mutableStateOf<String?>(null) }

    val variant = item.variants.firstOrNull { it.id == variantId }
    val flavor = Pricing.joinFlavorMix(picked)
    val addOnLabels = item.addOns.filter { it.id in addOns }.map { it.label }
    val lineFlavor = Pricing.encodeLineFlavor(flavor, addOnLabels)
    val unit = variant?.let { Pricing.resolveUnitPrice(item, it, lineFlavor) as? PriceResult.Ok }?.unitPrice

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet, containerColor = Brand.colors.canvas) {
        Column(Modifier.navigationBarsPadding()) {
        Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp)) {
            MenuImages.forItem(item.name, picked.singleOrNull())?.let { photo ->
                Photo(photo, item.name, Modifier.fillMaxWidth().aspectRatio(1.6f).clip(MaterialTheme.shapes.large))
                Spacer(Modifier.height(14.dp))
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(item.name, style = MaterialTheme.typography.headlineMedium, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                onToggleFavorite?.let { toggle ->
                    FavoriteHeartButton(isFavorite = isFavorite, itemName = item.name, onClick = toggle)
                }
            }
            variant?.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = Brand.colors.muted) }

            if (item.variants.size > 1) {
                Label("Choose size / option")
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    item.variants.forEach { v ->
                        val price = v.basePrice?.takeIf { Pricing.toCentavos(it) > 0 }
                        Choice(v.name + (price?.let { " · ${Pricing.formatPeso(it)}" } ?: ""), v.id == variantId) { variantId = v.id; error = null }
                    }
                }
            }

            if (item.flavors.isNotEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Label("Choose flavor", Modifier.weight(1f))
                    if (item.flavors.size > 1 && Pricing.allowsFlavorMix(item)) {
                        TextButton(onClick = { if (mix && picked.size > 1) picked = picked.take(1); mix = !mix }) {
                            Text(if (mix) "Pick one flavor" else "Mix up to ${Pricing.MAX_MIXED_FLAVORS} flavors", color = Brand.colors.accent)
                        }
                    }
                }
                if (mix) Text("Mixed flavors cost the same as the priciest one you pick.", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    item.flavors.forEach { f ->
                        val override = variant?.flavorPrices?.firstOrNull { it.flavor == f }?.price
                        Choice(f + (override?.let { " · ${Pricing.formatPeso(it)}" } ?: ""), f in picked) {
                            error = null
                            picked = when {
                                !mix -> listOf(f)
                                f in picked -> picked - f
                                else -> (picked + f).takeLast(Pricing.MAX_MIXED_FLAVORS)
                            }
                        }
                    }
                }
            }

            if (item.addOns.isNotEmpty()) {
                Label("Add-ons")
                item.addOns.forEach { a ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = a.id in addOns,
                            onCheckedChange = { on -> addOns = if (on) addOns + a.id else addOns - a.id },
                            colors = CheckboxDefaults.colors(checkedColor = Brand.colors.accentFill),
                        )
                        Text(a.label, style = MaterialTheme.typography.bodyLarge, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                        Text("+${Pricing.formatPeso(a.price)}", style = MaterialTheme.typography.bodyMedium, color = Brand.colors.muted)
                    }
                }
            }

            Label("Quantity")
            Stepper(quantity, { quantity = it.coerceIn(1, Pricing.MAX_QUANTITY) }, item.name, min = 1, max = Pricing.MAX_QUANTITY)

            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(Brand.colors.warm).padding(horizontal = 20.dp, vertical = 14.dp)) {
            error?.let { Notice(it); Spacer(Modifier.height(10.dp)) }
            PrimaryButton(
                text = "Add to cart" + (unit?.let { " · ${Pricing.formatPeso(Pricing.lineTotal(it, quantity))}" } ?: ""),
                onClick = {
                    error = when {
                        variant == null -> "Please choose a size."
                        item.flavors.isNotEmpty() && picked.isEmpty() -> "Please choose a flavor."
                        else -> onAdd(variant.id, lineFlavor, quantity)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        }
    }
}

@Composable
private fun Label(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink, modifier = modifier.padding(top = 20.dp, bottom = 10.dp))
}

@Composable
private fun Choice(text: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected, onClick = onClick, label = { Text(text, modifier = Modifier.padding(vertical = 8.dp)) },
        shape = MaterialTheme.shapes.extraLarge,
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = Brand.colors.accentFill, selectedLabelColor = Brand.colors.onAccentFill,
            containerColor = Brand.colors.card, labelColor = Brand.colors.ink,
        ),
    )
}
