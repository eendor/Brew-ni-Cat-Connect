package com.brewnicat.connect.data

/*
 * Which icon stands in for a menu item that has no photo yet. Matched on the
 * item's name (and its nickname in brackets), so it works in the cart too.
 */
object MenuPlaceholder {
    enum class Kind { Noodles, Fries, Nachos, CatTreats, Water, Soda, Coffee, MilkTea, Combo, TakeOut, Food }

    private val rules: List<Pair<Kind, List<String>>> = listOf(
        Kind.CatTreats to listOf("cat treat"),
        Kind.TakeOut to listOf("take-out", "takeout", "take out", "box"),
        Kind.Combo to listOf("combo", "package", "bundle", "couple of cats", "association", "partner"),
        Kind.Noodles to listOf("buldak", "sedaap", "noodle", "ramen", "pancit"),
        Kind.Fries to listOf("fries", "cat claws"),
        Kind.Nachos to listOf("nachos", "litter crisps"),
        Kind.Water to listOf("water"),
        Kind.Soda to listOf("soda", "fizzy"),
        Kind.Coffee to listOf("coffee", "cat-feine", "latte", "espresso", "americano", "mocha"),
        Kind.MilkTea to listOf("matcha", "oreo", "tuxedo", "milk tea", "frappe", "tea"),
    )

    fun kind(itemName: String): Kind {
        val name = itemName.lowercase()
        return rules.firstOrNull { (_, words) -> words.any { it in name } }?.first ?: Kind.Food
    }
}
