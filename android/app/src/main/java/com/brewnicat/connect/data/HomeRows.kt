package com.brewnicat.connect.data

/*
 * The owner's foodpanda-style home screen: one swipe row per menu category,
 * each product with its photo, its flavors and its lowest price.
 */

data class HomeProduct(
    val item: MenuItem,
    /** "Dirty Neko, Vanilla Matcha Meow" or the sizes when there are no flavors; null when there is neither. */
    val flavors: String?,
    val fromPrice: Double?,
    val soldOut: Boolean,
)

data class HomeRow(val categoryId: String, val title: String, val products: List<HomeProduct>)

object HomeRows {
    fun build(catalog: MenuCatalog): List<HomeRow> = catalog.categories.mapNotNull { category ->
        val products = category.items.map { item ->
            HomeProduct(
                item = item,
                flavors = flavorsLabel(item),
                fromPrice = Pricing.fromPrice(item),
                soldOut = item.availability == Availability.UNAVAILABLE,
            )
        }
        if (products.isEmpty()) null else HomeRow(category.id, category.name, products)
    }

    fun flavorsLabel(item: MenuItem): String? {
        val flavors = item.flavors.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        if (flavors.isNotEmpty()) return flavors.joinToString(", ")
        val sizes = item.variants.map { it.name.trim() }.filter { it.isNotEmpty() }.distinct()
        return if (sizes.size > 1) sizes.joinToString(" · ") else null
    }

    /** The label on the coins chip at the top of the home screen (FR-124). */
    /** The short text in the coins pill at the top of Home: "25", "2.5", or "Earn" when signed out. */
    fun coinsPill(signedIn: Boolean, balance: Double?): String = when {
        !signedIn -> "Earn"
        balance == null -> "Coins"
        else -> Coins.amount(balance)
    }

    /** What a screen reader says for the coins pill. */
    fun pointsLabel(signedIn: Boolean, balance: Double?): String = when {
        !signedIn -> "Sign in to earn coins"
        balance == null -> "Your coins"
        else -> Coins.label(balance)
    }
}
