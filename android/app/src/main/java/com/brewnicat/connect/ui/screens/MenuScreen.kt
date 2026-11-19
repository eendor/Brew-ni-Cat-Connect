package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Availability
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.data.Pricing
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.MenuImages
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.Block
import com.brewnicat.connect.ui.kit.CapsuleTabs
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.FavoriteHeartButton
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Photo
import com.brewnicat.connect.ui.kit.SectionHeader
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.groupItems
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.rowPress
import com.brewnicat.connect.ui.kit.semibold
import kotlinx.coroutines.launch

/** One menu item as a list cell: photo, name, options, price, a heart and an add button. */
@Composable
fun MenuRow(
    item: MenuItem,
    isFavorite: Boolean = false,
    onToggleFavorite: (() -> Unit)? = null,
    onClick: () -> Unit,
) {
    val c = Kit.colors
    val unavailable = item.availability != Availability.AVAILABLE
    Row(
        Modifier.fillMaxWidth().rowPress(enabled = !unavailable, onClick = onClick).heightIn(min = 88.dp)
            .padding(start = 12.dp, end = 8.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Photo(MenuImages.forItem(item.name), item.name, placeholderFor = item.name, modifier = Modifier.size(68.dp).clip(RoundedCornerShape(16.dp)).alpha(if (unavailable) 0.5f else 1f))
        Column(Modifier.weight(1f).padding(start = 14.dp, end = 4.dp).alpha(if (unavailable) 0.55f else 1f)) {
            Text(item.name, style = KitType.body.semibold, color = c.label, maxLines = 2)
            val sizes = item.variants.map { it.name }.filter { it.isNotBlank() && !it.equals("regular", ignoreCase = true) }
            val sizeText = sizes.joinToString(" · ").let { if (it.length > 34) "${sizes.size} options" else it }
            val meta = listOfNotNull(sizeText.takeIf { sizes.isNotEmpty() }, item.flavors.size.takeIf { it > 0 }?.let { "$it flavors" }).joinToString(" · ")
            if (meta.isNotEmpty()) Text(meta, style = KitType.footnote, color = c.label2, maxLines = 1, modifier = Modifier.padding(top = 1.dp))
            Box(Modifier.padding(top = 5.dp)) {
                when (item.availability) {
                    Availability.UNAVAILABLE -> Badge("Unavailable", color = c.gray)
                    Availability.UNKNOWN -> Badge("Ask at the counter", color = c.orange)
                    Availability.AVAILABLE -> Pricing.fromPrice(item)?.let {
                        val from = item.variants.size > 1 || item.flavors.isNotEmpty()
                        Text(if (from) "From ${Pricing.formatPeso(it)}" else Pricing.formatPeso(it), style = KitType.subhead.semibold, color = c.tint)
                    }
                }
            }
        }
        onToggleFavorite?.let { FavoriteHeartButton(isFavorite, item.name, it) }
        if (!unavailable) {
            Box(
                Modifier.size(44.dp).pressable(scale = 0.86f, role = Role.Button, onClick = onClick).semantics { contentDescription = "Add ${item.name}" },
                contentAlignment = Alignment.Center,
            ) {
                Box(Modifier.size(30.dp).clip(CircleShape).background(c.fill3), contentAlignment = Alignment.Center) {
                    Icon(KitIcons.Plus, null, tint = c.tint, size = 18.dp)
                }
            }
        }
    }
}
