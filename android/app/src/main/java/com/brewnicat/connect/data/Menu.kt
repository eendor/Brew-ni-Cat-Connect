package com.brewnicat.connect.data

import org.json.JSONArray
import org.json.JSONObject

/*
 * The menu as the website shows it (src/lib/menu/map-menu-catalog.ts and
 * src/types/menu.ts). Supabase's categories, items and menu_add_ons rows are
 * turned into the same catalog, with the same clean-up, ordering and shop-only
 * filter, so the app lists exactly what the website lists.
 */

enum class Availability { AVAILABLE, UNAVAILABLE, UNKNOWN }

data class FlavorPrice(val flavor: String, val price: Double)

data class MenuVariant(
    val id: String,
    val name: String,
    val basePrice: Double?,
    val flavorPrices: List<FlavorPrice>,
    val description: String?,
)

data class MenuAddOn(val id: String, val label: String, val price: Double)

data class MenuItem(
    val id: String,
    val name: String,
    val availability: Availability,
    val flavors: List<String>,
    val variants: List<MenuVariant>,
    val addOns: List<MenuAddOn> = emptyList(),
)

data class MenuCategory(val id: String, val name: String, val items: List<MenuItem>)

data class MenuCatalog(val categories: List<MenuCategory>) {
    fun findItem(itemId: String): MenuItem? =
        categories.firstNotNullOfOrNull { c -> c.items.firstOrNull { it.id == itemId } }

    fun categoryOf(itemId: String): MenuCategory? =
        categories.firstOrNull { c -> c.items.any { it.id == itemId } }
}

object MenuMapper {
    private val shopOnlyNames = setOf("takeoutbox", "cattreats", "bottledwater")

    /** The Take-out Box, Cat Treats and Bottled Water are sold only at the shop. */
    fun isShopOnlyName(name: String): Boolean =
        name.lowercase().replace(Regex("[^a-z]"), "") in shopOnlyNames

    fun isCatTreatsCategory(name: String) = name.trim().lowercase() == "cat treats"

    fun websiteMenu(catalog: MenuCatalog) = MenuCatalog(
        catalog.categories
            .filterNot { isShopOnlyName(it.name) }
            .map { c -> c.copy(items = c.items.filterNot { isShopOnlyName(it.name) }) },
    )

    internal fun cleanText(value: Any?): String? =
        (value as? String)?.trim()?.takeIf { it.isNotEmpty() }

    internal fun cleanPrice(value: Any?): Double? {
        val price = when (value) {
            is Number -> value.toDouble()
            is String -> value.trim().toDoubleOrNull()
            else -> null
        }
        return price?.takeIf { it.isFinite() && it >= 0 }
    }

    private fun variantSource(value: Any?): JSONArray = when (value) {
        is JSONArray -> value
        is String -> runCatching { JSONArray(value) }.getOrElse { JSONArray() }
        else -> JSONArray()
    }

    private fun flavorPrices(value: Any?): List<FlavorPrice> {
        val obj = value as? JSONObject ?: return emptyList()
        return obj.keys().asSequence().mapNotNull { key ->
            val name = cleanText(key)
            val price = cleanPrice(obj.opt(key))
            if (name == null || price == null) null else FlavorPrice(name, price)
        }.sortedWith { a, b -> textOrder.compare(a.flavor, b.flavor) }.toList()
    }

    private fun variants(value: Any?, itemId: String): List<MenuVariant> {
        val source = variantSource(value)
        return (0 until source.length()).mapNotNull { index ->
            val raw = source.opt(index) as? JSONObject ?: return@mapNotNull null
            val name = cleanText(raw.opt("name")) ?: return@mapNotNull null
            MenuVariant(
                id = cleanText(raw.opt("id")) ?: "$itemId-variant-${index + 1}",
                name = name,
                basePrice = cleanPrice(raw.opt("basePrice")),
                flavorPrices = flavorPrices(raw.opt("priceByFlavor")),
                description = cleanText(raw.opt("description")),
            )
        }
    }

    private fun nullable(row: JSONObject, key: String): Any? =
        if (row.isNull(key)) null else row.opt(key)

    private fun item(row: JSONObject): MenuItem? {
        val id = cleanText(nullable(row, "id")) ?: return null
        val name = cleanText(nullable(row, "name")) ?: return null
        val flavors = ((nullable(row, "flavors") as? String) ?: "")
            .split("|").map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        val availability = when (nullable(row, "is_available")) {
            true -> Availability.AVAILABLE
            false -> Availability.UNAVAILABLE
            else -> Availability.UNKNOWN
        }
        return MenuItem(id, name, availability, flavors, variants(nullable(row, "variants_json"), id))
    }

    private fun addOns(rows: JSONArray, categoryId: String): List<MenuAddOn> =
        rows.objects()
            .filter { nullable(it, "category_id") == categoryId }
            .mapNotNull { row ->
                val label = cleanText(nullable(row, "label")) ?: return@mapNotNull null
                val price = (nullable(row, "price") as? Number)?.toDouble()
                    ?.takeIf { it.isFinite() && it >= 0 } ?: return@mapNotNull null
                val sort = (nullable(row, "sort_order") as? Number)?.toInt() ?: 0
                Triple(sort, label, MenuAddOn(row.optString("id"), label, price))
            }
            .sortedWith(compareBy<Triple<Int, String, MenuAddOn>> { it.first }.thenComparator { a, b -> textOrder.compare(a.second, b.second) })
            .map { it.third }

    /** What the app shows: mapAll, then websiteMenu. */
    fun map(categories: JSONArray, items: JSONArray, addOnRows: JSONArray = JSONArray()): MenuCatalog =
        websiteMenu(mapAll(categories, items, addOnRows))

    /** Same as mapMenuCatalog on the website, before the shop-only filter. */
    fun mapAll(categories: JSONArray, items: JSONArray, addOnRows: JSONArray = JSONArray()): MenuCatalog {
        val itemRows = items.objects()
        val mapped = categories.objects().mapNotNull { category ->
            val id = category.optString("id")
            val name = cleanText(nullable(category, "name")) ?: return@mapNotNull null
            val extras = addOns(addOnRows, id)
            val list = itemRows
                .filter { nullable(it, "category_id") == id }
                .mapNotNull(::item)
                .map { if (extras.isNotEmpty()) it.copy(addOns = extras) else it }
                .sortedWith { a, b -> textOrder.compare(a.name, b.name) }
            MenuCategory(id, name, list)
        }.sortedWith { a, b ->
            val ca = isCatTreatsCategory(a.name)
            val cb = isCatTreatsCategory(b.name)
            if (ca != cb) (if (ca) 1 else -1) else textOrder.compare(a.name, b.name)
        }
        return MenuCatalog(mapped)
    }
}

internal fun JSONArray.objects(): List<JSONObject> =
    (0 until length()).mapNotNull { optJSONObject(it) }
