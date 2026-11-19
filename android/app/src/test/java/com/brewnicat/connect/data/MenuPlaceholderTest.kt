package com.brewnicat.connect.data

import com.brewnicat.connect.data.MenuPlaceholder.Kind
import org.junit.Assert.assertEquals
import org.junit.Test

class MenuPlaceholderTest {
    @Test
    fun picksAnIconForEveryLiveMenuItem() {
        val expected = mapOf(
            "Buldak Carbo" to Kind.Noodles,
            "Sedaap Spicy Chicken" to Kind.Noodles,
            "Cat Treats" to Kind.CatTreats,
            "Takoyaki (Pawsome Balls)" to Kind.Food,
            "Nachos (Kitty Litter Crisps)" to Kind.Nachos,
            "Fries (Cat Claws)" to Kind.Fries,
            "Bottled Water" to Kind.Water,
            "Cat-Feine (Classic Coffee)" to Kind.Coffee,
            "Oreo (The Tuxedo Cat)" to Kind.MilkTea,
            "Matcha (The Lucky Green Neko)" to Kind.MilkTea,
            "Soda (Fizzy Felines)" to Kind.Soda,
            "Cat Association" to Kind.Combo,
            "Couple of Cats" to Kind.Combo,
            "Single-Paw-rtner Combos" to Kind.Combo,
            "Take-out Box" to Kind.TakeOut,
        )
        expected.forEach { (name, kind) -> assertEquals(name, kind, MenuPlaceholder.kind(name)) }
    }

    @Test
    fun unknownItemsGetTheGeneralFoodIcon() {
        assertEquals(Kind.Food, MenuPlaceholder.kind("Something New"))
        assertEquals(Kind.Food, MenuPlaceholder.kind(""))
    }
}
