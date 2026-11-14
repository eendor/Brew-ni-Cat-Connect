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
    val winPoints: Int?,
    val tryPoints: Int?,
    val maxPoints: Int,
)

data class MiniGameStatus(
    val dailyPlays: Int,
    val playsToday: Int,
    val playsLeft: Int,
    val games: List<MiniGameInfo>,
)

sealed interface PlayMiniGameResult {
    data class CatCupsSuccess(
        val playId: Long,
        val hiddenUnder: Int,
        val won: Boolean,
        val points: Int,
        val playsLeft: Int,
        val balance: Int,
    ) : PlayMiniGameResult

    data class LuckyPawSuccess(
        val playId: Long,
        val treat: Int,
        val points: Int,
        val playsLeft: Int,
        val balance: Int,
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
    fun pointsLabel(points: Int): String = if (points == 1) "1 point" else "$points points"

    fun playsLeftLabel(playsLeft: Int): String = when {
        playsLeft <= 0 -> "No plays left today"
        playsLeft == 1 -> "1 play left today"
        else -> "$playsLeft plays left today"
    }

    fun errorMessage(error: String): String = when (error) {
        "unauthorized" -> "Please sign in with Google to play for points."
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
                winPoints = if (g.isNull("winPoints")) null else g.optInt("winPoints"),
                tryPoints = if (g.isNull("tryPoints")) null else g.optInt("tryPoints"),
                maxPoints = g.optInt("maxPoints", 0),
            )
        } ?: emptyList()
        MiniGameStatus(
            dailyPlays = json.optInt("dailyPlays", 3),
            playsToday = json.optInt("playsToday", 0),
            playsLeft = json.optInt("playsLeft", 0).coerceAtLeast(0),
            games = games,
        )
    }.getOrNull()

    fun parsePlayResult(json: JSONObject): PlayMiniGameResult {
        if (!json.optBoolean("ok", false)) {
            val code = json.optString("error").ifBlank { "failed" }
            val left = if (json.has("playsLeft") && !json.isNull("playsLeft")) json.optInt("playsLeft") else null
            return PlayMiniGameResult.Failure(code, errorMessage(code), left)
        }
        val playId = json.optLong("playId", 0L)
        val game = json.optString("game")
        val outcome = json.optJSONObject("outcome") ?: JSONObject()
        val points = json.optInt("points", 1)
        val playsLeft = json.optInt("playsLeft", 0).coerceAtLeast(0)
        val balance = json.optInt("balance", 0).coerceAtLeast(0)

        return when (game) {
            "cat-cups" -> PlayMiniGameResult.CatCupsSuccess(
                playId = playId,
                hiddenUnder = outcome.optInt("hiddenUnder", 0),
                won = outcome.optBoolean("won", false),
                points = points,
                playsLeft = playsLeft,
                balance = balance,
            )
            "lucky-paw" -> PlayMiniGameResult.LuckyPawSuccess(
                playId = playId,
                treat = outcome.optInt("treat", points),
                points = points,
                playsLeft = playsLeft,
                balance = balance,
            )
            else -> PlayMiniGameResult.Failure("unknown_game", errorMessage("unknown_game"))
        }
    }
}
