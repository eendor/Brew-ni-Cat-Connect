package com.brewnicat.connect.data

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/*
 * Talks to the same backend as the website, with the same public key and the
 * same row-level security:
 *  - Supabase REST for the menu, opening hours and reading an order
 *    (get_online_order checks the reference and tracking token);
 *  - the website's POST /api/orders for Place order, so the app gets the same
 *    rate limit, opening-hours check and pricing as the website.
 * Nothing here can do more than a browser on the website can.
 */

class ApiException(message: String) : IOException(message)

class Api(
    private val supabaseUrl: String,
    private val publishableKey: String,
    private val siteUrl: String,
    private val http: OkHttpClient = defaultClient(),
) {
    val isConfigured: Boolean get() = supabaseUrl.toHttpUrlOrNull() != null && publishableKey.isNotBlank()

    private fun rest(path: String): Request.Builder {
        if (!isConfigured) throw ApiException("not-configured")
        return Request.Builder()
            .url(supabaseUrl.trimEnd('/') + "/rest/v1/" + path)
            .header("apikey", publishableKey)
            .header("Authorization", "Bearer $publishableKey")
            .header("Accept", "application/json")
    }

    private suspend fun call(request: Request): String = withContext(Dispatchers.IO) {
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw ApiException("http-${response.code}")
            body
        }
    }

    suspend fun fetchMenu(): MenuCatalog {
        val categories = JSONArray(call(rest("categories?select=id,name&order=name.asc").get().build()))
        val items = JSONArray(call(rest("items?select=id,category_id,name,flavors,variants_json,is_available&order=name.asc").get().build()))
        // Add-ons are extras: the menu still shows without them.
        val addOns = runCatching {
            JSONArray(call(rest("menu_add_ons?select=id,category_id,label,price,sort_order&is_available=eq.true").get().build()))
        }.getOrElse { JSONArray() }
        return MenuMapper.map(categories, items, addOns)
    }

    suspend fun fetchShopHours(): ShopHours? {
        val rows = JSONArray(call(rest("site_content?select=section,content,updated_at&section=in.(hours,closure)").get().build())).objects()
        val hours = rows.firstOrNull { it.optString("section") == "hours" }
        val closure = rows.firstOrNull { it.optString("section") == "closure" }
        return ShopHours.fromSiteContent(
            hours?.optJSONObject("content"),
            closure?.optJSONObject("content"),
            closure?.optString("updated_at")?.ifBlank { null },
        )
    }

    /** The order, or null when no order matches this reference and token. */
    suspend fun fetchOrder(reference: String, trackingToken: String): OrderView? {
        val body = JSONObject().put("p_reference", reference).put("p_tracking_token", trackingToken)
        val text = call(rest("rpc/get_online_order").post(body.toString().toRequestBody(JSON)).build())
        if (text.isBlank() || text == "null") return null
        return OrderView.parse(JSONObject(text)) ?: throw ApiException("unexpected-order")
    }

    /** Place order through the website. Network trouble comes back as a server error to retry. */
    suspend fun placeOrder(request: JSONObject): PlaceOrderResult = withContext(Dispatchers.IO) {
        val sent = request.optString("trackingToken")
        try {
            val call = Request.Builder()
                .url(siteUrl.trimEnd('/') + "/api/orders")
                .header("Accept", "application/json")
                .post(request.toString().toRequestBody(JSON))
                .build()
            http.newCall(call).execute().use { PlaceOrderResult.parse(it.body?.string(), sent) }
        } catch (_: IOException) {
            PlaceOrderResult.Failed("server-error", PlaceOrderResult.SERVER_ERROR)
        }
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()

        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .callTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
