package com.brewnicat.connect.data

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import org.json.JSONObject

/*
 * Opening hours and the "closed today" switch (src/lib/site-content/open-now.ts).
 * The server also refuses orders while the shop is closed; the app says so up
 * front so nobody fills in checkout for nothing.
 */

data class OpeningHours(val opens: String, val closes: String)

data class ShopHours(val days: Map<DayOfWeek, OpeningHours?>, val note: String, val closedToday: Boolean, val closureNote: String) {

    sealed interface Status {
        data class Open(val closes: String) : Status
        data class Closed(val message: String) : Status
    }

    fun status(now: ZonedDateTime = ZonedDateTime.now(MANILA)): Status {
        val local = now.withZoneSameInstant(MANILA)
        if (closedToday) {
            return Status.Closed("We're closed today, so the shop can't take online orders. Please come back when we're open.")
        }
        val today = days[local.dayOfWeek]
            ?: return Status.Closed("We're closed for the day, so the shop can't take online orders. Please order again during our opening hours.")
        val minutes = local.hour * 60 + local.minute
        if (minutes < toMinutes(today.opens)) {
            return Status.Closed("We're not open yet. You can order online from ${formatTime(today.opens)} today.")
        }
        if (minutes >= toMinutes(today.closes)) {
            return Status.Closed("We're closed for the day, so the shop can't take online orders. Please order again during our opening hours.")
        }
        return Status.Open(today.closes)
    }

    companion object {
        val MANILA: ZoneId = ZoneId.of("Asia/Manila")
        private val dayKeys = mapOf(
            "monday" to DayOfWeek.MONDAY, "tuesday" to DayOfWeek.TUESDAY, "wednesday" to DayOfWeek.WEDNESDAY,
            "thursday" to DayOfWeek.THURSDAY, "friday" to DayOfWeek.FRIDAY, "saturday" to DayOfWeek.SATURDAY,
            "sunday" to DayOfWeek.SUNDAY,
        )

        private fun toMinutes(time: String): Int {
            val (h, m) = (time.split(":") + listOf("0", "0")).take(2).map { it.toIntOrNull() ?: 0 }
            return h * 60 + m
        }

        /** "11:00" -> "11:00 AM", "21:30" -> "9:30 PM". */
        fun formatTime(time: String): String = runCatching {
            LocalTime.parse(time.padStart(5, '0')).format(DateTimeFormatter.ofPattern("h:mm a", Locale.US))
        }.getOrDefault(time)

        /**
         * From the site_content rows. The closed switch counts only on the Manila day
         * it was turned on, like closureForToday on the website.
         */
        fun fromSiteContent(hours: JSONObject?, closure: JSONObject?, closureUpdatedAt: String?, now: ZonedDateTime = ZonedDateTime.now(MANILA)): ShopHours? {
            val daysJson = hours?.optJSONObject("days") ?: return null
            val days = dayKeys.mapValues { (key, _) ->
                daysJson.optJSONObject(key)?.let { d ->
                    val opens = d.optString("opens")
                    val closes = d.optString("closes")
                    if (opens.isBlank() || closes.isBlank()) null else OpeningHours(opens, closes)
                }
            }.entries.associate { (k, v) -> dayKeys.getValue(k) to v }
            var closed = closure?.optBoolean("closed", false) ?: false
            if (closed && closureUpdatedAt != null) {
                val changed = runCatching { OffsetDateTime.parse(closureUpdatedAt).atZoneSameInstant(MANILA).toLocalDate() }.getOrNull()
                if (changed != null && changed != LocalDate.from(now.withZoneSameInstant(MANILA))) closed = false
            }
            return ShopHours(days, hours.optString("note"), closed, closure?.optString("note").orEmpty())
        }
    }
}
