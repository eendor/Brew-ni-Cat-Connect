package com.brewnicat.connect.data

import java.text.Collator
import java.util.Locale
import kotlin.math.roundToLong

/*
 * Cart prices, worked out the same way as the website
 * (src/lib/ordering/cart-pricing.ts). The server prices every order again from
 * the live menu, so these are what the customer sees before Place order.
 */

/** Like JavaScript's localeCompare, which the website sorts with. */
internal val textOrder: Comparator<String> =
    Collator.getInstance(Locale.ENGLISH).let { c -> Comparator { a, b -> c.compare(a, b) } }

sealed interface PriceResult {
    data class Ok(val unitPrice: Double) : PriceResult
    data class Failed(val reason: String) : PriceResult
}

object Pricing {
    const val FLAVOR_MIX_SEPARATOR = " / "
    const val MAX_MIXED_FLAVORS = 3
    const val MAX_QUANTITY = 99
    private const val ADD_ON_SEPARATOR = " + "
    private const val ADD_ON_PREFIX = "+ "
    private const val ADD_ON_LABEL_SEPARATOR = ", "

    fun toCentavos(pesos: Double): Long = (pesos * 100).roundToLong()
    fun fromCentavos(centavos: Long): Double = centavos / 100.0
    fun normalizePrice(pesos: Double) = fromCentavos(toCentavos(pesos))

    fun normalizeFlavor(flavor: String?): String? = flavor?.trim()?.takeIf { it.isNotEmpty() }

    /** Mixing is offered on fries only (the same rule as the POS, ADR-027). */
    fun allowsFlavorMix(item: MenuItem) =
        Regex("fries", RegexOption.IGNORE_CASE).let { it.containsMatchIn(item.id) || it.containsMatchIn(item.name) }

    data class LineFlavorParts(val flavor: String?, val addOns: List<String>, val hasAddOnPart: Boolean)

    fun splitAddOns(text: String?): LineFlavorParts {
        val trimmed = normalizeFlavor(text) ?: return LineFlavorParts(null, emptyList(), false)
        var before = trimmed
        var rest: String? = null
        if (trimmed.startsWith(ADD_ON_PREFIX)) {
            before = ""
            rest = trimmed.substring(ADD_ON_PREFIX.length)
        } else {
            val at = trimmed.indexOf(ADD_ON_SEPARATOR)
            if (at >= 0) {
                before = trimmed.substring(0, at)
                rest = trimmed.substring(at + ADD_ON_SEPARATOR.length)
            }
        }
        val addOns = rest?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()
        return LineFlavorParts(normalizeFlavor(before), addOns, rest != null)
    }

    /** "Spicy + Egg (Boiled), Hotdog", or "+ Egg (Boiled)" with no flavor: how the POS stores add-ons. */
    fun encodeLineFlavor(flavor: String?, addOns: List<String>): String? {
        val base = normalizeFlavor(flavor)
        if (addOns.isEmpty()) return base
        val labels = addOns.joinToString(ADD_ON_LABEL_SEPARATOR)
        return if (base == null) "$ADD_ON_PREFIX$labels" else "$base$ADD_ON_SEPARATOR$labels"
    }

    fun splitFlavorMix(flavor: String?): List<String> =
        normalizeFlavor(flavor)?.split(FLAVOR_MIX_SEPARATOR)?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()

    fun joinFlavorMix(flavors: List<String>): String? =
        if (flavors.isEmpty()) null else flavors.joinToString(FLAVOR_MIX_SEPARATOR)

    fun isAllowedFlavor(item: MenuItem, flavor: String?): Boolean {
        val parts = splitFlavorMix(flavor)
        return parts.isNotEmpty() &&
            (parts.size == 1 || allowsFlavorMix(item)) &&
            parts.size <= MAX_MIXED_FLAVORS &&
            parts.toSet().size == parts.size &&
            parts.all { it in item.flavors }
    }

    private fun hasPurchasableBasePrice(variant: MenuVariant) =
        variant.basePrice != null && variant.basePrice.isFinite() && toCentavos(variant.basePrice) > 0

    private fun findFlavorPrice(variant: MenuVariant, flavor: String): Double? =
        variant.flavorPrices.firstOrNull { it.flavor == flavor }?.price?.takeIf { it.isFinite() && it >= 0 }

    fun resolveUnitPrice(item: MenuItem, variant: MenuVariant, flavor: String?): PriceResult {
        val parts = splitAddOns(flavor)
        if (!parts.hasAddOnPart) return resolveFlavorPrice(item, variant, parts.flavor)
        val offered = item.addOns.associate { it.label to it.price }
        if (parts.addOns.isEmpty() || parts.addOns.toSet().size != parts.addOns.size || !parts.addOns.all { it in offered }) {
            return PriceResult.Failed("unknown-flavor")
        }
        val base = resolveFlavorPrice(item, variant, parts.flavor)
        if (base !is PriceResult.Ok) return base
        val extras = parts.addOns.sumOf { offered[it] ?: 0.0 }
        return PriceResult.Ok(normalizePrice(base.unitPrice + extras))
    }

    private fun resolveFlavorPrice(item: MenuItem, variant: MenuVariant, flavor: String?): PriceResult {
        val selected = normalizeFlavor(flavor)
        if (selected != null) {
            if (!isAllowedFlavor(item, selected)) return PriceResult.Failed("unknown-flavor")
            val parts = splitFlavorMix(selected)
            if (parts.size > 1) {
                // A mix costs the dearest of its flavors, never less than one alone.
                var highest: Double? = null
                for (part in parts) {
                    val p = findFlavorPrice(variant, part)
                        ?: (if (hasPurchasableBasePrice(variant)) variant.basePrice else null)
                        ?: return PriceResult.Failed("missing-price")
                    highest = maxOf(highest ?: p, p)
                }
                return PriceResult.Ok(normalizePrice(highest ?: 0.0))
            }
            findFlavorPrice(variant, selected)?.let { return PriceResult.Ok(normalizePrice(it)) }
            if (hasPurchasableBasePrice(variant)) return PriceResult.Ok(normalizePrice(variant.basePrice!!))
            return PriceResult.Failed("missing-price")
        }
        if (variant.basePrice == 0.0 && variant.flavorPrices.isNotEmpty()) return PriceResult.Failed("missing-price")
        if (hasPurchasableBasePrice(variant)) return PriceResult.Ok(normalizePrice(variant.basePrice!!))
        return PriceResult.Failed("missing-price")
    }

    /** Whether this size needs a flavor picked before it has a price. */
    fun needsFlavor(item: MenuItem, variant: MenuVariant): Boolean =
        item.flavors.isNotEmpty() && resolveFlavorPrice(item, variant, null) !is PriceResult.Ok

    /** The lowest price on the item, for "From ₱49". */
    fun fromPrice(item: MenuItem): Double? = item.variants.flatMap { v ->
        listOfNotNull(v.basePrice?.takeIf { toCentavos(it) > 0 }) +
            item.flavors.mapNotNull { f -> (resolveFlavorPrice(item, v, f) as? PriceResult.Ok)?.unitPrice }
    }.minOrNull()

    fun lineTotal(unitPrice: Double, quantity: Int) = fromCentavos(toCentavos(unitPrice) * quantity)

    fun formatPeso(pesos: Double): String {
        val centavos = toCentavos(pesos)
        val whole = centavos / 100
        val cents = centavos % 100
        val grouped = "%,d".format(Locale.US, whole)
        return if (cents == 0L) "₱$grouped" else "₱$grouped.%02d".format(Locale.US, cents)
    }
}
