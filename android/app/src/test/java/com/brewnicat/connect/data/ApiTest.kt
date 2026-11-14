package com.brewnicat.connect.data

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
}
