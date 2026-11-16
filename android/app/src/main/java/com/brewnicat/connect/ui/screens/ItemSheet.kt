package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.PriceResult
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.kit.CheckRow
import com.brewnicat.connect.ui.kit.FavoriteHeartButton
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Photo
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Sheet
import com.brewnicat.connect.ui.kit.Stepper
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.ToggleRow
import com.brewnicat.connect.ui.kit.bold

/** Size, flavor, add-ons and quantity for one item, like the website's order dialog. */
@Composable
fun ItemSheet(
    item: MenuItem,
    open: Boolean = true,
    isFavorite: Boolean = false,
    onToggleFavorite: (() -> Unit)? = null,
    onAdd: (variantId: String, flavor: String?, quantity: Int) -> String?,
    onDismiss: () -> Unit,
) {
    val c = Kit.colors
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

    Sheet(
        onDismiss = onDismiss,
        open = open,
        trailing = onToggleFavorite?.let { toggle -> { FavoriteHeartButton(isFavorite, item.name, toggle) } },
        footer = {
            error?.let { Notice(it, Modifier.padding(bottom = 10.dp), warning = true) }
            KitButton(
                "Add to cart" + (unit?.let { " · ${Pricing.formatPeso(Pricing.lineTotal(it, quantity))}" } ?: ""),
                {
                    error = when {
                        variant == null -> "Please choose a size."
                        item.flavors.isNotEmpty() && picked.isEmpty() -> "Please choose a flavor."
                        else -> onAdd(variant.id, lineFlavor, quantity)
                    }
                },
                Modifier.fillMaxWidth(),
            )
        },
    ) {
        Photo(
            MenuImages.forItem(item.name, picked.singleOrNull()), item.name,
            Modifier.padding(horizontal = 16.dp).fillMaxWidth().aspectRatio(1.5f).clip(RoundedCornerShape(26.dp)),
        )
        Text(item.name, style = KitType.title1.bold, color = c.label, modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).semantics { heading() })
        variant?.description?.takeIf { it.isNotBlank() }?.let {
            Text(it, style = KitType.subhead, color = c.label2, modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp))
        }

        if (item.variants.size > 1) {
            Section(header = "Choose size / option") {
                item.variants.forEach { v ->
                    val price = v.basePrice?.takeIf { Pricing.toCentavos(it) > 0 }
                    CheckRow(v.name, v.id == variantId, { variantId = v.id; error = null }, detail = price?.let { Pricing.formatPeso(it) })
                }
            }
        }

        if (item.flavors.isNotEmpty()) {
            val canMix = item.flavors.size > 1 && Pricing.allowsFlavorMix(item)
            Section(
                header = "Choose flavor",
                footer = if (mix) "Mixed flavors cost the same as the priciest one you pick." else null,
            ) {
                if (canMix) {
                    ToggleRow("Mix up to ${Pricing.MAX_MIXED_FLAVORS} flavors", mix, { on ->
                        if (!on && picked.size > 1) picked = picked.take(1)
                        mix = on
                    })
                }
                item.flavors.forEach { f ->
                    val override = variant?.flavorPrices?.firstOrNull { it.flavor == f }?.price
                    CheckRow(
                        f, f in picked,
                        {
                            error = null
                            picked = when {
                                !mix -> listOf(f)
                                f in picked -> picked - f
                                else -> (picked + f).takeLast(Pricing.MAX_MIXED_FLAVORS)
                            }
                        },
                        detail = override?.let { Pricing.formatPeso(it) },
                        role = if (mix) Role.Checkbox else Role.RadioButton,
                    )
                }
            }
        }

        if (item.addOns.isNotEmpty()) {
            Section(header = "Add-ons") {
                item.addOns.forEach { a ->
                    CheckRow(a.label, a.id in addOns, { addOns = if (a.id in addOns) addOns - a.id else addOns + a.id }, detail = "+${Pricing.formatPeso(a.price)}", role = Role.Checkbox)
                }
            }
        }

        Section {
            ListRow("Quantity", trailing = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Stepper(quantity, { quantity = it.coerceIn(1, Pricing.MAX_QUANTITY) }, item.name, min = 1, max = Pricing.MAX_QUANTITY)
                }
            })
        }
    }
}
