package com.brewnicat.connect.data

import org.json.JSONObject

/* An order as the customer sees it (OrderView in src/lib/orders/types.ts). */

data class OrderLine(
    val itemName: String,
    val variantName: String,
    val flavor: String?,
    val unitPrice: Double,
    val quantity: Int,
    val lineTotal: Double,
)

data class StatusEvent(val status: String, val changedAt: String)

data class OrderView(
    val reference: String,
    val status: String,
    val customerName: String,
    val paymentPreference: String,
    val notes: String,
    val items: List<OrderLine>,
    val subtotal: Double,
    val itemCount: Int,
    val rejectionReason: String?,
    val createdAt: String,
    val statusHistory: List<StatusEvent>,
) {
    val isFinal: Boolean get() = status in FINAL_STATUSES

    companion object {
        val FINAL_STATUSES = setOf("rejected", "completed", "cancelled")

        /** The steps a customer follows, in order. */
        val PROGRESS = listOf("pending", "accepted", "preparing", "ready", "completed")

        fun label(status: String): String = when (status) {
            "pending" -> "Order sent"
            "accepted" -> "Accepted"
            "preparing" -> "Preparing"
            "ready" -> "Ready for pickup"
            "completed" -> "Picked up"
            "rejected" -> "Not accepted"
            "cancelled" -> "Cancelled"
            else -> status.replaceFirstChar { it.uppercase() }
        }

        fun description(status: String): String = when (status) {
            "pending" -> "The shop has your order and will accept it soon."
            "accepted" -> "The shop accepted your order."
            "preparing" -> "Your order is being made."
            "ready" -> "Your order is ready. Pick it up at the counter and pay there."
            "completed" -> "Enjoy! Thanks for ordering from Brew ni Cat."
            "rejected" -> "The shop couldn't take this order."
            "cancelled" -> "This order was cancelled."
            else -> ""
        }

        fun parse(json: JSONObject): OrderView? = runCatching {
            OrderView(
                reference = json.getString("reference"),
                status = json.getString("status"),
                customerName = json.optString("customerName"),
                paymentPreference = json.optString("paymentPreference"),
                notes = json.optString("notes"),
                items = json.getJSONArray("items").objects().map {
                    OrderLine(
                        it.getString("itemName"), it.getString("variantName"),
                        if (it.isNull("flavor")) null else it.optString("flavor"),
                        it.optDouble("unitPrice"), it.optInt("quantity"), it.optDouble("lineTotal"),
                    )
                },
                subtotal = json.optDouble("subtotal"),
                itemCount = json.optInt("itemCount"),
                rejectionReason = if (json.isNull("rejectionReason")) null else json.optString("rejectionReason").ifBlank { null },
                createdAt = json.optString("createdAt"),
                statusHistory = json.optJSONArray("statusHistory")?.objects()
                    ?.map { StatusEvent(it.getString("status"), it.getString("changedAt")) } ?: emptyList(),
            )
        }.getOrNull()
    }
}

/** An order placed from this phone: enough to open it again. */
data class SavedOrder(val reference: String, val trackingToken: String, val placedAt: Long)
