package com.brewnicat.connect.data

/*
 * Reorder logic matching src/lib/orders/reorder.ts (FR-041).
 * Validates every past line item against the live menu catalog and adds
 * available items to the cart at current prices while listing any
 * unavailable lines or price updates.
 */

data class ReorderResult(
    val cart: Cart,
    val addedQuantity: Int,
    val unavailableNotices: List<String>,
    val priceChangeNotices: List<String>,
) {
    val allNotices: List<String> get() = unavailableNotices + priceChangeNotices
    val summaryMessage: String?
        get() = if (addedQuantity > 0) {
            "Added $addedQuantity item${if (addedQuantity == 1) "" else "s"} to your cart."
        } else {
            null
        }
}

object Reorder {
    fun reorder(
        items: List<OrderHistoryItem>,
        catalog: MenuCatalog,
        startingCart: Cart,
    ): ReorderResult {
        var cart = startingCart
        var addedQuantity = 0
        val unavailable = mutableListOf<String>()
        val priceChanges = mutableListOf<String>()

        for (line in items) {
            val catalogItem = catalog.findItem(line.itemId)
            if (catalogItem == null) {
                unavailable += "${line.itemName} (${line.variantName}) is no longer on the menu."
                continue
            }
            if (catalogItem.availability != Availability.AVAILABLE) {
                unavailable += "${line.itemName} is currently marked unavailable."
                continue
            }
            val variant = catalogItem.variants.firstOrNull { it.id == line.variantId }
            if (variant == null) {
                unavailable += "${line.itemName} (${line.variantName}) option is no longer available."
                continue
            }
            val priceResult = Pricing.resolveUnitPrice(catalogItem, variant, line.flavor)
            if (priceResult !is PriceResult.Ok) {
                val detail = line.flavor?.let { " ($it)" }.orEmpty()
                unavailable += "${line.itemName} (${line.variantName}$detail) cannot be priced right now."
                continue
            }

            if (Pricing.toCentavos(priceResult.unitPrice) != Pricing.toCentavos(line.unitPrice)) {
                priceChanges += "Price for ${line.itemName} (${line.variantName}) changed from ${Pricing.formatPeso(line.unitPrice)} to ${Pricing.formatPeso(priceResult.unitPrice)}."
            }

            when (val addResult = cart.add(catalog, catalogItem.id, variant.id, line.flavor, line.quantity)) {
                is Cart.AddResult.Added -> {
                    cart = addResult.cart
                    addedQuantity += line.quantity
                }
                is Cart.AddResult.Failed -> {
                    unavailable += "${line.itemName} (${line.variantName}): ${addResult.reason}"
                }
            }
        }

        return ReorderResult(
            cart = cart,
            addedQuantity = addedQuantity,
            unavailableNotices = unavailable,
            priceChangeNotices = priceChanges,
        )
    }
}
