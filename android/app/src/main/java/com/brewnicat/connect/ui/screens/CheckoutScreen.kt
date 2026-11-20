package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Checkout
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.data.ShopHours
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.kit.CheckRow
import com.brewnicat.connect.ui.kit.FieldRow
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Text

@Composable
fun CheckoutScreen(vm: AppViewModel) {
    val c = Kit.colors
    val d = vm.details
    val errors = vm.fieldErrors
    val subtotal = vm.confirmedSubtotal ?: vm.cart.subtotal
    val maxCoins = vm.maxCheckoutCoins
    val discount = if (vm.applyCheckoutCoins) maxCoins else 0.0
    Page(
        "Checkout", onBack = { vm.back() },
        bottomBar = {
            vm.placeNotice?.let { Notice(it, Modifier.padding(bottom = 10.dp), warning = true) }
            KitButton(
                if (vm.placing) "Placing order…" else "Place order · ${Pricing.formatPeso(subtotal - discount)}",
                vm::placeOrder, Modifier.fillMaxWidth(), enabled = !vm.cart.isEmpty, busy = vm.placing,
            )
        },
    ) {
        (vm.hours?.status() as? ShopHours.Status.Closed)?.let { closed ->
            item(key = "closed") { Notice(closed.message, Modifier.padding(horizontal = Gutter).padding(top = 8.dp), warning = true) }
        }
        item(key = "summary") {
            Section(header = "Order summary", footer = "Pickup at Brew ni Cat, Abellera St, Kabacan.") {
                vm.cart.lines.forEach { l ->
                    val detail = lineDetail(l.variantName, l.flavor)
                    ListRow("${l.quantity}× ${l.itemName}", subtitle = detail.ifEmpty { null }, detail = Pricing.formatPeso(l.lineTotal))
                }
                ListRow("Subtotal", trailing = { Text(Pricing.formatPeso(subtotal), style = KitType.headline, color = c.label) }, titleColor = c.label)
                if (maxCoins > 0) {
                    KitButton(
                        if (vm.applyCheckoutCoins) "Remove coin discount" else "Use ${maxCoins} coins",
                        vm::toggleCheckoutCoins,
                        Modifier.fillMaxWidth(),
                        enabled = !vm.placing,
                    )
                }
                if (discount > 0) {
                    ListRow("Coin discount", detail = "−${Pricing.formatPeso(discount)}")
                    ListRow("Total", detail = Pricing.formatPeso(subtotal - discount))
                }
            }
        }
        item(key = "details") {
            Section(header = "Your details") {
                FieldRow(
                    "Full name", d.name, { vm.updateDetails(d.copy(name = it.take(Checkout.MAX_NAME_LENGTH))) },
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
                    error = errors["name"],
                )
                FieldRow(
                    "Mobile number", d.phone, { vm.updateDetails(d.copy(phone = it.take(20))) }, placeholder = "e.g. 0912 345 6789",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                    error = errors["phone"],
                )
                FieldRow(
                    "Notes for the shop (optional)", d.notes, { vm.updateDetails(d.copy(notes = it.take(Checkout.MAX_NOTES_LENGTH))) },
                    placeholder = "Less ice, extra sauce…", singleLine = false, minLines = 3,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                    error = errors["notes"],
                )
            }
        }
        item(key = "payment") {
            Section(
                header = "How will you pay at pickup?",
                footer = "You'll pay when you pick up your order. We use your name and number only for this order (see the privacy notice on our website).",
            ) {
                Checkout.PAYMENT_PREFERENCES.forEach { p ->
                    CheckRow(p, d.paymentPreference == p, { vm.updateDetails(d.copy(paymentPreference = p)) })
                }
            }
        }
    }
}

