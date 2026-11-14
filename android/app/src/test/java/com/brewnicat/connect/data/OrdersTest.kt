package com.brewnicat.connect.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OrdersTest {
    @Test fun parsesOrderViewAndNullableFields() {
        val json = JSONObject(
            """
            {
              "reference": "BNC-45W4QJ",
              "status": "ready",
              "customerName": "Juan",
              "paymentPreference": "GCash",
              "notes": "Less ice",
              "items": [
                {
                  "itemName": "Sedaap Spicy Chicken",
                  "variantName": "Regular",
                  "flavor": "2 Paws (Medium) + 3pcs Seaweed",
                  "unitPrice": 94,
                  "quantity": 1,
                  "lineTotal": 94
                },
                {
                  "itemName": "Buldak Carbo",
                  "variantName": "Plain",
                  "flavor": null,
                  "unitPrice": 119,
                  "quantity": 2,
                  "lineTotal": 238
                }
              ],
              "subtotal": 332,
              "itemCount": 3,
              "rejectionReason": null,
              "createdAt": "2026-11-14T06:00:00Z",
              "statusHistory": [
                {"status": "pending", "changedAt": "2026-11-14T06:00:00Z"},
                {"status": "ready", "changedAt": "2026-11-14T06:05:00Z"}
              ]
            }
            """.trimIndent(),
        )
        val order = OrderView.parse(json)!!
        assertEquals("BNC-45W4QJ", order.reference)
        assertEquals("ready", order.status)
        assertFalse(order.isFinal)
        assertEquals("2 Paws (Medium) + 3pcs Seaweed", order.items[0].flavor)
        assertNull(order.items[1].flavor)
        assertNull(order.rejectionReason)
        assertEquals(332.0, order.subtotal, 0.0)
        assertEquals(2, order.statusHistory.size)
    }

    @Test fun rejectsMalformedOrderPayloads() {
        assertNull(OrderView.parse(JSONObject("""{"reference":"BNC-45W4QJ"}""")))
    }

    @Test fun knowsFinalStatusesAndCustomerLabels() {
        assertFalse(OrderView.parse(minimalOrder("pending"))!!.isFinal)
        assertFalse(OrderView.parse(minimalOrder("ready"))!!.isFinal)
        assertTrue(OrderView.parse(minimalOrder("completed"))!!.isFinal)
        assertTrue(OrderView.parse(minimalOrder("rejected"))!!.isFinal)
        assertTrue(OrderView.parse(minimalOrder("cancelled"))!!.isFinal)

        assertEquals("Order sent", OrderView.label("pending"))
        assertEquals("Ready for pickup", OrderView.label("ready"))
        assertEquals("Picked up", OrderView.label("completed"))
        assertEquals("Not accepted", OrderView.label("rejected"))
    }

    private fun minimalOrder(status: String) = JSONObject(
        """{"reference":"BNC-45W4QJ","status":"$status","items":[]}""",
    )
}
