package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
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
import com.brewnicat.connect.ui.theme.Brand

@Composable
fun CheckoutScreen(vm: AppViewModel) {
    val d = vm.details
    val errors = vm.fieldErrors
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar("Checkout", { vm.back() })
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            (vm.hours?.status() as? ShopHours.Status.Closed)?.let { Notice(it.message) }
            Card(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Order summary", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                    vm.cart.lines.forEach { l ->
                        val detail = listOfNotNull(l.variantName.takeIf { it.isNotBlank() && it.lowercase() != "regular" }, l.flavor).joinToString(" · ")
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("${l.quantity}× ${l.itemName}" + (detail.takeIf { it.isNotEmpty() }?.let { " ($it)" } ?: ""), style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                            Text(Pricing.formatPeso(l.lineTotal), style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink)
                        }
                    }
                    Row {
                        Text("Subtotal", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                        Text(Pricing.formatPeso(vm.confirmedSubtotal ?: vm.cart.subtotal), style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                    }
                    Text("Pickup at Brew ni Cat, Abellera St, Kabacan.", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                }
            }
            Text("Your details", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
            Field("Full name", d.name, errors["name"], KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next)) {
                vm.updateDetails(d.copy(name = it.take(Checkout.MAX_NAME_LENGTH)))
            }
            Field("Mobile number", d.phone, errors["phone"], KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next), "e.g. 0912 345 6789") {
                vm.updateDetails(d.copy(phone = it.take(20)))
            }
            Field("Notes for the shop (optional)", d.notes, errors["notes"], KeyboardOptions(capitalization = KeyboardCapitalization.Sentences), "Less ice, extra sauce…", singleLine = false) {
                vm.updateDetails(d.copy(notes = it.take(Checkout.MAX_NOTES_LENGTH)))
            }
            Text("How will you pay at pickup?", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                Checkout.PAYMENT_PREFERENCES.forEachIndexed { i, p ->
                    SegmentedButton(
                        selected = d.paymentPreference == p,
                        onClick = { vm.updateDetails(d.copy(paymentPreference = p)) },
                        shape = SegmentedButtonDefaults.itemShape(i, Checkout.PAYMENT_PREFERENCES.size),
                        colors = SegmentedButtonDefaults.colors(activeContainerColor = Brand.colors.accentSurface, activeContentColor = Brand.colors.accent),
                    ) { Text(p) }
                }
            }
            Text(
                "You'll pay when you pick up your order. We use your name and number only for this order (see the privacy notice on our website).",
                style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted,
            )
            Spacer(Modifier.height(8.dp))
        }
        Column(Modifier.fillMaxWidth().background(Brand.colors.warm).padding(20.dp)) {
            vm.placeNotice?.let { Notice(it); Spacer(Modifier.height(12.dp)) }
            PrimaryButton(
                if (vm.placing) "Placing order…" else "Place order · ${Pricing.formatPeso(vm.confirmedSubtotal ?: vm.cart.subtotal)}",
                vm::placeOrder, Modifier.fillMaxWidth(), enabled = !vm.cart.isEmpty, busy = vm.placing,
            )
        }
    }
}

@Composable
private fun Field(
    label: String, value: String, error: String?, keyboard: KeyboardOptions, placeholder: String? = null,
    singleLine: Boolean = true, onChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value, onValueChange = onChange, label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        isError = error != null, supportingText = error?.let { { Text(it) } },
        keyboardOptions = keyboard, singleLine = singleLine, minLines = if (singleLine) 1 else 3,
        modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Brand.colors.accent, focusedLabelColor = Brand.colors.accent,
            unfocusedContainerColor = Brand.colors.card, focusedContainerColor = Brand.colors.card,
        ),
    )
}
