package com.brewnicat.connect.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HomeRowsTest {
    private fun variant(id: String, name: String, price: Double?) = MenuVariant(id, name, price, emptyList(), null)

    private val catalog = MenuCatalog(
        listOf(
            MenuCategory(
                "drinks", "Cat-tastic Drinks",
                listOf(
                    MenuItem("matcha", "Matcha (The Lucky Green Neko)", Availability.AVAILABLE, listOf("Dirty Neko", " Vanilla Matcha Meow ", "Dirty Neko"), listOf(variant("m16", "16 oz", 120.0), variant("m22", "22 oz", 140.0))),
                    MenuItem("latte", "Cat-feine", Availability.UNAVAILABLE, emptyList(), listOf(variant("l16", "16 oz", 99.0), variant("l22", "22 oz", 119.0))),
                ),
            ),
            MenuCategory("empty", "Nothing here", emptyList()),
            MenuCategory("bites", "Cat-tastic Bites", listOf(MenuItem("fries", "Fries (Cat Claws)", Availability.UNKNOWN, emptyList(), listOf(variant("f", "Regular", 75.0))))),
        ),
    )

    @Test
    fun buildsOneRowPerCategoryWithFlavorsPricesAndSoldOut() {
        val rows = HomeRows.build(catalog)
        assertEquals(listOf("Cat-tastic Drinks", "Cat-tastic Bites"), rows.map { it.title })

        val (matcha, latte) = rows[0].products
        assertEquals("Dirty Neko, Vanilla Matcha Meow", matcha.flavors)
        assertEquals(120.0, matcha.fromPrice!!, 0.001)
        assertFalse(matcha.soldOut)

        // No flavors: the sizes stand in; sold out only when the shop says so.
        assertEquals("16 oz · 22 oz", latte.flavors)
        assertTrue(latte.soldOut)

        val fries = rows[1].products.single()
        assertNull(fries.flavors)
        assertFalse(fries.soldOut)
    }

    @Test
    fun labelsThePointsChip() {
        assertEquals("Sign in to earn points", HomeRows.pointsLabel(false, 40))
        assertEquals("Your points", HomeRows.pointsLabel(true, null))
        assertEquals("1 point", HomeRows.pointsLabel(true, 1))
        assertEquals("25 points", HomeRows.pointsLabel(true, 25))
    }
}
