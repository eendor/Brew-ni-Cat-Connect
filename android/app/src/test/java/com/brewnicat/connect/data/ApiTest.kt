package com.brewnicat.connect.data

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ApiTest {
    private lateinit var server: MockWebServer
    private lateinit var api: Api

    @Before fun start() {
        server = MockWebServer()
        server.start()
        val base = server.url("/").toString().trimEnd('/')
        api = Api(base, "test-publishable-key", base)
    }

    @After fun stop() {
        server.shutdown()
    }

    @Test fun fetchesMenuEvenWhenAddOnsFail() = runTest {
        server.enqueue(MockResponse().setBody(Fixtures.categories.toString()))
        server.enqueue(MockResponse().setBody(Fixtures.items.toString()))
        server.enqueue(MockResponse().setResponseCode(500))

        val catalog = api.fetchMenu()
        assertEquals(listOf("Buldak & Sedaap", "Cat-Tastic Bites"), catalog.categories.map { it.name })
        assertTrue(catalog.findItem("i-sedaap")!!.addOns.isEmpty())
    }

    @Test fun placesOrderAndReturnsPlacedOrRetryableFailure() = runTest {
        val token = Checkout.newTrackingToken()
        server.enqueue(
            MockResponse().setResponseCode(201).setBody(
                """{"ok":true,"reference":"BNC-45W4QJ","trackingToken":"$token","status":"pending"}""",
            ),
        )
        val cart = (Cart().add(Fixtures.catalog, "i-carbo", "v-plain", null, 1) as Cart.AddResult.Added).cart
        val req = Checkout.request("key-1", token, Checkout.Details("Juan", "09123456789", "", "Cash"), cart, cart.subtotal)
        val placed = api.placeOrder(req)
        assertEquals(PlaceOrderResult.Placed("BNC-45W4QJ", token, "pending"), placed)

        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("/api/orders", recorded.path)

        server.shutdown()
        val offline = api.placeOrder(req) as PlaceOrderResult.Failed
        assertEquals("server-error", offline.reason)
    }

    @Test fun fetchesOrderFromRpc() = runTest {
        server.enqueue(MockResponse().setBody("null"))
        assertNull(api.fetchOrder("BNC-45W4QJ", Checkout.newTrackingToken()))

        server.enqueue(
            MockResponse().setBody(
                """{"reference":"BNC-45W4QJ","status":"preparing","items":[],"subtotal":119,"itemCount":1}""",
            ),
        )
        val order = api.fetchOrder("BNC-45W4QJ", Checkout.newTrackingToken())!!
        assertEquals("preparing", order.status)
        val recorded = server.takeRequest()
        assertEquals("/rest/v1/rpc/get_online_order", recorded.path)
        assertEquals("Bearer test-publishable-key", recorded.getHeader("Authorization"))
        assertFalse(Api("", "", "").isConfigured)
    }

    @Test fun exchangesPkceCodeAndRefreshesSessionAndHandlesExpiredRefresh() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"access_token":"acc-1","refresh_token":"ref-1","expires_in":3600,"user":{"id":"u-1","email":"juan@example.com","user_metadata":{"full_name":"Juan Dela Cruz"}}}""",
            ),
        )
        val session = api.exchangePkceCode("code-123", "verifier-abc")
        assertEquals("acc-1", session.accessToken)
        assertEquals("ref-1", session.refreshToken)
        assertEquals("u-1", session.userId)
        assertEquals("juan@example.com", session.email)
        assertEquals("Juan Dela Cruz", session.displayName)

        val pkceReq = server.takeRequest()
        assertEquals("/auth/v1/token?grant_type=pkce", pkceReq.path)
        val pkceBody = JSONObject(pkceReq.body.readUtf8())
        assertEquals("code-123", pkceBody.getString("auth_code"))
        assertEquals("verifier-abc", pkceBody.getString("code_verifier"))

        server.enqueue(
            MockResponse().setBody(
                """{"access_token":"acc-2","refresh_token":"ref-2","expires_in":3600,"user":{"id":"u-1","email":"juan@example.com"}}""",
            ),
        )
        val refreshed = api.refreshSession("ref-1")
        assertEquals("acc-2", refreshed.accessToken)
        val refreshReq = server.takeRequest()
        assertEquals("/auth/v1/token?grant_type=refresh_token", refreshReq.path)

        server.enqueue(MockResponse().setResponseCode(400).setBody("""{"error":"invalid_grant"}"""))
        val failure400 = runCatching { api.refreshSession("bad-ref") }.exceptionOrNull()
        assertTrue(failure400 is ApiAuthException)
        server.takeRequest()

        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"unauthorized"}"""))
        val failure401 = runCatching { api.refreshSession("bad-ref") }.exceptionOrNull()
        assertTrue(failure401 is ApiAuthException)
        server.takeRequest()

        server.enqueue(MockResponse().setResponseCode(204))
        api.signOut("acc-2")
        val logoutReq = server.takeRequest()
        assertEquals("/auth/v1/logout", logoutReq.path)
        assertEquals("Bearer acc-2", logoutReq.getHeader("Authorization"))
    }

    @Test fun signedInPlaceOrderAndFetchOrderUseBearerAuthAndThrowOn401() = runTest {
        val token = Checkout.newTrackingToken()
        server.enqueue(
            MockResponse().setResponseCode(201).setBody(
                """{"ok":true,"reference":"BNC-AUTH23","trackingToken":"$token","status":"pending"}""",
            ),
        )
        val cart = (Cart().add(Fixtures.catalog, "i-carbo", "v-plain", null, 1) as Cart.AddResult.Added).cart
        val req = Checkout.request("key-2", token, Checkout.Details("Juan", "+639123456789", "", "Cash"), cart, cart.subtotal)
        val placed = api.placeOrder(req, accessToken = "acc-live")
        assertEquals(PlaceOrderResult.Placed("BNC-AUTH23", token, "pending"), placed)
        val orderReq = server.takeRequest()
        assertEquals("Bearer acc-live", orderReq.getHeader("Authorization"))

        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Unauthorized"}"""))
        val authErr = runCatching { api.placeOrder(req, accessToken = "acc-expired") }.exceptionOrNull()
        assertTrue(authErr is ApiAuthException)
        server.takeRequest()

        server.enqueue(
            MockResponse().setBody(
                """{"reference":"BNC-AUTH23","status":"preparing","items":[],"subtotal":119,"itemCount":1}""",
            ),
        )
        val fetched = api.fetchOrder("BNC-AUTH23", trackingToken = null, accessToken = "acc-live")
        assertNotNull(fetched)
        val rpcReq = server.takeRequest()
        assertEquals("Bearer acc-live", rpcReq.getHeader("Authorization"))
        val rpcBody = JSONObject(rpcReq.body.readUtf8())
        assertTrue(rpcBody.isNull("p_tracking_token"))
    }

    @Test fun fetchesAndSavesCustomerProfileAndOrderHistoryWithRange() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """[{"user_id":"u-1","full_name":"Juan Dela Cruz","phone":"+639171234567","created_at":"2026-10-24T06:00:00Z","updated_at":"2026-10-24T06:05:00Z"}]""",
            ),
        )
        val profile = api.fetchProfile("u-1", "acc-1")!!
        assertEquals("Juan Dela Cruz", profile.fullName)
        assertEquals("+639171234567", profile.phone)
        val profileReq = server.takeRequest()
        assertTrue(profileReq.path!!.startsWith("/rest/v1/customer_profiles?user_id=eq.u-1"))
        assertEquals("Bearer acc-1", profileReq.getHeader("Authorization"))

        server.enqueue(
            MockResponse().setBody(
                """[{"user_id":"u-1","full_name":"Maria Santos","phone":"+639181234567","created_at":"2026-10-24T06:00:00Z","updated_at":"2026-11-15T00:00:00Z"}]""",
            ),
        )
        val saved = api.saveProfile("u-1", "Maria Santos", "+639181234567", "acc-1")
        assertEquals("Maria Santos", saved.fullName)
        val saveReq = server.takeRequest()
        assertEquals("POST", saveReq.method)
        assertEquals("resolution=merge-duplicates,return=representation", saveReq.getHeader("Prefer"))
        val saveBody = JSONObject(saveReq.body.readUtf8())
        assertEquals("u-1", saveBody.getString("user_id"))
        assertEquals("Maria Santos", saveBody.getString("full_name"))
        assertEquals("+639181234567", saveBody.getString("phone"))

        server.enqueue(
            MockResponse()
                .setHeader("Content-Range", "0-0/14")
                .setBody(
                    """[{"id":"o-1","reference":"BNC-HIST1","status":"completed","fulfillment":"pickup","customer_name":"Maria","payment_preference":"Cash","notes":"","subtotal":119,"item_count":1,"rejection_reason":null,"created_at":"2026-11-14T10:00:00Z","items":[{"line_number":1,"item_id":"i-carbo","item_name":"Carbo","variant_id":"v-plain","variant_name":"Solo","flavor":"","unit_price":119,"quantity":1,"line_total":119}]}]""",
                ),
        )
        val history = api.fetchOrderHistory("u-1", "acc-1", page = 1, pageSize = 10)
        assertEquals(14, history.totalCount)
        assertEquals(2, history.totalPages)
        assertEquals(1, history.orders.size)
        assertEquals("BNC-HIST1", history.orders.first().reference)
        val historyReq = server.takeRequest()
        assertEquals("count=exact", historyReq.getHeader("Prefer"))
        assertEquals("Bearer acc-1", historyReq.getHeader("Authorization"))
    }

    @Test fun favoritesAndLoyaltyRoundTripsWork() = runTest {
        server.enqueue(MockResponse().setResponseCode(201))
        api.addFavorite("u-1", "i-carbo", "acc-1")
        val addFavReq = server.takeRequest()
        assertEquals("POST", addFavReq.method)
        assertEquals("resolution=ignore-duplicates,return=minimal", addFavReq.getHeader("Prefer"))

        server.enqueue(MockResponse().setBody("""[{"item_id":"i-carbo","created_at":"2026-11-14T08:00:00Z"}]"""))
        val favs = api.fetchFavorites("u-1", "acc-1")
        assertEquals(listOf("i-carbo"), favs.map { it.itemId })
        assertTrue(server.takeRequest().path!!.startsWith("/rest/v1/favorites?customer_id=eq.u-1"))

        server.enqueue(MockResponse().setResponseCode(204))
        api.removeFavorite("u-1", "i-carbo", "acc-1")
        val delReq = server.takeRequest()
        assertEquals("DELETE", delReq.method)
        assertTrue(delReq.path!!.contains("item_id=eq.i-carbo"))

        server.enqueue(MockResponse().setBody("""[{"points":150},{"points":-50},{"points":25}]"""))
        assertEquals(125, api.fetchLoyaltyBalance("u-1", "acc-1"))
        server.takeRequest()

        server.enqueue(
            MockResponse().setBody(
                """[{"id":101,"customer_id":"u-1","points":150,"reason":"order-completed","order_id":"o-1","note":"BNC-1","created_at":"2026-11-14T09:00:00Z","online_orders":{"reference":"BNC-1"}}]""",
            ),
        )
        val history = api.fetchLoyaltyHistory("u-1", "acc-1")
        assertEquals(1, history.size)
        assertEquals(101L, history.first().id)
        assertEquals("BNC-1", history.first().orderReference)
        server.takeRequest()

        server.enqueue(
            MockResponse().setBody(
                """[{"id":"rw-1","name":"Free Fries","description":"Crispy","points":100}]""",
            ),
        )
        val rewards = api.fetchLoyaltyRewards("acc-1")
        assertEquals(1, rewards.size)
        assertEquals("Free Fries", rewards.first().name)
        assertEquals(100, rewards.first().points)
        server.takeRequest()

        server.enqueue(
            MockResponse().setBody(
                """{"currencyStep":25,"pointsPerStep":1,"weeklyLimit":2}""",
            ),
        )
        val settings = api.fetchLoyaltySettings("acc-1")
        assertEquals(25.0, settings.currencyStep, 0.01)
        assertEquals(1, settings.pointsPerStep)
        assertEquals(2, settings.weeklyLimit)
        server.takeRequest()

        server.enqueue(
            MockResponse().setBody(
                """{"ok":true,"code":"RWD-K9M2","newBalance":25,"rewardName":"Free Fries","pointsSpent":100}""",
            ),
        )
        val redeemed = api.redeemReward("rw-1", "acc-1") as RedeemResult.Success
        assertEquals("RWD-K9M2", redeemed.code)
        assertEquals(25, redeemed.newBalance)
        val redeemReq = server.takeRequest()
        assertEquals("/rest/v1/rpc/redeem_reward", redeemReq.path)
        assertEquals("rw-1", JSONObject(redeemReq.body.readUtf8()).getString("p_reward_id"))
    }

    @Test fun reviewsAndDataRequestsWorkAndFlagUnauthorizedPost() = runTest {
        server.enqueue(
            MockResponse()
                .setHeader("Content-Range", "0-0/2")
                .setBody(
                    """[{"id":"rv-1","display_name":"Juan D.","rating":5,"body":"Great noodles!","hidden":false,"created_at":"2026-11-14T10:00:00Z","updated_at":"2026-11-14T10:00:00Z"}]""",
                ),
        )
        server.enqueue(MockResponse().setBody("""[{"rating":5},{"rating":4}]"""))
        val page = api.fetchReviews(page = 0, pageSize = 10)
        assertEquals(2, page.totalCount)
        assertEquals(4.5, page.averageRating, 0.01)
        assertEquals(1, page.reviews.size)
        server.takeRequest()
        server.takeRequest()

        server.enqueue(
            MockResponse().setBody(
                """{"id":"rv-1","display_name":"Juan D.","rating":5,"body":"Great noodles!","hidden":false,"created_at":"2026-11-14T10:00:00Z","updated_at":"2026-11-14T10:00:00Z"}""",
            ),
        )
        assertEquals(5, api.fetchMyReview("acc-1")?.rating)
        server.takeRequest()

        server.enqueue(
            MockResponse().setResponseCode(201).setBody(
                """{"ok":true,"review":{"id":"rv-1","display_name":"Juan D.","rating":5,"body":"Great noodles!","hidden":false,"created_at":"2026-11-14T10:00:00Z","updated_at":"2026-11-14T10:00:00Z"}}""",
            ),
        )
        val posted = api.postReview(5, "Great noodles!", "acc-1")
        assertTrue(posted is PostReviewResult.Success)
        val postReq = server.takeRequest()
        assertEquals("/api/reviews", postReq.path)
        assertEquals("Bearer acc-1", postReq.getHeader("Authorization"))

        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Unauthorized"}"""))
        val post401 = runCatching { api.postReview(5, "Great noodles!", "acc-expired") }.exceptionOrNull()
        assertTrue(post401 is ApiAuthException)
        server.takeRequest()

        server.enqueue(MockResponse().setResponseCode(201))
        api.submitDataRequest("export", "Please export my account data.", "acc-1")
        val submitReq = server.takeRequest()
        assertEquals("/rest/v1/data_requests", submitReq.path)
        val submitBody = JSONObject(submitReq.body.readUtf8())
        assertEquals("export", submitBody.getString("kind"))
        assertEquals("Please export my account data.", submitBody.getString("message"))
        assertFalse(submitBody.has("customer_id"))

        server.enqueue(
            MockResponse().setBody(
                """[{"id":"dr-1","kind":"export","message":"Please export my account data.","status":"open","created_at":"2026-11-15T00:00:00Z"}]""",
            ),
        )
        val reqs = api.fetchDataRequests("u-1", "acc-1")
        assertEquals(1, reqs.size)
        assertEquals("open", reqs.first().status)
        server.takeRequest()
    }

    @Test
    fun miniGamesStatusPlayMissingFunctionAnd401() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"dailyPlays":3,"playsToday":1,"playsLeft":2,"games":[{"id":"cat-cups","name":"Cat cups","description":"Oreo hides under one of three cups.","choices":3,"winPoints":3,"tryPoints":1,"maxPoints":3}]}""",
            ),
        )
        val status = api.fetchMiniGameStatus("acc-1")
        assertEquals(2, status?.playsLeft)
        val statusReq = server.takeRequest()
        assertEquals("/rest/v1/rpc/mini_game_status", statusReq.path)
        assertEquals("Bearer acc-1", statusReq.getHeader("Authorization"))

        server.enqueue(MockResponse().setResponseCode(404).setBody("""{"code":"PGRST202","message":"Could not find the function"}"""))
        assertEquals(null, api.fetchMiniGameStatus())
        server.takeRequest()

        server.enqueue(
            MockResponse().setBody(
                """{"ok":true,"playId":77,"game":"cat-cups","outcome":{"hiddenUnder":1,"won":true},"points":3,"playsLeft":1,"balance":15}""",
            ),
        )
        val play = api.playMiniGame("cat-cups", 1, "acc-1")
        assertTrue(play is PlayMiniGameResult.CatCupsSuccess)
        assertEquals(15, (play as PlayMiniGameResult.CatCupsSuccess).balance)
        val playReq = server.takeRequest()
        assertEquals("/rest/v1/rpc/play_mini_game", playReq.path)
        val playBody = JSONObject(playReq.body.readUtf8())
        assertEquals("cat-cups", playBody.getString("p_game"))
        assertEquals(1, playBody.getInt("p_choice"))

        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Unauthorized"}"""))
        val unauth = runCatching { api.playMiniGame("lucky-paw", null, "acc-expired") }.exceptionOrNull()
        assertTrue(unauth is ApiAuthException)
    }
}
