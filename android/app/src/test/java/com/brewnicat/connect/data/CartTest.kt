package com.brewnicat.connect.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CartTest {
    private val catalog = Fixtures.catalog

    private fun Cart.added(itemId: String, variantId: String, flavor: String?, quantity: Int = 1) =
        (add(catalog, itemId, variantId, flavor, quantity) as Cart.AddResult.Added).cart

    @Test fun addsMergesAndTotals() {
        val cart = Cart().added("i-carbo", "v-plain", null).added("i-carbo", "v-plain", null, 2)
            .added("i-sedaap", "i-sedaap-variant-1", "2 Paws (Medium)")
        assertEquals(2, cart.lines.size)
        assertEquals(4, cart.itemCount)
        assertEquals(119.0 * 3 + 74.0, cart.subtotal, 0.0)
    }

    @Test fun refusesWhatCantBeOrdered() {
        assertEquals(Cart.AddResult.Failed("item-unavailable"), Cart().add(catalog, "i-off", "v-6", null, 1))
        assertEquals(Cart.AddResult.Failed("availability-unknown"), Cart().add(catalog, "i-unknown", "v-1", null, 1))
        assertEquals(Cart.AddResult.Failed("unknown-item"), Cart().add(catalog, "i-box", "v-1", null, 1))
        assertEquals(Cart.AddResult.Failed("invalid-quantity"), Cart().add(catalog, "i-carbo", "v-plain", null, 0))
        assertEquals(Cart.AddResult.Failed("missing-price"), Cart().add(catalog, "i-fries", "v-reg", null, 1))
    }

    @Test fun capsQuantityAndRemovesAtZero() {
        val cart = Cart().added("i-carbo", "v-plain", null, 98).added("i-carbo", "v-plain", null, 5)
        assertEquals(Pricing.MAX_QUANTITY, cart.itemCount)
        assertTrue(cart.setQuantity(cart.lines.single().key, 0).isEmpty)
    }

    @Test fun revalidateDropsAndReprices() {
        val stale = Cart(
            listOf(
                CartLine("i-carbo", "Buldak Carbo", "v-plain", "Plain", null, 99.0, 1),
                CartLine("i-off", "Takoyaki", "v-6", "6 pcs", null, 79.0, 1),
            ),
        )
        val r = stale.revalidate(catalog)
        assertEquals(listOf("Takoyaki"), r.removed)
        assertEquals(listOf("Buldak Carbo"), r.repriced)
        assertEquals(119.0, r.cart.subtotal, 0.0)
    }

    @Test fun survivesSavingAndLoading() {
        val cart = Cart().added("i-fries", "v-reg", "Cheese / BBQ", 2).added("i-carbo", "v-egg", null)
        assertEquals(cart, Cart.fromJson(cart.toJson()))
    }
}
