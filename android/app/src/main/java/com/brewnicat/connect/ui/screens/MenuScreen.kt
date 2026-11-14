package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Availability
import com.brewnicat.connect.data.MenuCatalog
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.theme.Brand
import kotlinx.coroutines.launch

@Composable
fun MenuScreen(vm: AppViewModel, onNeedSignIn: () -> Unit = {}, onItem: (MenuItem) -> Unit) {
    Column(Modifier.fillMaxSize()) {
        BrandHeader()
        when (val m = vm.menu) {
            Loadable.Loading -> LoadingState()
            is Loadable.Failed -> MessageState("😿", "Menu unavailable", m.message, action = "Try again", onAction = vm::loadMenu)
            is Loadable.Ready -> if (m.value.categories.isEmpty()) {
                MessageState("🐾", "Nothing on the menu yet", "Please check back soon.")
            } else MenuList(m.value, vm, onNeedSignIn, onItem)
        }
    }
}

@Composable
private fun MenuList(catalog: MenuCatalog, vm: AppViewModel, onNeedSignIn: () -> Unit, onItem: (MenuItem) -> Unit) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    // Index of each category header in the list: header + items per category.
    val headerIndex = remember(catalog) {
        var i = 1
        catalog.categories.map { c -> i.also { i += 1 + c.items.size } }
    }
    val active by remember(catalog) {
        derivedStateOf { headerIndex.indexOfLast { it <= listState.firstVisibleItemIndex + 1 }.coerceAtLeast(0) }
    }
    LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(catalog.categories.size) { index ->
            FilterChip(
                selected = index == active,
                onClick = { scope.launch { listState.animateScrollToItem(headerIndex[index]) } },
                label = { Text(catalog.categories[index].name) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Brand.colors.accentFill, selectedLabelColor = Brand.colors.onAccentFill,
                    containerColor = Brand.colors.card, labelColor = Brand.colors.ink,
                ),
                shape = MaterialTheme.shapes.extraLarge,
            )
        }
    }
    val bottomPad = if (vm.cart.isEmpty) 24.dp else 88.dp
    LazyColumn(state = listState, contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = bottomPad), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { OpenStatus(vm.hours, Modifier.padding(top = 4.dp)) }
        catalog.categories.forEach { category ->
            item(key = "c-${category.id}") {
                SectionTitle(category.name, Modifier.padding(top = 14.dp, bottom = 2.dp))
            }
            items(category.items, key = { it.id }) { item ->
                MenuRow(
                    item = item,
                    isFavorite = item.id in vm.favoriteIds,
                    onToggleFavorite = { vm.toggleFavorite(item.id, onNeedSignIn) },
                    onClick = { onItem(item) },
                )
            }
        }
    }
}

@Composable
fun MenuRow(
    item: MenuItem,
    isFavorite: Boolean = false,
    onToggleFavorite: (() -> Unit)? = null,
    onClick: () -> Unit,
) {
    val unavailable = item.availability != Availability.AVAILABLE
    Row(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(Brand.colors.card)
            .clickable(enabled = !unavailable, onClick = onClick).padding(10.dp).alpha(if (unavailable) 0.55f else 1f),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Photo(MenuImages.forItem(item.name), item.name, Modifier.size(84.dp).clip(MaterialTheme.shapes.medium))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(item.name, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
            val sizes = item.variants.map { it.name }.filter { it.isNotBlank() && it.lowercase() != "regular" }
            val sizeText = sizes.joinToString(" · ").let { if (it.length > 34) "${sizes.size} options" else it }
            if (sizes.isNotEmpty()) Text(sizeText, style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
            if (item.flavors.isNotEmpty()) {
                Text("${item.flavors.size} flavors", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
            }
            Spacer(Modifier.height(6.dp))
            when {
                item.availability == Availability.UNAVAILABLE -> Pill("Unavailable", Brand.colors.strong, Brand.colors.warm)
                item.availability == Availability.UNKNOWN -> Pill("Ask at the counter", Brand.colors.strong, Brand.colors.warm)
                else -> Pricing.fromPrice(item)?.let {
                    Text(
                        if (item.variants.size > 1 || item.flavors.isNotEmpty()) "From ${Pricing.formatPeso(it)}" else Pricing.formatPeso(it),
                        style = MaterialTheme.typography.titleSmall, color = Brand.colors.accent,
                    )
                }
            }
        }
        onToggleFavorite?.let { toggle ->
            FavoriteHeartButton(isFavorite = isFavorite, itemName = item.name, onClick = toggle)
        }
        if (!unavailable) {
            Text("+", style = MaterialTheme.typography.headlineSmall, color = Brand.colors.onAccentFill,
                modifier = Modifier.size(38.dp).clip(MaterialTheme.shapes.extraLarge).background(Brand.colors.accentFill).padding(top = 2.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}
