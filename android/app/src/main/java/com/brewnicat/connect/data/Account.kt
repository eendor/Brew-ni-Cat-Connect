package com.brewnicat.connect.data

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.round
import org.json.JSONArray
import org.json.JSONObject

/*
 * Account, loyalty, history, favorites, reviews, and data request models
 * matching the website and Supabase RPC/RLS contracts.
 */

data class CustomerProfile(
    val userId: String,
    val fullName: String,
    val phone: String?,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

data class ProfileValidationResult(
    val isValid: Boolean,
    val fullNameError: String? = null,
    val phoneError: String? = null,
    val normalizedName: String? = null,
    val normalizedPhone: String? = null,
)

object ProfileValidation {
    fun validate(fullName: String, phone: String): ProfileValidationResult {
        val trimmedName = fullName.trim()
        val nameErr = when {
            trimmedName.isEmpty() -> Checkout.NAME_REQUIRED
            trimmedName.length > Checkout.MAX_NAME_LENGTH ->
                "Please keep your name to ${Checkout.MAX_NAME_LENGTH} characters or fewer."
            else -> null
        }

        val rawPhone = phone.trim()
        val phoneErr = when {
            rawPhone.isEmpty() -> Checkout.PHONE_REQUIRED
            !Checkout.isValidPhone(rawPhone) -> Checkout.PHONE_INVALID
            else -> null
        }

        if (nameErr != null || phoneErr != null) {
            return ProfileValidationResult(
                isValid = false,
                fullNameError = nameErr,
                phoneError = phoneErr,
            )
        }

        return ProfileValidationResult(
            isValid = true,
            normalizedName = trimmedName,
            normalizedPhone = Checkout.normalizePhone(rawPhone),
        )
    }
}

data class OrderHistoryItem(
    val lineNumber: Int,
    val itemId: String,
    val itemName: String,
    val variantId: String,
    val variantName: String,
    val flavor: String?,
    val unitPrice: Double,
    val quantity: Int,
    val lineTotal: Double,
)

data class OrderHistoryEntry(
    val id: String,
    val reference: String,
    val status: String,
    val fulfillment: String,
    val customerName: String,
    val paymentPreference: String,
    val notes: String,
    val subtotal: Double,
    val itemCount: Int,
    val rejectionReason: String?,
    val createdAt: String,
    val items: List<OrderHistoryItem>,
)

data class OrderHistoryPage(
    val orders: List<OrderHistoryEntry>,
    val totalCount: Int,
    val page: Int,
    val pageSize: Int,
    val totalPages: Int,
)

data class FavoriteEntry(
    val itemId: String,
    val createdAt: String,
)

data class RewardItem(
    val id: String,
    val name: String,
    val description: String,
    val points: Int,
)

data class LoyaltySettings(
    val currencyStep: Double = 50.0,
    val pointsPerStep: Int = 1,
    val weeklyLimit: Int = 2,
)

data class LoyaltyTransaction(
    val id: Long,
    val customerId: String,
    val points: Int,
    val reason: String,
    val orderId: String?,
    val orderReference: String?,
    val note: String?,
    val createdAt: String,
)

sealed interface RedeemResult {
    data class Success(
        val code: String,
        val rewardName: String,
        val pointsSpent: Int,
        val newBalance: Int,
    ) : RedeemResult

    data class Failure(
        val error: String,
        val balance: Int? = null,
        val required: Int? = null,
        val weeklyLimit: Int? = null,
        val redeemedThisWeek: Int? = null,
    ) : RedeemResult
}

object LoyaltyFormat {
    fun pointsDelta(points: Int): String = when {
        points > 0 -> "+$points"
        points < 0 -> "\u2212${kotlin.math.abs(points)}"
        else -> "0"
    }

    fun reasonLabel(reason: String, note: String?): String = when (reason) {
        "order-completed" -> "Order completed"
        "reward-redeemed" -> note?.trim()?.takeIf { it.isNotEmpty() } ?: "Reward redeemed"
        "mini-game" -> note?.trim()?.takeIf { it.isNotEmpty() } ?: "Mini-game"
        "adjustment" -> note?.trim()?.takeIf { it.isNotEmpty() } ?: "Points adjustment"
        else -> "Points update"
    }

    fun earningRule(currencyStep: Double, pointsPerStep: Int): String {
        val label = if (pointsPerStep == 1) "point" else "points"
        return "Earn $pointsPerStep $label for every ${Pricing.formatPeso(currencyStep)} spent on completed orders."
    }

    fun weeklyLimitNote(weeklyLimit: Int): String {
        val label = if (weeklyLimit == 1) "reward" else "rewards"
        return "Redeem up to $weeklyLimit $label per week."
    }

    fun redeemErrorMessage(failure: RedeemResult.Failure): String = when (failure.error) {
        "weekly_limit_reached" ->
            "You have reached your weekly redemption limit (${failure.weeklyLimit ?: 2} per week). Please try again next week."
        "insufficient_points" -> {
            val need = failure.required
            val bal = failure.balance
            if (need != null && bal != null) {
                "You need $need points for this reward, and your current balance is $bal."
            } else {
                "You don't have enough points for this reward yet."
            }
        }
        "unauthorized" -> "Your session expired. Please sign in again."
        "reward_inactive", "reward_not_found" -> "This reward is no longer active."
        else -> "We couldn't complete this redemption. Please try again."
    }

    private val DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy · h:mm a", Locale.US)

    fun formatDateTime(iso: String): String = runCatching {
        OffsetDateTime.parse(iso).atZoneSameInstant(ShopHours.MANILA).format(DATE_FMT)
    }.getOrDefault(iso)
}

data class ReviewItem(
    val id: String,
    val displayName: String,
    val rating: Int,
    val body: String,
    val hidden: Boolean,
    val createdAt: String,
    val updatedAt: String,
)

data class ReviewsPage(
    val reviews: List<ReviewItem>,
    val totalCount: Int,
    val averageRating: Double,
)

sealed interface PostReviewResult {
    data class Success(val review: ReviewItem) : PostReviewResult
    data class Failure(val error: String, val message: String) : PostReviewResult
}

data class ReviewValidationResult(
    val isValid: Boolean,
    val ratingError: String? = null,
    val bodyError: String? = null,
    val trimmedBody: String? = null,
)

object ReviewValidation {
    const val MAX_LENGTH = 500
    const val RATING_REQUIRED = "Please select a rating from 1 to 5 stars."
    const val TEXT_EMPTY = "Please write a short review before submitting."
    const val TEXT_TOO_LONG = "Please keep your review to 500 characters or fewer."

    fun validate(rating: Int, body: String): ReviewValidationResult {
        val ratingErr = if (rating !in 1..5) RATING_REQUIRED else null
        val trimmed = body.trim()
        val bodyErr = when {
            trimmed.isEmpty() -> TEXT_EMPTY
            trimmed.length > MAX_LENGTH -> TEXT_TOO_LONG
            else -> null
        }
        if (ratingErr != null || bodyErr != null) {
            return ReviewValidationResult(false, ratingErr, bodyErr, null)
        }
        return ReviewValidationResult(true, trimmedBody = trimmed)
    }
}

data class DataRequestEntry(
    val id: String,
    val kind: String,
    val message: String,
    val status: String,
    val createdAt: String,
)

object DataRequestValidation {
    const val MAX_LENGTH = 1000

    fun validate(message: String): String? {
        val trimmed = message.trim()
        return when {
            trimmed.isEmpty() -> "Please write what you would like us to correct or delete."
            trimmed.length > MAX_LENGTH -> "Please keep the message to $MAX_LENGTH characters or fewer."
            else -> null
        }
    }
}

object AccountParsers {
    fun parseContentRangeTotal(header: String?): Int? {
        if (header.isNullOrBlank()) return null
        val slash = header.lastIndexOf('/')
        if (slash < 0) return null
        val total = header.substring(slash + 1).trim()
        return total.toIntOrNull()
    }

    fun parseProfile(json: JSONObject): CustomerProfile? {
        val userId = json.optString("user_id").trim()
        val fullName = json.optString("full_name").trim()
        if (userId.isBlank()) return null
        val phone = json.optString("phone").takeIf { it.isNotBlank() && it != "null" }
        return CustomerProfile(
            userId = userId,
            fullName = fullName,
            phone = phone,
            createdAt = json.optString("created_at").takeIf { it.isNotBlank() && it != "null" },
            updatedAt = json.optString("updated_at").takeIf { it.isNotBlank() && it != "null" },
        )
    }

    fun parseOrderHistoryPage(
        rows: JSONArray,
        totalCountHeader: Int?,
        page: Int,
        pageSize: Int,
    ): OrderHistoryPage {
        val orders = rows.objects().mapNotNull { o ->
            val id = o.optString("id")
            val reference = o.optString("reference")
            val status = o.optString("status")
            if (id.isBlank() || reference.isBlank() || status.isBlank()) return@mapNotNull null

            val rawItems = o.optJSONArray("items")?.objects().orEmpty()
                .map { item ->
                    OrderHistoryItem(
                        lineNumber = item.optInt("line_number", 0),
                        itemId = item.optString("item_id"),
                        itemName = item.optString("item_name"),
                        variantId = item.optString("variant_id"),
                        variantName = item.optString("variant_name"),
                        flavor = item.optString("flavor").takeIf { it.isNotBlank() && it != "null" },
                        unitPrice = item.optDouble("unit_price", 0.0),
                        quantity = item.optInt("quantity", 1),
                        lineTotal = item.optDouble("line_total", 0.0),
                    )
                }
                .sortedBy { it.lineNumber }

            OrderHistoryEntry(
                id = id,
                reference = reference,
                status = status,
                fulfillment = o.optString("fulfillment", "pickup"),
                customerName = o.optString("customer_name"),
                paymentPreference = o.optString("payment_preference"),
                notes = o.optString("notes", ""),
                subtotal = o.optDouble("subtotal", 0.0),
                itemCount = o.optInt("item_count", rawItems.sumOf { it.quantity }),
                rejectionReason = o.optString("rejection_reason").takeIf { it.isNotBlank() && it != "null" },
                createdAt = o.optString("created_at"),
                items = rawItems,
            )
        }

        val total = totalCountHeader ?: orders.size
        val safeSize = max(1, pageSize)
        val totalPages = max(1, ceil(total.toDouble() / safeSize).toInt())
        return OrderHistoryPage(
            orders = orders,
            totalCount = total,
            page = max(1, page),
            pageSize = safeSize,
            totalPages = totalPages,
        )
    }

    fun parseFavorites(array: JSONArray): List<FavoriteEntry> = array.objects().mapNotNull { o ->
        val itemId = o.optString("item_id")
        if (itemId.isBlank()) null else FavoriteEntry(itemId, o.optString("created_at"))
    }

    fun parseRewards(array: JSONArray): List<RewardItem> = array.objects().mapNotNull { o ->
        val id = o.optString("id")
        val name = o.optString("name")
        if (id.isBlank() || name.isBlank()) null else RewardItem(
            id = id,
            name = name,
            description = o.optString("description"),
            points = o.optInt("points", 0),
        )
    }

    fun parseLoyaltySettings(json: JSONObject): LoyaltySettings = LoyaltySettings(
        currencyStep = json.optDouble("currencyStep", 50.0).takeIf { it.isFinite() && it > 0 } ?: 50.0,
        pointsPerStep = json.optInt("pointsPerStep", 1).coerceAtLeast(1),
        weeklyLimit = json.optInt("weeklyLimit", 2).coerceAtLeast(1),
    )

    fun parseLoyaltyHistory(array: JSONArray): List<LoyaltyTransaction> = array.objects().mapNotNull { o ->
        val id = o.optLong("id", -1L)
        if (id < 0L) return@mapNotNull null
        val orderObj = o.optJSONObject("online_orders")
            ?: o.optJSONArray("online_orders")?.optJSONObject(0)
        val orderRef = orderObj?.optString("reference")?.takeIf { it.isNotBlank() && it != "null" }
        LoyaltyTransaction(
            id = id,
            customerId = o.optString("customer_id"),
            points = o.optInt("points", 0),
            reason = o.optString("reason"),
            orderId = o.optString("order_id").takeIf { it.isNotBlank() && it != "null" },
            orderReference = orderRef,
            note = o.optString("note").takeIf { it.isNotBlank() && it != "null" },
            createdAt = o.optString("created_at"),
        )
    }

    fun parseRedeemResult(json: JSONObject): RedeemResult {
        if (json.optBoolean("ok", false)) {
            return RedeemResult.Success(
                code = json.optString("code"),
                rewardName = json.optString("rewardName"),
                pointsSpent = json.optInt("pointsSpent", 0),
                newBalance = json.optInt("newBalance", 0),
            )
        }
        return RedeemResult.Failure(
            error = json.optString("error").ifBlank { "failed" },
            balance = if (json.has("balance") && !json.isNull("balance")) json.optInt("balance") else null,
            required = if (json.has("required") && !json.isNull("required")) json.optInt("required") else null,
            weeklyLimit = if (json.has("weeklyLimit") && !json.isNull("weeklyLimit")) json.optInt("weeklyLimit") else null,
            redeemedThisWeek = if (json.has("redeemedThisWeek") && !json.isNull("redeemedThisWeek")) json.optInt("redeemedThisWeek") else null,
        )
    }

    fun parseReview(json: JSONObject): ReviewItem? {
        val id = json.optString("id")
        if (id.isBlank()) return null
        return ReviewItem(
            id = id,
            displayName = json.optString("display_name").ifBlank { "Customer" },
            rating = json.optInt("rating", 5).coerceIn(1, 5),
            body = json.optString("body"),
            hidden = json.optBoolean("hidden", false),
            createdAt = json.optString("created_at"),
            updatedAt = json.optString("updated_at"),
        )
    }

    fun averageRating(ratings: JSONArray): Double {
        var sum = 0
        var count = 0
        for (o in ratings.objects()) {
            val r = o.optInt("rating", 0)
            if (r in 1..5) {
                sum += r
                count++
            }
        }
        if (count == 0) return 0.0
        return round((sum.toDouble() / count) * 10.0) / 10.0
    }

    fun parsePostReviewResult(body: String?): PostReviewResult {
        val json = runCatching { JSONObject(body ?: "") }.getOrNull()
        if (json?.optBoolean("ok", false) == true) {
            val review = json.optJSONObject("review")?.let(::parseReview)
            if (review != null) return PostReviewResult.Success(review)
        }
        return PostReviewResult.Failure(
            error = json?.optString("error")?.ifBlank { "server-error" } ?: "server-error",
            message = json?.optString("message")?.ifBlank { "We couldn't submit your review right now. Please try again." }
                ?: "We couldn't submit your review right now. Please try again.",
        )
    }

    fun parseDataRequests(array: JSONArray): List<DataRequestEntry> = array.objects().mapNotNull { o ->
        val id = o.optString("id")
        if (id.isBlank()) null else DataRequestEntry(
            id = id,
            kind = o.optString("kind", "correction"),
            message = o.optString("message"),
            status = o.optString("status", "open"),
            createdAt = o.optString("created_at"),
        )
    }
}
