package com.brewnicat.connect.data

import org.json.JSONObject

/*
 * Loyalty mini-games (FR-089, ADR-034) and waiting-order helpers. The server
 * decides every result in public.play_mini_game(); the phone only asks to play
 * and animates what the server drew.
 */

data class MiniGameInfo(
    val id: String,
    val name: String,
    val description: String,
    val choices: Int,
    val winPoints: Double?,
    val tryPoints: Double?,
    val maxPoints: Double,
)

/**
 * Under the coins rules (FR-124) plays never run out ([unlimited]), and
 * [dailyPlays] / [playsLeft] count only the plays that can still win a prize.
 * Without the coins migration on the database, [playsLeft] is the play limit.
 */
data class MiniGameStatus(
    val dailyPlays: Int,
    val playsToday: Int,
    val playsLeft: Int,
    val games: List<MiniGameInfo>,
    val unlimited: Boolean = false,
    val dailyCoins: Double? = null,
    val coinsToday: Double? = null,
    val coinsLeft: Double? = null,
)

/** A prize won on a play, with its one-time code to show at the counter (FR-091). */
data class WonPrize(
    val id: String,
    val name: String,
    val code: String,
    val expiresAt: String,
)

sealed interface PlayMiniGameResult {
    data class CatCupsSuccess(
        val playId: Long,
        val hiddenUnder: Int,
        val won: Boolean,
        val points: Double,
        val playsLeft: Int,
        val balance: Double,
        val prize: WonPrize? = null,
        val coinsLeft: Double? = null,
    ) : PlayMiniGameResult

    data class LuckyPawSuccess(
        val playId: Long,
        val treat: Double,
        val points: Double,
        val playsLeft: Int,
        val balance: Double,
        val prize: WonPrize? = null,
        val coinsLeft: Double? = null,
    ) : PlayMiniGameResult

    data class Failure(
        val error: String,
        val message: String,
        val playsLeft: Int? = null,
    ) : PlayMiniGameResult
}

object MiniGamesUiHelper {
    val WAITING_STATUSES = setOf("pending", "accepted", "preparing")

    fun isWaitingStatus(status: String?): Boolean = status in WAITING_STATUSES
}

object GamesParsers {
    fun pointsLabel(points: Double): String = Coins.label(points)

    /** Whether the customer can still play: always, under the coins rules. */
    fun canPlay(status: MiniGameStatus): Boolean = status.unlimited || status.playsLeft > 0

    fun coinsLeftLabel(coinsLeft: Double): String =
        if (Coins.round(coinsLeft) <= 0.0) "Today's coins earned" else "${Coins.label(coinsLeft)} left today"

    /** Coins left today under the coins rules; plays left on an older database. */
    fun todayLabel(status: MiniGameStatus): String {
        val left = status.coinsLeft
        return if (status.unlimited && left != null) coinsLeftLabel(left) else playsLeftLabel(status.playsLeft)
    }

    /** "+0.2 coins", or at the daily cap, that the play was just for fun. */
    fun earnedLine(points: Double): String =
        if (Coins.round(points) > 0.0) "+${pointsLabel(points)}" else "You've earned today's coins, so this one's for fun"

    fun playsLeftLabel(playsLeft: Int): String = when {
        playsLeft <= 0 -> "No plays left today"
        playsLeft == 1 -> "1 play left today"
        else -> "$playsLeft plays left today"
    }

    fun errorMessage(error: String): String = when (error) {
        "unauthorized" -> "Please sign in with Google to play for coins."
        "daily_limit_reached" -> "You've used all your plays for today. Come back tomorrow!"
        "unavailable" -> "The mini-games aren't open yet."
        "invalid_choice", "unknown_game" -> "That play couldn't be sent. Try picking again."
        else -> "Something went wrong. Your play wasn't used. Try again."
    }

    fun isMissingFunctionError(statusCode: Int, body: String): Boolean {
        if (statusCode != 404 && !body.contains("PGRST202") && !body.contains("42883")) {
            return body.contains("could not find the function", ignoreCase = true)
        }
        return body.contains("PGRST202") ||
            body.contains("42883") ||
            body.contains("could not find the function", ignoreCase = true) ||
            statusCode == 404
    }

    fun parseStatus(json: JSONObject): MiniGameStatus? = runCatching {
        val games = json.optJSONArray("games")?.objects()?.mapNotNull { g ->
            val id = g.optString("id").ifBlank { return@mapNotNull null }
            MiniGameInfo(
                id = id,
                name = g.optString("name"),
                description = g.optString("description"),
                choices = g.optInt("choices", 0),
                winPoints = Coins.readOrNull(g, "winPoints"),
                tryPoints = Coins.readOrNull(g, "tryPoints"),
                maxPoints = Coins.read(g, "maxPoints"),
            )
        } ?: emptyList()
        MiniGameStatus(
            dailyPlays = json.optInt("dailyPlays", 3),
            playsToday = json.optInt("playsToday", 0),
            playsLeft = json.optInt("playsLeft", 0).coerceAtLeast(0),
            games = games,
            unlimited = json.optBoolean("unlimited", false),
            dailyCoins = Coins.readOrNull(json, "dailyCoins"),
            coinsToday = Coins.readOrNull(json, "coinsToday"),
            coinsLeft = Coins.readOrNull(json, "coinsLeft")?.coerceAtLeast(0.0),
        )
    }.getOrNull()

    /** The words added after a play's result when it won a prize, or "" when it didn't. */
    fun prizeLine(prize: WonPrize?): String =
        if (prize == null) "" else "\nYou won ${prize.name}! Code ${prize.code} · Use by ${LoyaltyFormat.formatDate(prize.expiresAt)}. It's saved in Rewards under My codes."

    /** A won prize, or null when there is none or it has no code. */
    fun parsePrize(json: JSONObject?): WonPrize? {
        if (json == null) return null
        val code = json.optString("code").takeIf { it.isNotBlank() && it != "null" } ?: return null
        return WonPrize(
            id = json.optString("id"),
            name = json.optString("name").ifBlank { "Prize" },
            code = code,
            expiresAt = json.optString("expiresAt"),
        )
    }

    fun parsePlayResult(json: JSONObject): PlayMiniGameResult {
        if (!json.optBoolean("ok", false)) {
            val code = json.optString("error").ifBlank { "failed" }
            val left = if (json.has("playsLeft") && !json.isNull("playsLeft")) json.optInt("playsLeft") else null
            return PlayMiniGameResult.Failure(code, errorMessage(code), left)
        }
        val playId = json.optLong("playId", 0L)
        val game = json.optString("game")
        val outcome = json.optJSONObject("outcome") ?: JSONObject()
        val points = Coins.read(json, "points").coerceAtLeast(0.0)
        val playsLeft = json.optInt("playsLeft", 0).coerceAtLeast(0)
        val balance = Coins.read(json, "balance").coerceAtLeast(0.0)
        val coinsLeft = Coins.readOrNull(json, "coinsLeft")?.coerceAtLeast(0.0)
        val prize = parsePrize(json.optJSONObject("prize"))

        return when (game) {
            "cat-cups" -> PlayMiniGameResult.CatCupsSuccess(
                playId = playId,
                hiddenUnder = outcome.optInt("hiddenUnder", 0),
                won = outcome.optBoolean("won", false),
                points = points,
                playsLeft = playsLeft,
                balance = balance,
                prize = prize,
                coinsLeft = coinsLeft,
            )
            "lucky-paw" -> PlayMiniGameResult.LuckyPawSuccess(
                playId = playId,
                treat = Coins.read(outcome, "treat", points),
                points = points,
                playsLeft = playsLeft,
                balance = balance,
                prize = prize,
                coinsLeft = coinsLeft,
            )
            else -> PlayMiniGameResult.Failure("unknown_game", errorMessage("unknown_game"))
        }
    }
}
