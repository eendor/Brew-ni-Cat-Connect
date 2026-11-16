package com.brewnicat.connect.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PricingTest {
    private val catalog = Fixtures.catalog
    private val sedaap = catalog.findItem("i-sedaap")!!
    private val fries = catalog.findItem("i-fries")!!
    private val carbo = catalog.findItem("i-carbo")!!

    private fun price(item: MenuItem, flavor: String?) = Pricing.resolveUnitPrice(item, item.variants.first(), flavor)

    @Test fun usesFlavorPriceThenBasePrice() {
        assertEquals(PriceResult.Ok(74.0), price(sedaap, "2 Paws (Medium)"))
        assertEquals(PriceResult.Ok(69.0), price(sedaap, "1 Paw (Mild)"))
        assertEquals(PriceResult.Ok(119.0), price(carbo, null))
    }

    @Test fun refusesUnknownFlavorsAndMissingPrices() {
        assertEquals(PriceResult.Failed("unknown-flavor"), price(sedaap, "Ghost Pepper"))
        assertEquals(PriceResult.Failed("missing-price"), price(fries, null))
    }

    @Test fun mixesOnlyFriesAndChargesTheDearestFlavor() {
        assertEquals(PriceResult.Ok(35.0), price(fries, "Cheese / Sour Cream"))
        assertEquals(PriceResult.Failed("unknown-flavor"), price(sedaap, "1 Paw (Mild) / 2 Paws (Medium)"))
        assertEquals(PriceResult.Failed("unknown-flavor"), price(fries, "Cheese / Cheese"))
        assertTrue(Pricing.allowsFlavorMix(fries))
        assertFalse(Pricing.allowsFlavorMix(sedaap))
    }

    @Test fun addsAddOnsTheWayThePosStoresThem() {
        assertEquals("2 Paws (Medium) + 3pcs Seaweed, Egg (Boiled)", Pricing.encodeLineFlavor("2 Paws (Medium)", listOf("3pcs Seaweed", "Egg (Boiled)")))
        assertEquals("+ Egg (Boiled)", Pricing.encodeLineFlavor(null, listOf("Egg (Boiled)")))
        assertEquals(PriceResult.Ok(114.0), price(sedaap, "2 Paws (Medium) + 3pcs Seaweed, Egg (Boiled)"))
        assertEquals(PriceResult.Failed("unknown-flavor"), price(sedaap, "2 Paws (Medium) + Caviar"))
        assertEquals(PriceResult.Failed("unknown-flavor"), price(sedaap, "2 Paws (Medium) + Egg (Boiled), Egg (Boiled)"))
    }

    @Test fun needsFlavorWhenOnlyFlavorsHavePrices() {
        assertTrue(Pricing.needsFlavor(fries, fries.variants.first()))
        assertFalse(Pricing.needsFlavor(carbo, carbo.variants.first()))
    }

    @Test fun fromPriceIsTheLowestRealPrice() {
        assertEquals(30.0, Pricing.fromPrice(fries)!!, 0.0)
        assertEquals(69.0, Pricing.fromPrice(sedaap)!!, 0.0)
    }

    @Test fun formatsPesosAndAvoidsFloatDrift() {
        assertEquals("₱94", Pricing.formatPeso(94.0))
        assertEquals("₱1,234.50", Pricing.formatPeso(1234.5))
        assertEquals(0.3, Pricing.lineTotal(0.1, 3), 0.0)
    }
}
