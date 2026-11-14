package com.brewnicat.connect.data

import java.io.IOException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
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

class ApiException(
    message: String,
    val statusCode: Int = 0,
    val responseBody: String = "",
) : IOException(message)
class ApiAuthException(message: String = "http-401") : IOException(message)

private data class ApiResponse(val body: String, val contentRange: String?)

class Api(
    private val supabaseUrl: String,
    private val publishableKey: String,
    private val siteUrl: String,
    private val http: OkHttpClient = defaultClient(),
) {
    val isConfigured: Boolean get() = supabaseUrl.toHttpUrlOrNull() != null && publishableKey.isNotBlank()

    private fun baseUrl(): String {
        if (!isConfigured) throw ApiException("not-configured")
        return supabaseUrl.trimEnd('/')
    }

    private fun rest(path: String, accessToken: String? = null): Request.Builder =
        Request.Builder()
            .url(baseUrl() + "/rest/v1/" + path)
            .header("apikey", publishableKey)
            .header("Authorization", "Bearer ${accessToken ?: publishableKey}")
            .header("Accept", "application/json")

    private fun authReq(path: String, accessToken: String? = null): Request.Builder =
        Request.Builder()
            .url(baseUrl() + "/auth/v1/" + path)
            .header("apikey", publishableKey)
            .header("Accept", "application/json")
            .apply {
                if (!accessToken.isNullOrBlank()) header("Authorization", "Bearer $accessToken")
            }

    private suspend fun callRaw(request: Request): ApiResponse = withContext(Dispatchers.IO) {
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (response.code == 401) throw ApiAuthException("http-401")
            if (!response.isSuccessful) throw ApiException("http-${response.code}", response.code, body)
            ApiResponse(body, response.header("Content-Range"))
        }
    }

    private suspend fun call(request: Request): String = callRaw(request).body

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

    /** The order, or null when no order matches this reference/token or signed-in owner. */
    suspend fun fetchOrder(
        reference: String,
        trackingToken: String?,
        accessToken: String? = null,
    ): OrderView? {
        val body = JSONObject()
            .put("p_reference", reference)
            .put("p_tracking_token", trackingToken?.takeIf { it.isNotBlank() } ?: JSONObject.NULL)
        val text = call(rest("rpc/get_online_order", accessToken).post(body.toString().toRequestBody(JSON)).build())
        if (text.isBlank() || text == "null") return null
        return OrderView.parse(JSONObject(text)) ?: throw ApiException("unexpected-order")
    }

    /** Place order through the website. Passes bearer token when signed in so the order links to the customer. */
    suspend fun placeOrder(
        request: JSONObject,
        accessToken: String? = null,
    ): PlaceOrderResult = withContext(Dispatchers.IO) {
        val sent = request.optString("trackingToken")
        try {
            val builder = Request.Builder()
                .url(siteUrl.trimEnd('/') + "/api/orders")
                .header("Accept", "application/json")
                .post(request.toString().toRequestBody(JSON))
            if (!accessToken.isNullOrBlank()) builder.header("Authorization", "Bearer $accessToken")
            http.newCall(builder.build()).execute().use { response ->
                val raw = response.body?.string()
                if (response.code == 401 && !accessToken.isNullOrBlank()) throw ApiAuthException("session-expired")
                PlaceOrderResult.parse(raw, sent)
            }
        } catch (e: ApiAuthException) {
            throw e
        } catch (_: IOException) {
            PlaceOrderResult.Failed("server-error", PlaceOrderResult.SERVER_ERROR)
        }
    }

    // --- Auth (Supabase PKCE & session lifecycle) ---

    suspend fun exchangePkceCode(authCode: String, codeVerifier: String): AuthSession {
        val body = JSONObject()
            .put("auth_code", authCode)
            .put("code_verifier", codeVerifier)
        val req = authReq("token?grant_type=pkce").post(body.toString().toRequestBody(JSON)).build()
        val json = callJsonAuth(req)
        return AuthSession.fromSupabaseTokenResponse(json) ?: throw ApiException("unexpected-auth-response")
    }

    suspend fun refreshSession(refreshToken: String): AuthSession {
        val body = JSONObject().put("refresh_token", refreshToken)
        val req = authReq("token?grant_type=refresh_token").post(body.toString().toRequestBody(JSON)).build()
        val json = callJsonAuth(req, isRefresh = true)
        return AuthSession.fromSupabaseTokenResponse(json) ?: throw ApiException("unexpected-auth-response")
    }

    suspend fun signOut(accessToken: String) = withContext(Dispatchers.IO) {
        if (!isConfigured || accessToken.isBlank()) return@withContext
        runCatching {
            val req = authReq("logout", accessToken)
                .post("{}".toRequestBody(JSON))
                .build()
            http.newCall(req).execute().close()
        }
    }

    private suspend fun callJsonAuth(request: Request, isRefresh: Boolean = false): JSONObject =
        withContext(Dispatchers.IO) {
            http.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (isRefresh && response.code in listOf(400, 401)) throw ApiAuthException("refresh-${response.code}")
                if (!response.isSuccessful) throw ApiException("auth-http-${response.code}")
                JSONObject(text)
            }
        }

    // --- Customer account ---

    suspend fun fetchProfile(userId: String, accessToken: String): CustomerProfile? {
        val rows = JSONArray(
            call(
                rest("customer_profiles?user_id=eq.${enc(userId)}&select=user_id,full_name,phone,created_at,updated_at", accessToken)
                    .get()
                    .build(),
            ),
        ).objects()
        return rows.firstOrNull()?.let(AccountParsers::parseProfile)
    }

    suspend fun saveProfile(
        userId: String,
        fullName: String,
        phone: String,
        accessToken: String,
    ): CustomerProfile {
        val payload = JSONObject()
            .put("user_id", userId)
            .put("full_name", fullName)
            .put("phone", phone)
        val req = rest("customer_profiles?on_conflict=user_id&select=user_id,full_name,phone,created_at,updated_at", accessToken)
            .header("Prefer", "resolution=merge-duplicates,return=representation")
            .post(payload.toString().toRequestBody(JSON))
            .build()
        val rows = JSONArray(call(req)).objects()
        return rows.firstOrNull()?.let(AccountParsers::parseProfile) ?: throw ApiException("unexpected-profile")
    }

    suspend fun fetchOrderHistory(
        userId: String,
        accessToken: String,
        page: Int = 1,
        pageSize: Int = 10,
    ): OrderHistoryPage {
        val safePage = page.coerceAtLeast(1)
        val safeSize = pageSize.coerceAtLeast(1)
        val offset = (safePage - 1) * safeSize
        val select = "id,reference,status,fulfillment,customer_name,payment_preference,notes,subtotal,item_count,rejection_reason,created_at," +
            "items:online_order_items(line_number,item_id,item_name,variant_id,variant_name,flavor,unit_price,quantity,line_total)"
        val path = "online_orders?customer_id=eq.${enc(userId)}&select=${enc(select)}&order=created_at.desc&limit=$safeSize&offset=$offset"
        val res = callRaw(
            rest(path, accessToken)
                .header("Prefer", "count=exact")
                .get()
                .build(),
        )
        return AccountParsers.parseOrderHistoryPage(
            rows = JSONArray(res.body),
            totalCountHeader = AccountParsers.parseContentRangeTotal(res.contentRange),
            page = safePage,
            pageSize = safeSize,
        )
    }

    suspend fun fetchFavorites(userId: String, accessToken: String): List<FavoriteEntry> =
        AccountParsers.parseFavorites(
            JSONArray(
                call(
                    rest("favorites?customer_id=eq.${enc(userId)}&select=item_id,created_at&order=created_at.desc", accessToken)
                        .get()
                        .build(),
                ),
            ),
        )

    suspend fun addFavorite(userId: String, itemId: String, accessToken: String) {
        val payload = JSONObject().put("customer_id", userId).put("item_id", itemId)
        val req = rest("favorites?on_conflict=customer_id,item_id", accessToken)
            .header("Prefer", "resolution=ignore-duplicates,return=minimal")
            .post(payload.toString().toRequestBody(JSON))
            .build()
        call(req)
    }

    suspend fun removeFavorite(userId: String, itemId: String, accessToken: String) {
        call(
            rest("favorites?customer_id=eq.${enc(userId)}&item_id=eq.${enc(itemId)}", accessToken)
                .delete()
                .build(),
        )
    }

    suspend fun fetchLoyaltyBalance(userId: String, accessToken: String): Int {
        val rows = JSONArray(
            call(rest("loyalty_transactions?customer_id=eq.${enc(userId)}&select=points", accessToken).get().build()),
        ).objects()
        return rows.sumOf { it.optInt("points", 0) }
    }

    suspend fun fetchLoyaltyHistory(userId: String, accessToken: String): List<LoyaltyTransaction> =
        AccountParsers.parseLoyaltyHistory(
            JSONArray(
                call(
                    rest(
                        "loyalty_transactions?customer_id=eq.${enc(userId)}&select=id,customer_id,points,reason,order_id,note,created_at,online_orders(reference)&order=created_at.desc",
                        accessToken,
                    )
                        .get()
                        .build(),
                ),
            ),
        )

    suspend fun fetchLoyaltyRewards(accessToken: String? = null): List<RewardItem> =
        AccountParsers.parseRewards(
            JSONArray(call(rest("rpc/loyalty_rewards", accessToken).post("{}".toRequestBody(JSON)).build())),
        )

    suspend fun fetchLoyaltySettings(accessToken: String? = null): LoyaltySettings =
        AccountParsers.parseLoyaltySettings(
            JSONObject(call(rest("rpc/loyalty_settings", accessToken).post("{}".toRequestBody(JSON)).build())),
        )

    suspend fun redeemReward(rewardId: String, accessToken: String): RedeemResult {
        val body = JSONObject().put("p_reward_id", rewardId)
        val text = call(rest("rpc/redeem_reward", accessToken).post(body.toString().toRequestBody(JSON)).build())
        return AccountParsers.parseRedeemResult(JSONObject(text))
    }

    // --- Reviews & Data requests ---

    suspend fun fetchReviews(page: Int = 0, pageSize: Int = 10): ReviewsPage {
        val safePage = page.coerceAtLeast(0)
        val safeSize = pageSize.coerceAtLeast(1)
        val offset = safePage * safeSize
        val pageRes = callRaw(
            rest("reviews?hidden=eq.false&select=id,display_name,rating,body,hidden,created_at,updated_at&order=created_at.desc&limit=$safeSize&offset=$offset")
                .header("Prefer", "count=exact")
                .get()
                .build(),
        )
        val items = JSONArray(pageRes.body).objects().mapNotNull(AccountParsers::parseReview)
        val allRatings = JSONArray(
            call(rest("reviews?hidden=eq.false&select=rating").get().build()),
        )
        val total = AccountParsers.parseContentRangeTotal(pageRes.contentRange) ?: allRatings.length()
        return ReviewsPage(
            reviews = items,
            totalCount = total,
            averageRating = AccountParsers.averageRating(allRatings),
        )
    }

    suspend fun fetchMyReview(accessToken: String): ReviewItem? {
        val text = call(rest("rpc/my_review", accessToken).post("{}".toRequestBody(JSON)).build()).trim()
        if (text.isBlank() || text == "null") return null
        return AccountParsers.parseReview(JSONObject(text))
    }

    suspend fun postReview(
        rating: Int,
        body: String,
        accessToken: String? = null,
    ): PostReviewResult = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject().put("rating", rating).put("body", body)
            val builder = Request.Builder()
                .url(siteUrl.trimEnd('/') + "/api/reviews")
                .header("Accept", "application/json")
                .post(payload.toString().toRequestBody(JSON))
            if (!accessToken.isNullOrBlank()) builder.header("Authorization", "Bearer $accessToken")
            http.newCall(builder.build()).execute().use { response ->
                val text = response.body?.string()
                if (response.code == 401 && !accessToken.isNullOrBlank()) throw ApiAuthException("session-expired")
                AccountParsers.parsePostReviewResult(text)
            }
        } catch (e: ApiAuthException) {
            throw e
        } catch (_: IOException) {
            PostReviewResult.Failure("network-error", "We couldn't submit your review. Please check your connection and try again.")
        }
    }

    suspend fun fetchDataRequests(userId: String, accessToken: String): List<DataRequestEntry> =
        AccountParsers.parseDataRequests(
            JSONArray(
                call(
                    rest("data_requests?customer_id=eq.${enc(userId)}&select=id,kind,message,status,created_at&order=created_at.desc", accessToken)
                        .get()
                        .build(),
                ),
            ),
        )

    suspend fun submitDataRequest(kind: String, message: String, accessToken: String) {
        val payload = JSONObject().put("kind", kind).put("message", message.trim())
        val req = rest("data_requests", accessToken)
            .header("Prefer", "return=minimal")
            .post(payload.toString().toRequestBody(JSON))
            .build()
        call(req)
    }

    // --- Mini-games (Phase 3) ---

    suspend fun fetchMiniGameStatus(accessToken: String? = null): MiniGameStatus? = try {
        val text = call(rest("rpc/mini_game_status", accessToken).post("{}".toRequestBody(JSON)).build())
        GamesParsers.parseStatus(JSONObject(text))
    } catch (e: ApiException) {
        if (GamesParsers.isMissingFunctionError(e.statusCode, e.responseBody)) null else throw e
    }

    suspend fun playMiniGame(game: String, choice: Int?, accessToken: String): PlayMiniGameResult = try {
        val payload = JSONObject()
            .put("p_game", game)
            .put("p_choice", choice ?: JSONObject.NULL)
        val text = call(rest("rpc/play_mini_game", accessToken).post(payload.toString().toRequestBody(JSON)).build())
        GamesParsers.parsePlayResult(JSONObject(text))
    } catch (e: ApiException) {
        if (GamesParsers.isMissingFunctionError(e.statusCode, e.responseBody)) {
            PlayMiniGameResult.Failure("unavailable", GamesParsers.errorMessage("unavailable"))
        } else {
            PlayMiniGameResult.Failure("failed", GamesParsers.errorMessage("failed"))
        }
    }

    private fun enc(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name())

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()

        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .callTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
