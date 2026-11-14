package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.brewnicat.connect.ui.theme.Brand

@Composable
fun OrderHistoryScreen(vm: AppViewModel) {
    var reorderWarning by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { vm.loadOrderHistory(1) }

    Column(Modifier.fillMaxSize()) {
        TopBar("Order history", { vm.back() })
        reorderWarning?.let {
            BoxNotice(it)
        }
        when (val state = vm.orderHistory ?: Loadable.Loading) {
            Loadable.Loading -> LoadingState()
            is Loadable.Failed -> MessageState("😿", "Couldn't load orders", state.message, action = "Try again") {
                vm.loadOrderHistory(vm.orderHistoryPage)
            }
            is Loadable.Ready -> {
                val page = state.value
                if (page.orders.isEmpty()) {
                    MessageState("🧾", "No past orders yet", "Orders you place while signed in will appear here.") {
                        vm.selectTab(Screen.Menu)
                    }
                } else {
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(page.orders, key = { it.id }) { entry ->
                            Card(Modifier.fillMaxWidth()) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                        Text(entry.reference, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                                        StatusPill(entry.status)
                                    }
                                    Text(LoyaltyFormat.formatDateTime(entry.createdAt), style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                                    entry.rejectionReason?.let { reason ->
                                        Notice("Reason: $reason")
                                    }
                                    entry.items.forEach { item ->
                                        val detail = listOfNotNull(
                                            item.variantName.takeIf { it.isNotBlank() && it.lowercase() != "regular" },
                                            item.flavor,
                                        ).joinToString(" · ")
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                            Text(
                                                "${item.quantity}× ${item.itemName}" + if (detail.isNotEmpty()) " ($detail)" else "",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Brand.colors.ink,
                                                modifier = Modifier.weight(1f),
                                            )
                                            Text(Pricing.formatPeso(item.lineTotal), style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                                        }
                                    }
                                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            "${entry.itemCount} items · ${entry.paymentPreference}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Brand.colors.muted,
                                            modifier = Modifier.weight(1f),
                                        )
                                        Text(Pricing.formatPeso(entry.subtotal), style = MaterialTheme.typography.titleSmall, color = Brand.colors.ink)
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        OutlinedButton(
                                            onClick = { vm.openOrderFromHistory(entry.reference) },
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Brand.colors.accent),
                                        ) {
                                            Text("View status")
                                        }
                                        Button(
                                            onClick = { reorderWarning = vm.reorderFromHistory(entry) },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Brand.colors.accentFill,
                                                contentColor = Brand.colors.onAccentFill,
                                            ),
                                        ) {
                                            Text("Reorder")
                                        }
                                    }
                                }
                            }
                        }

                        if (page.totalPages > 1) {
                            item("pagination") {
                                Row(
                                    Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    TextButton(
                                        onClick = { vm.loadOrderHistory(page.page - 1) },
                                        enabled = page.page > 1,
                                    ) { Text("Previous", color = Brand.colors.accent) }
                                    Text("Page ${page.page} of ${page.totalPages}", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                                    TextButton(
                                        onClick = { vm.loadOrderHistory(page.page + 1) },
                                        enabled = page.page < page.totalPages,
                                    ) { Text("Next", color = Brand.colors.accent) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BoxNotice(message: String) {
    Notice(message, modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp))
}

@Composable
fun FavoritesScreen(vm: AppViewModel, onItem: (MenuItem) -> Unit) {
    LaunchedEffect(Unit) { vm.loadFavoritesScreen() }

    Column(Modifier.fillMaxSize()) {
        TopBar("Favorites", { vm.back() })
        vm.favoritesError?.let { BoxNotice(it) }

        val catalog = (vm.menu as? Loadable.Ready)?.value
        when {
            vm.favoritesLoading && vm.favoriteIds.isEmpty() -> LoadingState()
            catalog == null -> LoadingState()
            else -> {
                val items = catalog.categories.flatMap { it.items }.filter { it.id in vm.favoriteIds }
                if (items.isEmpty()) {
                    MessageState(
                        "❤️",
                        "No favorites yet",
                        "Tap the heart on any menu item to save it here with its live price.",
                        action = "Browse menu",
                    ) { vm.selectTab(Screen.Menu) }
                } else {
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(items, key = { it.id }) { item ->
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

    Column(Modifier.fillMaxSize()) {
        TopBar("Profile", { vm.back() })
        if (vm.profileLoading && vm.profile == null) {
            LoadingState()
            return
        }
        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Card(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Your name and mobile number prefill pickup checkout. Your first name also labels any shop review you post.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Brand.colors.muted,
                    )
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Full name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Philippine mobile number") },
                        placeholder = { Text("0912 345 6789 or +639123456789") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    vm.profileError?.let { Notice(it) }
                    vm.profileNotice?.let { Notice(it, warning = false) }
                    PrimaryButton(
                        text = "Save profile",
                        onClick = { vm.saveProfile(fullName, phone) },
                        busy = vm.profileSaving,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
fun DataRequestScreen(vm: AppViewModel) {
    var kind by remember { mutableStateOf("correction") }
    var message by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.loadDataRequests() }
    LaunchedEffect(vm.dataRequestNotice) {
        if (vm.dataRequestNotice != null) message = ""
    }

    Column(Modifier.fillMaxSize()) {
        TopBar("Data requests", { vm.back() })
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item("form") {
                Card(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Ask us to correct or delete your data", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("correction" to "Correction", "deletion" to "Deletion").forEach { (value, label) ->
                                FilterChip(
                                    selected = kind == value,
                                    onClick = { kind = value },
                                    label = { Text(label) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Brand.colors.accentSurface,
                                        selectedLabelColor = Brand.colors.accent,
                                    ),
                                )
                            }
                        }
                        OutlinedTextField(
                            value = message,
                            onValueChange = { if (it.length <= DataRequestValidation.MAX_LENGTH) message = it },
                            label = { Text("Details") },
                            placeholder = { Text("Describe what you would like corrected or deleted…") },
                            minLines = 3,
                            supportingText = { Text("${DataRequestValidation.MAX_LENGTH - message.length} characters left") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        vm.dataRequestError?.let { Notice(it) }
                        vm.dataRequestNotice?.let {
                            Notice(it, warning = false)
                        }
                        PrimaryButton(
                            text = "Submit request",
                            onClick = { vm.submitDataRequest(kind, message) },
                            busy = vm.dataRequestSubmitting,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            when (val reqs = vm.dataRequests) {
                Loadable.Loading -> item("loading") { LoadingState() }
                is Loadable.Failed -> item("err") { Notice(reqs.message) }
                is Loadable.Ready -> {
                    if (reqs.value.isNotEmpty()) {
                        item("hdr") { SectionTitle("Previous requests", Modifier.padding(top = 4.dp)) }
                        items(reqs.value, key = { it.id }) { entry ->
                            Card(Modifier.fillMaxWidth()) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            entry.kind.replaceFirstChar { it.uppercase() },
                                            style = MaterialTheme.typography.titleSmall,
                                            color = Brand.colors.ink,
                                            modifier = Modifier.weight(1f),
                                        )
                                        Pill(entry.status, Brand.colors.accent, Brand.colors.accentSurface)
                                    }
                                    Text(entry.message, style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink)
                                    Text(LoyaltyFormat.formatDateTime(entry.createdAt), style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
