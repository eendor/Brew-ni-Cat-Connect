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
class Store(context: Context) {
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

    private companion object {
        const val CART = "cart"
        const val DETAILS = "details"
        const val ORDERS = "orders"
        const val MAX_ORDERS = 30
    }
}
