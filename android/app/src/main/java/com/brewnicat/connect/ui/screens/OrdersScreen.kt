package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.R
import com.brewnicat.connect.data.AdConfig
import com.brewnicat.connect.data.MiniGamesUiHelper
import com.brewnicat.connect.data.OrderView
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.IconCircle
import com.brewnicat.connect.ui.kit.IconTile
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitColors
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.bold
import com.brewnicat.connect.ui.kit.groupItems
import com.brewnicat.connect.ui.kit.redText
import com.brewnicat.connect.ui.kit.semibold
import java.text.DateFormat
import java.time.OffsetDateTime
import java.util.Date

/** The colour that goes with an order's status icon. */
fun KitColors.statusColor(status: String) = when (status) {
    "rejected", "cancelled" -> red
    "ready" -> green
    "completed" -> gray
    "preparing" -> brown
    else -> tintFill
}

@Composable
fun OrdersScreen(vm: AppViewModel) {
    val c = Kit.colors
    LaunchedEffect(Unit) { vm.refreshOrderList() }
    Page("Orders") {
        if (vm.savedOrders.isEmpty()) {
            item(key = "empty") {
                EmptyState(
                    KitIcons.ReceiptText, "No orders yet", "Orders you place in the app show up here so you can follow them.",
                    Modifier.fillParentMaxHeight(0.7f), "Browse the menu", { vm.selectTab(Screen.Menu) },
                )
            }
            return@Page
        }
        item(key = "gap") { Box(Modifier.padding(top = 8.dp)) }
        groupItems(vm.savedOrders, key = { it.reference }) { saved ->
            val view = (vm.orders[saved.reference] as? Loadable.Ready)?.value
            ListRow(
                saved.reference,
                subtitle = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(saved.placedAt)) +
                    (view?.let { " · ${it.itemCount} ${if (it.itemCount == 1) "item" else "items"} · ${Pricing.formatPeso(it.subtotal)}" } ?: ""),
                leading = { IconTile(statusIcon(view?.status ?: "pending"), c.statusColor(view?.status ?: "pending"), size = 36.dp) },
                trailing = view?.let { v -> { StatusPill(v.status) } },
                chevron = true,
                onClick = { vm.open(Screen.Order(saved.reference)) },
            )
        }
    }
}

@Composable
fun OrderScreen(vm: AppViewModel, reference: String) {
    DisposableEffect(reference) { vm.track(reference); onDispose { vm.stopTracking() } }
    Page("Order $reference", onBack = { vm.back() }, largeTitle = false) {
        when (val state = vm.orders[reference] ?: Loadable.Loading) {
            Loadable.Loading -> item(key = "loading") { LoadingState(Modifier.fillParentMaxHeight(0.6f)) }
            is Loadable.Failed -> item(key = "failed") {
                EmptyState(KitIcons.CircleAlert, "Order unavailable", state.message, Modifier.fillParentMaxHeight(0.7f), "Try again", { vm.track(reference) }, warning = true)
            }
            is Loadable.Ready -> orderDetail(vm, state.value)
        }
    }
    if (vm.gamesPopupOpen) {
        MiniGamesDialog(vm)
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.orderDetail(vm: AppViewModel, order: OrderView) {
    val waiting = MiniGamesUiHelper.isWaitingStatus(order.status)
    val adKey = vm.adKey
    if (vm.justPlaced == order.reference) {
        item(key = "placed") {
            Notice("Order placed! Keep this app open or come back any time to see when it's ready.", Modifier.padding(horizontal = Gutter).padding(top = 8.dp))
        }
    }
    item(key = "status") {
        val c = Kit.colors
        Section {
            Cell {
                Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    IconCircle(statusIcon(order.status), c.statusColor(order.status).let { if (it == c.tintFill) c.tint else it }, size = 72.dp)
                    Text(
                        OrderView.label(order.status), style = KitType.title1.bold, color = c.label,
                        modifier = Modifier.padding(top = 14.dp).semantics { heading() },
                    )
                    Text(
                        OrderView.description(order.status), style = KitType.subhead, color = c.label2, textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                    order.rejectionReason?.let {
                        Text("Reason: $it", style = KitType.subhead, color = c.redText, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
                    }
                    if (!order.isFinal) {
                        Text("Updates on its own every few seconds.", style = KitType.footnote, color = c.label3, modifier = Modifier.padding(top = 10.dp))
                    }
                }
            }
        }
    }
    if (waiting) {
        item(key = "games") {
            Section {
                ListRow(
                    "Play while you wait",
                    subtitle = "Earn points with Cat cups and Lucky paw, or try five arcade games.",
                    leading = { CatPixelSprite(R.drawable.cat_kulas, CatMode.LOOK, animating = false, size = DpSize(48.dp, 40.dp)) },
                    trailing = { KitButton("Play", { vm.openGamesPopup() }, size = ButtonSize.Small) },
                )
            }
        }
    }
    if (order.status !in setOf("rejected", "cancelled")) {
        item(key = "progress") { Progress(order) }
    }
    item(key = "items") {
        val c = Kit.colors
        Section(
            header = "Your order",
            footer = "Paying by ${order.paymentPreference} · ${order.customerName}" + (if (order.notes.isNotBlank()) "\nNotes: ${order.notes}" else ""),
        ) {
            order.items.forEach { l ->
                val detail = lineDetail(l.variantName, l.flavor)
                ListRow("${l.quantity}× ${l.itemName}", subtitle = detail.ifEmpty { null }, detail = Pricing.formatPeso(l.lineTotal))
            }
            Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Total to pay at pickup", style = KitType.headline, color = c.label, modifier = Modifier.weight(1f))
                Text(Pricing.formatPeso(order.subtotal), style = KitType.headline, color = c.label)
            }
        }
    }
    if (adKey != null && AdConfig.shouldShowOrderAd(order.status, adKey)) {
        item(key = "ad") {
            AdsterraAdCard(
                adKey = adKey,
                scriptHost = BuildConfig.AD_SCRIPT_HOST,
                consent = vm.adConsent,
                onConsentChange = { vm.setAdConsent(it) },
                modifier = Modifier.padding(horizontal = Gutter).padding(top = 24.dp),
            )
        }
    }
}

@Composable
private fun Progress(order: OrderView) {
    val c = Kit.colors
    val reached = OrderView.PROGRESS.indexOf(order.status).coerceAtLeast(0)
    val times = order.statusHistory.associate { it.status to it.changedAt }
    Section(header = "Progress") {
        OrderView.PROGRESS.forEachIndexed { i, step ->
            val done = i <= reached
            val time = times[step]?.let { t ->
                runCatching { OffsetDateTime.parse(t) }.getOrNull()?.let { DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(it.toInstant().toEpochMilli())) }
            }
            ListRow(
                OrderView.label(step),
                titleColor = if (done) c.label else c.label3,
                detail = time,
                leading = {
                    Box(
                        Modifier.size(26.dp).clip(CircleShape).background(if (done) c.tintFill else c.fill3),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (done) Icon(KitIcons.Check, null, tint = c.onTint, size = 15.dp)
                        else Text("${i + 1}", style = KitType.footnote.semibold, color = c.label3)
                    }
                },
            )
        }
    }
}
