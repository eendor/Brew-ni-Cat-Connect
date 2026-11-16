package com.brewnicat.connect.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckoutTest {
    private val ok = Checkout.Details("Juan Dela Cruz", "0912 345 6789", "", "Cash")

    @Test fun acceptsPhilippineMobileNumbers() {
        listOf("09123456789", "0912 345 6789", "+63 912 345 6789", "(0912) 345-6789").forEach { assertTrue(it, Checkout.isValidPhone(it)) }
        listOf("", "12345", "08123456789", "+1 415 555 0100", "0912345678").forEach { assertFalse(it, Checkout.isValidPhone(it)) }
    }

    @Test fun validatesLikeTheWebsite() {
        assertTrue(Checkout.validate(ok).isEmpty())
        assertEquals(Checkout.NAME_REQUIRED, Checkout.validate(ok.copy(name = "  "))["name"])
        assertEquals(Checkout.PHONE_REQUIRED, Checkout.validate(ok.copy(phone = ""))["phone"])
        assertEquals(Checkout.PHONE_INVALID, Checkout.validate(ok.copy(phone = "123"))["phone"])
        assertTrue("notes" in Checkout.validate(ok.copy(notes = "x".repeat(Checkout.MAX_NOTES_LENGTH + 1))))
    }

    @Test fun makesUnguessableTokensAndKeys() {
        val token = Checkout.newTrackingToken()
        assertTrue(Checkout.isTrackingToken(token))
        assertFalse(token == Checkout.newTrackingToken())
        assertTrue(Regex("^[0-9a-f-]{36}$").matches(Checkout.newIdempotencyKey()))
        assertTrue(Checkout.isOrderReference("BNC-45W4QJ"))
        assertFalse(Checkout.isOrderReference("BNC-45W4Q0"))
    }

    @Test fun buildsTheWebsiteRequest() {
        val cart = (Cart().add(Fixtures.catalog, "i-sedaap", "i-sedaap-variant-1", "1 Paw (Mild) + Egg (Boiled)", 2) as Cart.AddResult.Added).cart
        val body = Checkout.request("key", "token", ok.copy(name = " Juan "), cart, cart.subtotal)
        assertEquals("pickup", body.getString("fulfillment"))
        assertEquals("Juan", body.getJSONObject("customer").getString("name"))
        val line = body.getJSONArray("lines").getJSONObject(0)
        assertEquals("1 Paw (Mild) + Egg (Boiled)", line.getString("flavor"))
        assertEquals(2, line.getInt("quantity"))
        assertEquals(168.0, body.getDouble("expectedSubtotal"), 0.0)
        assertFalse(line.has("unitPrice")) // the server prices the order
    }

    @Test fun readsTheWebsiteAnswer() {
        val token = Checkout.newTrackingToken()
        assertEquals(
            PlaceOrderResult.Placed("BNC-45W4QJ", token, "pending"),
            PlaceOrderResult.parse("""{"ok":true,"reference":"BNC-45W4QJ","trackingToken":"$token","status":"pending"}""", token),
        )
        // A different token back means something is wrong: never save it.
        assertEquals("server-error", (PlaceOrderResult.parse("""{"ok":true,"reference":"BNC-45W4QJ","trackingToken":"x"}""", token) as PlaceOrderResult.Failed).reason)
        assertEquals("server-error", (PlaceOrderResult.parse("<html>", token) as PlaceOrderResult.Failed).reason)
        val changed = PlaceOrderResult.parse(
            """{"ok":false,"reason":"price-changed","message":"Prices changed.","subtotal":120,"lines":[{"index":1,"reason":"x"}],"fieldErrors":{"phone":"Bad"}}""", token,
        ) as PlaceOrderResult.Failed
        assertEquals("price-changed", changed.reason)
        assertEquals(120.0, changed.newSubtotal!!, 0.0)
        assertEquals(listOf(1), changed.lineIndexes)
        assertEquals(mapOf("phone" to "Bad"), changed.fieldErrors)
    }
}
