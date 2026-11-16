package com.brewnicat.connect.ui.kit

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class TabItem(val label: String, val icon: ImageVector)

/** Height of the tab bar and its gap from the bottom of the screen (from the kit). */
val TabBarHeight = 62.dp
val TabBarGap = 12.dp

/**
 * The kit's tab bar: a floating Liquid Glass capsule. The chosen tab sits on a
 * grey capsule that slides between tabs, with its icon and label in the tint.
 */
@Composable
fun TabBar(tabs: List<TabItem>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val c = Kit.colors
    val haptics = LocalHapticFeedback.current
    BoxWithConstraints(modifier.widthIn(max = 430.dp).fillMaxWidth().height(TabBarHeight).glass(CircleShape).padding(4.dp).selectableGroup()) {
        val slot = maxWidth / tabs.size
        val x by animateDpAsState(slot * selected.coerceAtLeast(0), spring(dampingRatio = 0.74f, stiffness = Spring.StiffnessMediumLow), label = "tab")
        if (selected >= 0) {
            Box(Modifier.offset { IntOffset(x.roundToPx(), 0) }.width(slot).fillMaxHeight().clip(CircleShape).background(c.fill3))
        }
        Row(Modifier.fillMaxSize()) {
            tabs.forEachIndexed { index, tab ->
                val active = index == selected
                val color by animateColorAsState(if (active) c.tint else c.label, label = "tabColor")
                Column(
                    Modifier.weight(1f).fillMaxHeight().clip(CircleShape)
                        .pressable(role = Role.Tab, scale = 0.9f) {
                            if (!active) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onSelect(index)
                        }
                        .semantics { contentDescription = tab.label; this.selected = active },
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
                ) {
                    Icon(tab.icon, null, tint = color, size = 24.dp)
                    Text(
                        tab.label, color = color, maxLines = 1,
                        style = KitType.caption2.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium),
                        modifier = Modifier.padding(top = 3.dp).clearAndSetSemantics {},
                    )
                }
            }
        }
    }
}

/**
 * A row of choices inside one glass capsule, for jumping between parts of a long
 * list. It scrolls sideways and keeps the chosen one in view.
 */
@Composable
fun CapsuleTabs(labels: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val c = Kit.colors
    val state = rememberLazyListState()
    LaunchedEffect(selected, labels.size) {
        if (selected in labels.indices) state.animateScrollToItem((selected - 1).coerceAtLeast(0))
    }
    LazyRow(
        modifier.fillMaxWidth().height(46.dp).glass(CircleShape).selectableGroup(),
        state = state,
        contentPadding = PaddingValues(4.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        itemsIndexed(labels) { index, label ->
            val active = index == selected
            val background by animateColorAsState(if (active) c.fill2 else Color.Transparent, label = "chip")
            Box(
                Modifier.fillMaxHeight().clip(CircleShape).background(background)
                    .pressable(role = Role.Tab, scale = 0.94f) { onSelect(index) }
                    .semantics { this.selected = active }
                    .padding(horizontal = 15.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(label, style = if (active) KitType.subhead.semibold else KitType.subhead.medium, color = if (active) c.tint else c.label, maxLines = 1)
            }
        }
    }
}
