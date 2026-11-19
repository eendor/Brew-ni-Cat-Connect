package com.brewnicat.connect.data

import org.json.JSONObject
import java.math.BigDecimal
import java.math.RoundingMode

/*
 * Coins replace loyalty points (FR-124, decided with the owner 2026-11-19).
 * Amounts keep one decimal place: orders earn 1 coin per ₱50 counted to 0.1,
 * and a game play earns 0.1 or 0.2. Sums of doubles drift (0.1 + 0.2 is
 * 0.30000000000000004), so every amount is rounded to 0.1 before it is shown.
 */
object Coins {
    fun round(coins: Double): Double =
        if (!coins.isFinite()) 0.0 else BigDecimal.valueOf(coins).setScale(1, RoundingMode.HALF_UP).toDouble()

    /** "12", "2.5", "0.3": no trailing ".0". */
    fun amount(coins: Double): String {
        val r = round(coins)
        return if (r == kotlin.math.floor(r)) r.toLong().toString() else r.toString()
    }

    /** "1 coin", "2.5 coins", "0.1 coins". */
    fun label(coins: Double): String {
        val r = round(coins)
        return "${amount(r)} ${if (r == 1.0) "coin" else "coins"}"
    }

    /** "+2.5", "−0.1" (minus sign), "0". */
    fun delta(coins: Double): String {
        val r = round(coins)
        return when {
            r > 0 -> "+${amount(r)}"
            r < 0 -> "−${amount(-r)}"
            else -> "0"
        }
    }

    /** A coin amount from JSON, or [default] when it is missing, null or not a number. */
    fun read(json: JSONObject, key: String, default: Double = 0.0): Double =
        if (json.isNull(key)) default else json.optDouble(key, default).takeIf { it.isFinite() }?.let(::round) ?: default

    /** A coin amount from JSON, or null when it is missing or null. */
    fun readOrNull(json: JSONObject, key: String): Double? =
        if (json.isNull(key)) null else json.optDouble(key).takeIf { it.isFinite() }?.let(::round)
}
