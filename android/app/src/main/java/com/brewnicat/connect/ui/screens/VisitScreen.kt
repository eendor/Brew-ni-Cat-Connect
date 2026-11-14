package com.brewnicat.connect.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.data.ShopHours
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.theme.Brand
import java.time.DayOfWeek
import java.time.ZonedDateTime
import java.time.format.TextStyle
import java.util.Locale

private const val MAP_URL = "https://www.google.com/maps/search/?api=1&query=7.1134444%2C124.826155"

@Composable
fun VisitScreen(vm: AppViewModel) {
    val context = LocalContext.current
    fun open(url: String) = runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) }
    val bottomPad = if (vm.cart.isEmpty) 24.dp else 88.dp
    Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = bottomPad)) {
        BrandHeader()
        Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Visit us", style = MaterialTheme.typography.headlineMedium, color = Brand.colors.ink)
            OpenStatus(vm.hours)
            Card(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Opening hours", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                    val hours = vm.hours
                    if (hours == null) {
                        Text("Loading…", color = Brand.colors.muted)
                    } else {
                        val today = ZonedDateTime.now(ShopHours.MANILA).dayOfWeek
                        DayOfWeek.entries.forEach { day ->
                            val h = hours.days[day]
                            val style = if (day == today) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium
                            Row {
                                Text(day.getDisplayName(TextStyle.FULL, Locale.US), style = style, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                                Text(h?.let { "${ShopHours.formatTime(it.opens)} – ${ShopHours.formatTime(it.closes)}" } ?: "Closed", style = style, color = if (h == null) Brand.colors.muted else Brand.colors.ink)
                            }
                        }
                        if (hours.note.isNotBlank()) Text(hours.note, style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                    }
                }
            }
            Card(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Find us", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                    Text("Abellera St, Poblacion, Kabacan, Cotabato 9407", style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink)
                    Text("Beside Pulido Eatery", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                    TextButton(onClick = { open(MAP_URL) }) { Text("Open in Maps", color = Brand.colors.accent) }
                }
            }
            Card(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Account and rewards", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                    Text(
                        "Signing in, loyalty points and reviews are coming to the app. For now you can use them on our website.",
                        style = MaterialTheme.typography.bodyMedium, color = Brand.colors.muted,
                    )
                    TextButton(onClick = { open(BuildConfig.SITE_URL + "/account") }) { Text("Open my account on the website", color = Brand.colors.accent) }
                    TextButton(onClick = { open(BuildConfig.SITE_URL + "/privacy") }) { Text("Privacy notice", color = Brand.colors.accent) }
                }
            }
            Text("Version ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
        }
    }
}
