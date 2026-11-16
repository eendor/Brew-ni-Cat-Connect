package com.brewnicat.connect.data

import android.content.Context
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONObject

/*
 * What the app keeps on the phone, in its private storage (backup is off):
 * the cart, the customer's details for next time, and the orders placed from
 * this phone with their tracking tokens. The tracking token is the secret part
 * of an order link, so it never leaves the app except to read that order.
 */
class Store(
    context: Context,
    private val cipher: TokenCipher = KeystoreTokenCipher(),
) {
    private val prefs = context.getSharedPreferences("brew-ni-cat", Context.MODE_PRIVATE)

    fun loadCart(): Cart = runCatching { Cart.fromJson(JSONArray(prefs.getString(CART, "[]"))) }.getOrDefault(Cart())
    fun saveCart(cart: Cart) = prefs.edit { putString(CART, cart.toJson().toString()) }

    fun loadDetails(): Checkout.Details = runCatching {
        val o = JSONObject(prefs.getString(DETAILS, "{}") ?: "{}")
        Checkout.Details(o.optString("name"), o.optString("phone"), "", o.optString("payment", "Cash"))
    }.getOrDefault(Checkout.Details("", "", "", "Cash"))

    fun saveDetails(details: Checkout.Details) = prefs.edit {
        putString(DETAILS, JSONObject().put("name", details.name).put("phone", details.phone).put("payment", details.paymentPreference).toString())
    }

    fun loadOrders(): List<SavedOrder> = runCatching {
        JSONArray(prefs.getString(ORDERS, "[]")).objects().mapNotNull { o ->
            val ref = o.optString("reference")
            val token = o.optString("trackingToken")
            if (Checkout.isOrderReference(ref) && Checkout.isTrackingToken(token)) SavedOrder(ref, token, o.optLong("placedAt")) else null
        }
    }.getOrDefault(emptyList())

    fun saveOrder(order: SavedOrder) {
        val list = listOf(order) + loadOrders().filterNot { it.reference == order.reference }
        val json = JSONArray().apply {
            list.take(MAX_ORDERS).forEach { put(JSONObject().put("reference", it.reference).put("trackingToken", it.trackingToken).put("placedAt", it.placedAt)) }
        }
        prefs.edit { putString(ORDERS, json.toString()) }
    }

    fun loadSession(): AuthSession? {
        val encoded = prefs.getString(AUTH_SESSION, null) ?: return null
        val plain = cipher.decrypt(encoded)
        val parsed = plain?.let { runCatching { AuthSession.fromJson(JSONObject(it)) }.getOrNull() }
        if (parsed == null) prefs.edit { remove(AUTH_SESSION) }
        return parsed
    }

    fun saveSession(session: AuthSession?) = prefs.edit {
        if (session == null) {
            remove(AUTH_SESSION)
        } else {
            val encrypted = cipher.encrypt(session.toJson().toString())
            if (encrypted != null) putString(AUTH_SESSION, encrypted) else remove(AUTH_SESSION)
        }
    }

    fun loadPendingPkceVerifier(): String? = prefs.getString(PENDING_PKCE, null)?.let { cipher.decrypt(it) }

    fun savePendingPkceVerifier(verifier: String?) = prefs.edit {
        if (verifier.isNullOrBlank()) {
            remove(PENDING_PKCE)
        } else {
            val encrypted = cipher.encrypt(verifier)
            if (encrypted != null) putString(PENDING_PKCE, encrypted) else remove(PENDING_PKCE)
        }
    }

    fun loadAdConsent(): Boolean? = when (prefs.getString(AD_CONSENT, null)) {
        "yes" -> true
        "no" -> false
        else -> null
    }

    fun saveAdConsent(consent: Boolean) = prefs.edit {
        putString(AD_CONSENT, if (consent) "yes" else "no")
    }

    private companion object {
        const val CART = "cart"
        const val DETAILS = "details"
        const val ORDERS = "orders"
        const val AUTH_SESSION = "auth_session_v1"
        const val PENDING_PKCE = "pending_pkce_v1"
        const val AD_CONSENT = "ad_consent_v1"
        const val MAX_ORDERS = 30
    }
}
