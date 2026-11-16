package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.brewnicat.connect.data.OrderView
import com.brewnicat.connect.data.ShopHours
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.orangeText
import androidx.compose.ui.unit.dp

/** Whether the shop is open now: a coloured dot and one line. */
@Composable
fun OpenStatus(hours: ShopHours?, modifier: Modifier = Modifier) {
    if (hours == null) return
    val c = Kit.colors
    val status = hours.status()
    val open = status is ShopHours.Status.Open
    Row(modifier, verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.padding(top = 6.dp).size(8.dp).clip(CircleShape).background(if (open) c.green else c.orange))
        Text(
            when (status) {
                is ShopHours.Status.Open -> "Open now · until ${ShopHours.formatTime(status.closes)}"
                is ShopHours.Status.Closed -> status.message
            },
            style = KitType.subhead, color = if (open) c.label2 else c.orangeText,
        )
    }
}

/** An order's status as a small capsule, coloured by how far along it is. */
@Composable
fun StatusPill(status: String, modifier: Modifier = Modifier) {
    val c = Kit.colors
    val color = when (status) {
        "rejected", "cancelled" -> c.red
        "ready" -> c.green
        "completed" -> c.gray
        else -> c.tint
    }
    Badge(OrderView.label(status), modifier, color = color, solid = status == "ready")
}

/** The icon that stands for an order's status. */
fun statusIcon(status: String) = when (status) {
    "ready" -> KitIcons.BellRing
    "completed" -> KitIcons.CircleCheck
    "rejected", "cancelled" -> KitIcons.CircleX
    "preparing" -> KitIcons.CupSoda
    else -> KitIcons.PawPrint
}

/** "Regular" says nothing, so a line's detail is its size (if any) and flavour. */
fun lineDetail(variantName: String, flavor: String?): String =
    listOfNotNull(variantName.takeIf { it.isNotBlank() && !it.equals("regular", ignoreCase = true) }, flavor?.takeIf { it.isNotBlank() }).joinToString(" · ")
