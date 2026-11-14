package com.brewnicat.connect.data

import org.json.JSONArray
import org.json.JSONObject

/*
 * The cart (src/lib/ordering/cart-reducer.ts). A line keeps the picked item,
 * size, flavor text (with add-ons) and quantity; names and prices are read from
 * the current menu, never typed in, so the cart can't hold a made-up price.
 */

data class CartLine(
    val itemId: String,
    val itemName: String,
    val variantId: String,
    val variantName: String,
    val flavor: String?,
    val unitPrice: Double,
    val quantity: Int,
) {
    val key: String get() = "$itemId::$variantId::${Pricing.normalizeFlavor(flavor) ?: ""}"
    val lineTotal: Double get() = Pricing.lineTotal(unitPrice, quantity)
}

data class Cart(val lines: List<CartLine> = emptyList()) {
    val subtotal: Double get() = Pricing.fromCentavos(lines.sumOf { Pricing.toCentavos(it.unitPrice) * it.quantity })
    val itemCount: Int get() = lines.sumOf { it.quantity }
    val isEmpty: Boolean get() = lines.isEmpty()

    sealed interface AddResult {
        data class Added(val cart: Cart) : AddResult
        data class Failed(val reason: String) : AddResult
    }

    /** Adds a picked item, priced from the menu. The same pick adds to its line. */
    fun add(catalog: MenuCatalog, itemId: String, variantId: String, flavor: String?, quantity: Int): AddResult {
        if (quantity < 1) return AddResult.Failed("invalid-quantity")
        val item = catalog.findItem(itemId) ?: return AddResult.Failed("unknown-item")
        when (item.availability) {
            Availability.UNAVAILABLE -> return AddResult.Failed("item-unavailable")
            Availability.UNKNOWN -> return AddResult.Failed("availability-unknown")
            Availability.AVAILABLE -> Unit
        }
        val variant = item.variants.firstOrNull { it.id == variantId } ?: return AddResult.Failed("unknown-variant")
        val price = Pricing.resolveUnitPrice(item, variant, flavor)
        if (price !is PriceResult.Ok) return AddResult.Failed((price as PriceResult.Failed).reason)
        val line = CartLine(item.id, item.name, variant.id, variant.name, Pricing.normalizeFlavor(flavor), price.unitPrice, quantity)
        val existing = lines.indexOfFirst { it.key == line.key }
        val next = if (existing >= 0) {
            lines.mapIndexed { i, l ->
                if (i == existing) l.copy(quantity = minOf(Pricing.MAX_QUANTITY, l.quantity + quantity), unitPrice = price.unitPrice) else l
            }
        } else {
            lines + line
        }
        return AddResult.Added(Cart(next))
    }

    fun setQuantity(key: String, quantity: Int): Cart =
        if (quantity <= 0) Cart(lines.filterNot { it.key == key })
        else Cart(lines.map { if (it.key == key) it.copy(quantity = minOf(Pricing.MAX_QUANTITY, quantity)) else it })

    /**
     * Reprices every line from a fresh menu. Lines that can't be ordered any more
     * are dropped and named in [Revalidated.removed]; changed prices are named too.
     */
    fun revalidate(catalog: MenuCatalog): Revalidated {
        val removed = mutableListOf<String>()
        val repriced = mutableListOf<String>()
        val kept = lines.mapNotNull { line ->
            when (val r = Cart().add(catalog, line.itemId, line.variantId, line.flavor, line.quantity)) {
                is AddResult.Added -> r.cart.lines.single().also { if (it.unitPrice != line.unitPrice) repriced += line.itemName }
                is AddResult.Failed -> { removed += line.itemName; null }
            }
        }
        return Revalidated(Cart(kept), removed, repriced)
    }

    data class Revalidated(val cart: Cart, val removed: List<String>, val repriced: List<String>)

    fun toJson(): JSONArray = JSONArray().apply {
        lines.forEach { l ->
            put(JSONObject().put("itemId", l.itemId).put("itemName", l.itemName).put("variantId", l.variantId)
                .put("variantName", l.variantName).put("flavor", l.flavor ?: JSONObject.NULL)
                .put("unitPrice", l.unitPrice).put("quantity", l.quantity))
        }
    }

    companion object {
        fun fromJson(json: JSONArray): Cart = Cart(json.objects().mapNotNull { o ->
            runCatching {
                CartLine(o.getString("itemId"), o.getString("itemName"), o.getString("variantId"),
                    o.getString("variantName"), if (o.isNull("flavor")) null else o.getString("flavor"),
                    o.getDouble("unitPrice"), o.getInt("quantity"))
            }.getOrNull()
        })
    }
}
