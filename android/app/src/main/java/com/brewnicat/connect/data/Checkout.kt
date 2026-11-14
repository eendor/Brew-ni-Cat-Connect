package com.brewnicat.connect.data

import java.util.Base64
import java.security.SecureRandom
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

/*
 * Checkout details and the Place order request (src/lib/ordering/validation.ts,
 * src/lib/orders/place-order.ts). The request carries what was picked and the
 * subtotal the customer saw, never a price to charge: the server prices it.
 */

object Checkout {
    const val MAX_NAME_LENGTH = 100
    const val MAX_NOTES_LENGTH = 500
    val PAYMENT_PREFERENCES = listOf("Cash", "GCash")

    const val NAME_REQUIRED = "Please enter your full name."
    const val PHONE_REQUIRED = "Please enter your contact phone number."
    const val PHONE_INVALID =
        "Please enter a valid Philippine mobile number (e.g. 0912 345 6789 or +63 912 345 6789)."

    fun isValidPhone(phone: String): Boolean =
        Regex("^(09\\d{9}|\\+639\\d{9})$").matches(phone.replace(Regex("[\\s\\-()]"), ""))

    fun normalizePhone(phone: String): String {
        val cleaned = phone.replace(Regex("[\\s\\-()]"), "")
        return if (cleaned.startsWith("09") && cleaned.length == 11) {
            "+63" + cleaned.substring(1)
        } else {
            cleaned
        }
    }

    data class Details(val name: String, val phone: String, val notes: String, val paymentPreference: String)

    fun validate(details: Details): Map<String, String> = buildMap {
        when {
            details.name.isBlank() -> put("name", NAME_REQUIRED)
            details.name.trim().length > MAX_NAME_LENGTH ->
                put("name", "Please keep your name to $MAX_NAME_LENGTH characters or fewer.")
        }
        when {
            details.phone.isBlank() -> put("phone", PHONE_REQUIRED)
            !isValidPhone(details.phone) -> put("phone", PHONE_INVALID)
        }
        if (details.notes.length > MAX_NOTES_LENGTH) {
            put("notes", "Please keep your notes to $MAX_NOTES_LENGTH characters or fewer.")
        }
    }

    private val random = SecureRandom()

    fun newIdempotencyKey(): String = UUID.randomUUID().toString()

    /** 32 random bytes as base64url without padding: 43 characters, like the website. */
    fun newTrackingToken(): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun isTrackingToken(value: String?) = value != null && Regex("^[A-Za-z0-9_-]{43}$").matches(value)
    fun isOrderReference(value: String?) =
        value != null && Regex("^BNC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$").matches(value)

    fun request(
        idempotencyKey: String,
        trackingToken: String,
        details: Details,
        cart: Cart,
        expectedSubtotal: Double,
    ): JSONObject = JSONObject()
        .put("idempotencyKey", idempotencyKey)
        .put("trackingToken", trackingToken)
        .put("fulfillment", "pickup")
        .put(
            "customer",
            JSONObject().put("name", details.name.trim()).put("phone", details.phone.trim())
                .put("notes", details.notes.trim()).put("paymentPreference", details.paymentPreference),
        )
        .put("lines", JSONArray().apply {
            cart.lines.forEach { l ->
                put(JSONObject().put("itemId", l.itemId).put("variantId", l.variantId)
                    .put("flavor", l.flavor ?: JSONObject.NULL).put("quantity", l.quantity))
            }
        })
        .put("expectedSubtotal", expectedSubtotal)
}

sealed interface PlaceOrderResult {
    data class Placed(val reference: String, val trackingToken: String, val status: String) : PlaceOrderResult
    data class Failed(
        val reason: String,
        val message: String,
        val fieldErrors: Map<String, String> = emptyMap(),
        val lineIndexes: List<Int> = emptyList(),
        val newSubtotal: Double? = null,
    ) : PlaceOrderResult

    companion object {
        const val SERVER_ERROR = "We couldn't place your order. Please try again."

        /** Reads the website's answer; anything unexpected counts as a server error. */
        fun parse(body: String?, sentToken: String): PlaceOrderResult {
            val json = runCatching { JSONObject(body ?: "") }.getOrNull()
                ?: return Failed("server-error", SERVER_ERROR)
            if (json.optBoolean("ok", false)) {
                val reference = json.optString("reference")
                val token = json.optString("trackingToken")
                if (!Checkout.isOrderReference(reference) || token != sentToken) return Failed("server-error", SERVER_ERROR)
                return Placed(reference, token, json.optString("status", "pending"))
            }
            val reason = json.optString("reason").ifEmpty { "server-error" }
            val message = json.optString("message").ifEmpty { SERVER_ERROR }
            val fields = json.optJSONObject("fieldErrors")?.let { f -> f.keys().asSequence().associateWith { f.optString(it) } } ?: emptyMap()
            val lines = json.optJSONArray("lines")?.objects()?.map { it.optInt("index", -1) }?.filter { it >= 0 } ?: emptyList()
            val subtotal = if (json.has("subtotal")) json.optDouble("subtotal").takeIf { it.isFinite() } else null
            return Failed(reason, message, fields, lines, subtotal)
        }
    }
}
