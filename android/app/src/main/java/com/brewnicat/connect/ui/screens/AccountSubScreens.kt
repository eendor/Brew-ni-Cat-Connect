package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Availability
import com.brewnicat.connect.data.DataRequestValidation
import com.brewnicat.connect.data.LoyaltyFormat
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.CheckRow
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.FieldRow
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Segmented
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.groupItems
import com.brewnicat.connect.ui.kit.semibold

@Composable
fun OrderHistoryScreen(vm: AppViewModel) {
    val c = Kit.colors
    var reorderWarning by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { vm.loadOrderHistory(1) }

    Page("Order history", onBack = { vm.back() }) {
        reorderWarning?.let { w -> item(key = "warning") { Notice(w, Modifier.padding(horizontal = Gutter).padding(top = 8.dp), warning = true) } }
        when (val state = vm.orderHistory ?: Loadable.Loading) {
            Loadable.Loading -> item(key = "loading") { LoadingState(Modifier.fillParentMaxHeight(0.6f)) }
            is Loadable.Failed -> item(key = "failed") {
                EmptyState(
                    KitIcons.CircleAlert, "Couldn't load orders", state.message, Modifier.fillParentMaxHeight(0.7f),
                    "Try again", { vm.loadOrderHistory(vm.orderHistoryPage) }, warning = true,
                )
            }
            is Loadable.Ready -> {
                val page = state.value
                if (page.orders.isEmpty()) {
                    item(key = "empty") {
                        EmptyState(
                            KitIcons.ReceiptText, "No past orders yet", "Orders you place while signed in will appear here.",
                            Modifier.fillParentMaxHeight(0.7f), "Browse the menu", { vm.showMenu() },
                        )
                    }
                } else {
                    page.orders.forEachIndexed { index, entry ->
                        item(key = "order-$index-${entry.id}") {
                            Section {
                                Cell {
                                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                        Column(Modifier.weight(1f)) {
                                            Text(entry.reference, style = KitType.headline, color = c.label)
                                            Text(LoyaltyFormat.formatDateTime(entry.createdAt), style = KitType.footnote, color = c.label2)
                                        }
                                        StatusPill(entry.status)
                                    }
                                    entry.rejectionReason?.let { reason -> Notice("Reason: $reason", Modifier.padding(top = 10.dp), warning = true) }
                                }
                                entry.items.forEach { item ->
                                    val detail = lineDetail(item.variantName, item.flavor)
                                    ListRow("${item.quantity}× ${item.itemName}", subtitle = detail.ifEmpty { null }, detail = Pricing.formatPeso(item.lineTotal))
                                }
                                Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text("${entry.itemCount} items · ${entry.paymentPreference}", style = KitType.subhead, color = c.label2, modifier = Modifier.weight(1f))
                                    Text(Pricing.formatPeso(entry.subtotal), style = KitType.headline, color = c.label)
                                }
                                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    KitButton("View status", { vm.openOrderFromHistory(entry.reference) }, Modifier.weight(1f), style = ButtonStyle.Tinted, size = ButtonSize.Medium)
                                    KitButton("Reorder", { reorderWarning = vm.reorderFromHistory(entry) }, Modifier.weight(1f), size = ButtonSize.Medium)
                                }
                            }
                        }
                    }
                    if (page.totalPages > 1) {
                        item(key = "pagination") {
                            Row(
                                Modifier.fillMaxWidth().padding(horizontal = Gutter).padding(top = 16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                KitButton("Previous", { vm.loadOrderHistory(page.page - 1) }, style = ButtonStyle.Plain, size = ButtonSize.Small, enabled = page.page > 1)
                                Text("Page ${page.page} of ${page.totalPages}", style = KitType.footnote, color = c.label2)
                                KitButton("Next", { vm.loadOrderHistory(page.page + 1) }, style = ButtonStyle.Plain, size = ButtonSize.Small, enabled = page.page < page.totalPages)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FavoritesScreen(vm: AppViewModel, onItem: (MenuItem) -> Unit) {
    LaunchedEffect(Unit) { vm.loadFavoritesScreen() }

    Page("Favorites", onBack = { vm.back() }) {
        vm.favoritesError?.let { e -> item(key = "error") { Notice(e, Modifier.padding(horizontal = Gutter).padding(top = 8.dp), warning = true) } }
        val catalog = (vm.menu as? Loadable.Ready)?.value
        when {
            (vm.favoritesLoading && vm.favoriteIds.isEmpty()) || catalog == null -> item(key = "loading") { LoadingState(Modifier.fillParentMaxHeight(0.6f)) }
            else -> {
                val items = catalog.categories.flatMap { it.items }.filter { it.id in vm.favoriteIds }
                if (items.isEmpty()) {
                    item(key = "empty") {
                        EmptyState(
                            KitIcons.Heart, "No favorites yet", "Tap the heart on any menu item to save it here with its live price.",
                            Modifier.fillParentMaxHeight(0.7f), "Browse menu", { vm.showMenu() },
                        )
                    }
                } else {
                    item(key = "gap") { Box(Modifier.padding(top = 8.dp)) }
                    groupItems(items, key = { it.id }) { item ->
                        MenuRow(
                            item = item,
                            isFavorite = true,
                            onToggleFavorite = { vm.toggleFavorite(item.id) },
                            onClick = { if (item.availability == Availability.AVAILABLE) onItem(item) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(vm: AppViewModel) {
    val session = vm.session
    var fullName by remember(vm.profile?.fullName, session?.userId) {
        mutableStateOf(vm.profile?.fullName ?: session?.displayName.orEmpty())
    }
    var phone by remember(vm.profile?.phone, session?.userId) {
        mutableStateOf(vm.profile?.phone.orEmpty())
    }

    LaunchedEffect(session?.userId) { vm.loadProfile() }
    LaunchedEffect(vm.profile?.updatedAt) {
        vm.profile?.let {
            fullName = it.fullName
            phone = it.phone.orEmpty()
        }
    }

    Page(
        "Profile", onBack = { vm.back() },
        bottomBar = if (vm.profileLoading && vm.profile == null) null else {
            {
                KitButton("Save profile", { vm.saveProfile(fullName, phone) }, Modifier.fillMaxWidth(), busy = vm.profileSaving)
            }
        },
    ) {
        if (vm.profileLoading && vm.profile == null) {
            item(key = "loading") { LoadingState(Modifier.fillParentMaxHeight(0.6f)) }
            return@Page
        }
        item(key = "form") {
            Section(footer = "Your name and mobile number prefill pickup checkout. Your first name also labels any shop review you post.") {
                FieldRow(
                    "Full name", fullName, { fullName = it },
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                )
                FieldRow(
                    "Philippine mobile number", phone, { phone = it },
                    placeholder = "0912 345 6789 or +639123456789",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                )
            }
        }
        vm.profileError?.let { e -> item(key = "error") { Notice(e, Modifier.padding(horizontal = Gutter).padding(top = 16.dp), warning = true) } }
        vm.profileNotice?.let { n -> item(key = "notice") { Notice(n, Modifier.padding(horizontal = Gutter).padding(top = 16.dp)) } }
    }
}

@Composable
fun DataRequestScreen(vm: AppViewModel) {
    val c = Kit.colors
    var kind by remember { mutableStateOf("correction") }
    var message by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.loadDataRequests() }
    LaunchedEffect(vm.dataRequestNotice) {
        if (vm.dataRequestNotice != null) message = ""
    }

    val kinds = listOf("correction" to "Correction", "deletion" to "Deletion")
    Page("Data requests", onBack = { vm.back() }) {
        item(key = "kind") {
            Section(header = "Ask us to correct or delete your data") {
                kinds.forEach { (value, label) -> CheckRow(label, kind == value, { kind = value }) }
            }
        }
        item(key = "form") {
            Section(footer = "${DataRequestValidation.MAX_LENGTH - message.length} characters left") {
                FieldRow(
                    "Details", message, { if (it.length <= DataRequestValidation.MAX_LENGTH) message = it },
                    placeholder = "Describe what you would like corrected or deleted…",
                    singleLine = false, minLines = 3,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                )
            }
        }
        vm.dataRequestError?.let { e -> item(key = "error") { Notice(e, Modifier.padding(horizontal = Gutter).padding(top = 16.dp), warning = true) } }
        vm.dataRequestNotice?.let { n -> item(key = "notice") { Notice(n, Modifier.padding(horizontal = Gutter).padding(top = 16.dp)) } }
        item(key = "submit") {
            KitButton(
                "Submit request", { vm.submitDataRequest(kind, message) },
                Modifier.fillMaxWidth().padding(horizontal = Gutter).padding(top = 20.dp),
                busy = vm.dataRequestSubmitting,
            )
        }

        when (val reqs = vm.dataRequests) {
            Loadable.Loading -> item(key = "loading") { LoadingState() }
            is Loadable.Failed -> item(key = "failed") { Notice(reqs.message, Modifier.padding(horizontal = Gutter).padding(top = 16.dp), warning = true) }
            is Loadable.Ready -> if (reqs.value.isNotEmpty()) {
                item(key = "hdr") {
                    Column(Modifier.padding(horizontal = Gutter).padding(top = 28.dp)) {
                        Text("Previous requests", style = KitType.headline, color = c.label2, modifier = Modifier.padding(start = 16.dp, bottom = 8.dp))
                    }
                }
                groupItems(reqs.value, key = { it.id }) { entry ->
                    Cell {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(entry.kind.replaceFirstChar { it.uppercase() }, style = KitType.body.semibold, color = c.label, modifier = Modifier.weight(1f))
                            Badge(entry.status.replaceFirstChar { it.uppercase() })
                        }
                        Text(entry.message, style = KitType.subhead, color = c.label, modifier = Modifier.padding(top = 4.dp))
                        Text(LoyaltyFormat.formatDateTime(entry.createdAt), style = KitType.footnote, color = c.label2, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }
    }
}
