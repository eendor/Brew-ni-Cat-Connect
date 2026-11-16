package com.brewnicat.connect.data

import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AdsTest {
    private val key = "0123456789abcdef0123456789abcdef"

    @Test
    fun normalizesValid32HexKeysOnly() {
        assertNull(AdConfig.adKey(null))
        assertNull(AdConfig.adKey(""))
        assertNull(AdConfig.adKey("short-key"))
        assertEquals(key, AdConfig.adKey(" ${key.uppercase()} "))
    }

    @Test
    fun gatesOrderStatusVisibility() {
        assertFalse(AdConfig.shouldShowOrderAd("pending", ""))
        assertFalse(AdConfig.shouldShowOrderAd("pending", null))
        for (allowed in listOf("pending", "accepted", "preparing", "completed")) {
            assertTrue(allowed, AdConfig.shouldShowOrderAd(allowed, key))
        }
        for (blocked in listOf("ready", "rejected", "cancelled", null)) {
            assertFalse(blocked.toString(), AdConfig.shouldShowOrderAd(blocked, key))
        }
    }

    @Test
    fun buildsOpaqueDataUrlAndAdsterraScript() {
        val url = AdConfig.adDataUrl(key)
        assertTrue(url.startsWith("data:text/html;charset=utf-8,"))
        val decoded = URLDecoder.decode(url.removePrefix("data:text/html;charset=utf-8,").replace("%20", "+"), StandardCharsets.UTF_8.name())
        assertTrue(decoded.contains("https://bauval.org/22/$key"))
        assertTrue(decoded.contains("BncAdBridge.onAdFilled"))
        assertTrue(decoded.contains("\"width\":300"))
        assertTrue(decoded.contains("\"height\":250"))
    }
}
