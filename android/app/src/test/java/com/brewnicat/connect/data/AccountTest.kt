package com.brewnicat.connect.data

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountTest {
    @Test
    fun phoneAndProfileValidationNormalizePhilippineNumbers() {
        assertEquals("+639123456789", Checkout.normalizePhone("0912 345-6789"))
        assertEquals("+639123456789", Checkout.normalizePhone("+63 (912) 345 6789"))

        val invalid = ProfileValidation.validate("   ", "12345")
        assertFalse(invalid.isValid)
        assertNotNull(invalid.fullNameError)
        assertNotNull(invalid.phoneError)

        val valid = ProfileValidation.validate("  Mia Santos  ", "0917 888 9999")
        assertTrue(valid.isValid)
        assertEquals("Mia Santos", valid.normalizedName)
        assertEquals("+639178889999", valid.normalizedPhone)
    }

    @Test
    fun orderHistoryParsesContentRangeAndSortsLines() {
        assertEquals(24, AccountParsers.parseContentRangeTotal("0-9/24"))
        assertEquals(0, AccountParsers.parseContentRangeTotal("*/0"))
        assertNull(AccountParsers.parseContentRangeTotal(null))

        val rows = JSONArray(
            """
            [{
              "id": "ord-1",
              "reference": "BNC-ABCDEF",
              "status": "preparing",
              "fulfillment": "pickup",
              "customer_name": "Mia",
              "payment_preference": "GCash",
              "notes": "Less ice",
              "subtotal": 200,
              "item_count": 3,
              "rejection_reason": null,
              "created_at": "2026-11-15T12:00:00Z",
              "items": [
                {"line_number": 2, "item_id": "nachos", "item_name": "Nachos", "variant_id": "v2", "variant_name": "Regular", "flavor": null, "unit_price": 85, "quantity": 1, "line_total": 85},
                {"line_number": 1, "item_id": "espresso", "item_name": "Spanish Latte", "variant_id": "v1", "variant_name": "16 oz", "flavor": null, "unit_price": 57.5, "quantity": 2, "line_total": 115}
              ]
            }]
            """.trimIndent(),
        )
        val page = AccountParsers.parseOrderHistoryPage(rows, totalCountHeader = 15, page = 1, pageSize = 10)
        assertEquals(15, page.totalCount)
        assertEquals(2, page.totalPages)
        assertEquals(listOf("Spanish Latte", "Nachos"), page.orders.single().items.map { it.itemName })
    }

    @Test
    fun loyaltyFormattingAndRedeemErrorsMatchRules() {
        assertEquals("+12", LoyaltyFormat.pointsDelta(12))
        assertEquals("\u221240", LoyaltyFormat.pointsDelta(-40))
        assertEquals("Order completed", LoyaltyFormat.reasonLabel("order-completed", null))
        assertEquals("Mini-game: Cat cups", LoyaltyFormat.reasonLabel("mini-game", "Mini-game: Cat cups"))

        val ok = AccountParsers.parseRedeemResult(
            JSONObject("""{"ok":true,"code":"RWD-9A2F1C","rewardName":"Kiwi soda","pointsSpent":40,"newBalance":15}"""),
        )
        assertTrue(ok is RedeemResult.Success && ok.code == "RWD-9A2F1C")

        val limit = AccountParsers.parseRedeemResult(
            JSONObject("""{"ok":false,"error":"weekly_limit_reached","weeklyLimit":2,"redeemedThisWeek":2}"""),
        )
        assertTrue("weekly redemption limit (2 per week)" in LoyaltyFormat.redeemErrorMessage(limit as RedeemResult.Failure))
    }

    @Test
    fun reviewAndDataRequestValidationRejectBadInput() {
        assertFalse(ReviewValidation.validate(0, "Good").isValid)
        assertFalse(ReviewValidation.validate(6, "Good").isValid)
        assertFalse(ReviewValidation.validate(5, "   ").isValid)
        assertFalse(ReviewValidation.validate(5, "a".repeat(501)).isValid)
        val okReview = ReviewValidation.validate(5, "  Cozy cats!  ")
        assertTrue(okReview.isValid)
        assertEquals("Cozy cats!", okReview.trimmedBody)

        val avg = AccountParsers.averageRating(JSONArray("""[{"rating":5},{"rating":4},{"rating":5}]"""))
        assertEquals(4.7, avg, 0.001)

        assertNotNull(DataRequestValidation.validate("   "))
        assertNotNull(DataRequestValidation.validate("x".repeat(1001)))
        assertNull(DataRequestValidation.validate("Please update my contact number."))
    }
}
