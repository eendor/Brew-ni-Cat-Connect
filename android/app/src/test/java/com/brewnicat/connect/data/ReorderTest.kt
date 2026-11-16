package com.brewnicat.connect.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReorderTest {
    @Test
    fun reordersAvailableItemsFlagsPriceChangesAndSkipsUnavailable() {
        val catalog = Fixtures.catalog
        val lines = listOf(
            // Available, unchanged price: Buldak Carbo Plain (119)
            OrderHistoryItem(1, "i-carbo", "Buldak Carbo", "v-plain", "Plain", null, 119.0, 2, 238.0),
            // Available, price changed since old order (was 25, now 30 for Cheese Fries)
            OrderHistoryItem(2, "i-fries", "Fries (Cat Claws)", "v-reg", "Regular", "Cheese", 25.0, 1, 25.0),
            // Unavailable item on catalog
            OrderHistoryItem(3, "i-off", "Takoyaki", "v-6", "6 pcs", null, 79.0, 1, 79.0),
            // Removed item completely
            OrderHistoryItem(4, "i-old", "Old Drink", "reg", "Regular", null, 50.0, 1, 50.0),
        )

        val result = Reorder.reorder(lines, catalog, Cart())
        assertEquals(3, result.addedQuantity)
        assertEquals(2, result.cart.lines.size)
        assertEquals(1, result.priceChangeNotices.size)
        assertEquals("Added 3 items to your cart.", result.summaryMessage)
        assertTrue("Fries (Cat Claws)" in result.priceChangeNotices.single())
        assertEquals(2, result.unavailableNotices.size)
        assertTrue(result.unavailableNotices.any { "Takoyaki" in it })
        assertTrue(result.unavailableNotices.any { "Old Drink" in it })
    }
}
