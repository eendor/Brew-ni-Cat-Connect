package com.brewnicat.connect.data

import java.time.ZoneOffset
import java.time.ZonedDateTime
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ShopHoursTest {
    private val hoursJson = JSONObject(
        """
        {
          "days": {
            "monday": {"opens": "10:00", "closes": "21:00"},
            "tuesday": {"opens": "10:00", "closes": "21:00"},
            "wednesday": {"opens": "10:00", "closes": "21:00"},
            "thursday": {"opens": "10:00", "closes": "21:00"},
            "friday": {"opens": "10:00", "closes": "21:00"},
            "saturday": {"opens": "11:00", "closes": "21:00"},
            "sunday": null
          },
          "note": "Closed on Sundays"
        }
        """.trimIndent(),
    )

    private fun manila(year: Int, month: Int, day: Int, hour: Int, minute: Int) =
        ZonedDateTime.of(year, month, day, hour, minute, 0, 0, ShopHours.MANILA)

    @Test fun evaluatesOpeningHoursInManilaTime() {
        val hours = ShopHours.fromSiteContent(hoursJson, null, null, manila(2026, 11, 14, 12, 0))!!
        // Saturday 2026-11-14 opens 11:00, closes 21:00
        assertTrue(hours.status(manila(2026, 11, 14, 10, 59)) is ShopHours.Status.Closed)
        assertEquals(ShopHours.Status.Open("21:00"), hours.status(manila(2026, 11, 14, 11, 0)))
        // Converts UTC to Manila (+8): 13:00 UTC = 21:00 Manila (closed)
        assertTrue(hours.status(ZonedDateTime.of(2026, 11, 14, 13, 0, 0, 0, ZoneOffset.UTC)) is ShopHours.Status.Closed)
        // Sunday is closed
        assertTrue(hours.status(manila(2026, 11, 15, 14, 0)) is ShopHours.Status.Closed)
    }

    @Test fun closedTodayExpiresOnNextManilaDay() {
        val closure = JSONObject("""{"closed": true, "note": "Brownout"}""")
        val today = manila(2026, 11, 14, 14, 0)
        val sameDay = ShopHours.fromSiteContent(hoursJson, closure, "2026-11-14T09:00:00+08:00", today)!!
        assertTrue(sameDay.closedToday)
        assertTrue(sameDay.status(today) is ShopHours.Status.Closed)

        val yesterday = ShopHours.fromSiteContent(hoursJson, closure, "2026-11-13T20:00:00+08:00", today)!!
        assertFalse(yesterday.closedToday)
        assertTrue(yesterday.status(today) is ShopHours.Status.Open)
    }

    @Test fun formatsTwentyFourHourTimes() {
        assertEquals("11:00 AM", ShopHours.formatTime("11:00"))
        assertEquals("9:30 PM", ShopHours.formatTime("21:30"))
        assertNull(ShopHours.fromSiteContent(null, null, null))
    }
}
