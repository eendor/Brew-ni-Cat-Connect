package com.brewnicat.connect.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.core.net.toUri
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.data.ShopHours
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.IconTile
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.Page
import java.time.DayOfWeek
import java.time.ZonedDateTime
import java.time.format.TextStyle
import java.util.Locale

private const val MAP_URL = "https://www.google.com/maps/search/?api=1&query=7.1134444%2C124.826155"

@Composable
fun VisitScreen(vm: AppViewModel) {
    val context = LocalContext.current
    val c = Kit.colors
    fun open(url: String) = runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) }
    Page("Visit") {
        item(key = "status") { OpenStatus(vm.hours, Modifier.padding(horizontal = Gutter + 4.dp).padding(top = 4.dp)) }
        item(key = "hours") {
            val hours = vm.hours
            Section(header = "Opening hours", footer = hours?.note?.takeIf { it.isNotBlank() }) {
                if (hours == null) {
                    ListRow("Loading…", titleColor = c.label2)
                } else {
                    val today = ZonedDateTime.now(ShopHours.MANILA).dayOfWeek
                    DayOfWeek.entries.forEach { day ->
                        val h = hours.days[day]
                        ListRow(
                            day.getDisplayName(TextStyle.FULL, Locale.US),
                            titleColor = if (day == today) c.tint else c.label,
                            detail = h?.let { "${ShopHours.formatTime(it.opens)} – ${ShopHours.formatTime(it.closes)}" } ?: "Closed",
                            trailing = if (day == today) { { Badge("Today") } } else null,
                        )
                    }
                }
            }
        }
        item(key = "find") {
            Section(header = "Find us") {
                ListRow(
                    "Abellera St, Poblacion, Kabacan, Cotabato 9407",
                    subtitle = "Beside Pulido Eatery",
                    leading = { IconTile(KitIcons.MapPin, c.red) },
                )
                ListRow(
                    "Open in Maps",
                    titleColor = c.tint,
                    trailing = { Icon(KitIcons.ArrowUpRight, null, tint = c.label3, size = 18.dp) },
                    onClick = { open(MAP_URL) },
                )
            }
        }
        item(key = "account") {
            Section(
                header = "Account, loyalty and reviews",
                footer = "Sign in with Google to earn coins, redeem rewards, save favorites, and read or share shop reviews right here in the app.",
            ) {
                ListRow("Open Account tab", leading = { IconTile(KitIcons.UserRound, c.gray) }, chevron = true, onClick = { vm.selectTab(Screen.Account) })
                ListRow("Shop reviews", leading = { IconTile(KitIcons.MessageSquareText, c.indigo) }, chevron = true, onClick = { vm.open(Screen.Reviews) })
                ListRow(
                    "Privacy notice", leading = { IconTile(KitIcons.Lock, c.teal) },
                    trailing = { Icon(KitIcons.ArrowUpRight, null, tint = c.label3, size = 18.dp) },
                    onClick = { open(BuildConfig.SITE_URL + "/privacy") },
                )
            }
        }
        item(key = "version") {
            Text(
                "Version ${BuildConfig.VERSION_NAME}", style = KitType.footnote, color = c.label3, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
            )
        }
    }
}
