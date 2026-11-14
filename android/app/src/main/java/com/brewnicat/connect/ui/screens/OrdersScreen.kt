package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.OrderView
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.theme.Brand
import java.text.DateFormat
import java.time.OffsetDateTime
import java.util.Date

@Composable
fun OrdersScreen(vm: AppViewModel) {
    LaunchedEffect(Unit) { vm.refreshOrderList() }
    Column(Modifier.fillMaxSize()) {
        BrandHeader()
        Text("Your orders", style = MaterialTheme.typography.headlineMedium, color = Brand.colors.ink, modifier = Modifier.padding(horizontal = 20.dp))
        if (vm.savedOrders.isEmpty()) {
            MessageState("🧾", "No orders yet", "Orders you place in the app show up here so you can follow them.", action = "Browse the menu") { vm.selectTab(Screen.Menu) }
            return
        }
        LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(vm.savedOrders, key = { it.reference }) { saved ->
                val view = (vm.orders[saved.reference] as? Loadable.Ready)?.value
                Row(
                    Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(Brand.colors.card)
                        .clickable { vm.open(Screen.Order(saved.reference)) }.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(saved.reference, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                        Text(
                            DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(saved.placedAt)) +
                                (view?.let { " · ${it.itemCount} ${if (it.itemCount == 1) "item" else "items"} · ${Pricing.formatPeso(it.subtotal)}" } ?: ""),
                            style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted,
                        )
                    }
                    view?.let { StatusPill(it.status) }
                }
            }
        }
    }
}

@Composable
fun StatusPill(status: String) {
    val (fg, bg) = when (status) {
        "rejected", "cancelled" -> Brand.colors.strong to Brand.colors.warm
        "ready" -> Brand.colors.canvas to Brand.colors.strong
        "completed" -> Brand.colors.muted to Brand.colors.warm
        else -> Brand.colors.accent to Brand.colors.accentSurface
    }
    Pill(OrderView.label(status), fg, bg)
}

@Composable
fun OrderScreen(vm: AppViewModel, reference: String) {
    DisposableEffect(reference) { vm.track(reference); onDispose { vm.stopTracking() } }
    Column(Modifier.fillMaxSize()) {
        TopBar("Order $reference", { vm.back() })
        when (val state = vm.orders[reference] ?: Loadable.Loading) {
            Loadable.Loading -> LoadingState()
            is Loadable.Failed -> MessageState("😿", "Order unavailable", state.message, action = "Try again") { vm.track(reference) }
            is Loadable.Ready -> OrderDetail(vm, state.value)
        }
    }
}

@Composable
private fun OrderDetail(vm: AppViewModel, order: OrderView) {
    Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        if (vm.justPlaced == order.reference) {
            Notice("Order placed! Keep this app open or come back any time to see when it's ready.", warning = false)
        }
        Card(Modifier.fillMaxWidth()) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text(
                    when (order.status) { "ready" -> "🛎️"; "completed" -> "😺"; "rejected", "cancelled" -> "😿"; "preparing" -> "🧋"; else -> "🐾" },
                    style = MaterialTheme.typography.displaySmall,
                )
                Spacer(Modifier.height(6.dp))
                Text(OrderView.label(order.status), style = MaterialTheme.typography.headlineMedium, color = Brand.colors.ink)
                Text(OrderView.description(order.status), style = MaterialTheme.typography.bodyMedium, color = Brand.colors.muted, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                order.rejectionReason?.let { Spacer(Modifier.height(8.dp)); Notice("Reason: $it") }
                if (!order.isFinal) {
                    Spacer(Modifier.height(8.dp))
                    Text("Updates on its own every few seconds.", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                }
            }
        }
        if (order.status !in setOf("rejected", "cancelled")) Progress(order)
        Card(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Your order", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                order.items.forEach { l ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text("${l.quantity}× ${l.itemName}", style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink)
                            val detail = listOfNotNull(l.variantName.takeIf { it.isNotBlank() && it.lowercase() != "regular" }, l.flavor).joinToString(" · ")
                            if (detail.isNotEmpty()) Text(detail, style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                        }
                        Text(Pricing.formatPeso(l.lineTotal), style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink)
                    }
                }
                Row {
                    Text("Total to pay at pickup", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                    Text(Pricing.formatPeso(order.subtotal), style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                }
                Text("Paying by ${order.paymentPreference} · ${order.customerName}", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                if (order.notes.isNotBlank()) Text("Notes: ${order.notes}", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
            }
        }
    }
}

@Composable
private fun Progress(order: OrderView) {
    val reached = OrderView.PROGRESS.indexOf(order.status).coerceAtLeast(0)
    val times = order.statusHistory.associate { it.status to it.changedAt }
    Card(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OrderView.PROGRESS.forEachIndexed { i, step ->
                val done = i <= reached
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(24.dp).clip(CircleShape).background(if (done) Brand.colors.accentFill else Brand.colors.warm),
                        contentAlignment = Alignment.Center,
                    ) { if (done) Text("✓", color = Brand.colors.onAccentFill, style = MaterialTheme.typography.labelMedium) }
                    Spacer(Modifier.width(12.dp))
                    Text(OrderView.label(step), style = MaterialTheme.typography.titleSmall, color = if (done) Brand.colors.ink else Brand.colors.muted, modifier = Modifier.weight(1f))
                    times[step]?.let { t ->
                        runCatching { OffsetDateTime.parse(t) }.getOrNull()?.let {
                            Text(DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(it.toInstant().toEpochMilli())), style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                        }
                    }
                }
            }
        }
    }
}
