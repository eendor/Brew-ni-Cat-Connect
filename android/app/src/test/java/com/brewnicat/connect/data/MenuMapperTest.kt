package com.brewnicat.connect.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuMapperTest {
    @Test fun mapsCategoriesItemsAndVariants() {
        val catalog = Fixtures.catalog
        assertEquals(listOf("Buldak & Sedaap", "Cat-Tastic Bites"), catalog.categories.map { it.name })
        val carbo = catalog.findItem("i-carbo")!!
        assertEquals(listOf("Plain", "With Egg"), carbo.variants.map { it.name })
        assertEquals(134.0, carbo.variants[1].basePrice!!, 0.0)
        assertEquals(Availability.AVAILABLE, carbo.availability)
    }

    @Test fun readsVariantsStoredAsTextAndMakesUpMissingIds() {
        val sedaap = Fixtures.catalog.findItem("i-sedaap")!!
        assertEquals("i-sedaap-variant-1", sedaap.variants.single().id)
        assertEquals(listOf(FlavorPrice("2 Paws (Medium)", 74.0)), sedaap.variants.single().flavorPrices)
        assertEquals(listOf("1 Paw (Mild)", "2 Paws (Medium)"), sedaap.flavors)
    }

    @Test fun keepsAvailabilityThreeWay() {
        assertEquals(Availability.UNAVAILABLE, Fixtures.catalog.findItem("i-off")!!.availability)
        assertEquals(Availability.UNKNOWN, Fixtures.catalog.findItem("i-unknown")!!.availability)
    }

    @Test fun dropsRowsWithoutAName() {
        assertNull(Fixtures.catalog.findItem("i-broken"))
    }

    @Test fun attachesValidAddOnsInSortOrder() {
        val sedaap = Fixtures.catalog.findItem("i-sedaap")!!
        assertEquals(listOf("3pcs Seaweed", "Egg (Boiled)"), sedaap.addOns.map { it.label })
        assertTrue(Fixtures.catalog.findItem("i-fries")!!.addOns.isEmpty())
    }

    @Test fun hidesShopOnlyItemsAndPutsCatTreatsLast() {
        val full = Fixtures.fullCatalog.categories.map { it.name }
        assertEquals("Cat Treats", full.last())
        assertTrue(MenuMapper.isShopOnlyName("Take-out Box"))
        assertTrue(MenuMapper.isShopOnlyName("Bottled Water"))
        assertNull(Fixtures.catalog.findItem("i-box"))
        assertNull(Fixtures.catalog.findItem("i-treat"))
    }
}
