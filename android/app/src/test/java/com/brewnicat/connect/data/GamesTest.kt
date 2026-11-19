package com.brewnicat.connect.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GamesTest {
    @Test
    fun parsesStatusAndGames() {
        val status = GamesParsers.parseStatus(
            JSONObject(
                """
                {
                  "dailyPlays": 3,
                  "playsToday": 1,
                  "playsLeft": 2,
                  "games": [
                    {
                      "id": "cat-cups",
                      "name": "Cat cups",
                      "description": "Oreo hides under one of three cups. Find him!",
                      "choices": 3,
                      "winPoints": 3,
                      "tryPoints": 1,
                      "maxPoints": 3
                    },
                    {
                      "id": "lucky-paw",
                      "name": "Lucky paw",
                      "description": "Shake the treat jar and see what Latte paws out.",
                      "choices": 0,
                      "winPoints": null,
                      "tryPoints": null,
                      "maxPoints": 5
                    }
                  ]
                }
                """.trimIndent(),
            ),
        )
        assertNotNull(status)
        assertEquals(3, status!!.dailyPlays)
        assertEquals(2, status.playsLeft)
        assertEquals(2, status.games.size)
        assertEquals("cat-cups", status.games[0].id)
        assertEquals(3, status.games[0].winPoints)
        assertEquals(null, status.games[1].winPoints)
        assertEquals(5, status.games[1].maxPoints)
    }

    @Test
    fun parsesCatCupsAndLuckyPawAndFailureResults() {
        val cups = GamesParsers.parsePlayResult(
            JSONObject("""{"ok":true,"playId":11,"game":"cat-cups","outcome":{"hiddenUnder":2,"won":false},"points":1,"playsLeft":2,"balance":13}"""),
        )
        assertTrue(cups is PlayMiniGameResult.CatCupsSuccess)
        val c = cups as PlayMiniGameResult.CatCupsSuccess
        assertEquals(2, c.hiddenUnder)
        assertFalse(c.won)
        assertEquals(1, c.points)
        assertEquals(13, c.balance)

        val paw = GamesParsers.parsePlayResult(
            JSONObject("""{"ok":true,"playId":12,"game":"lucky-paw","outcome":{"treat":5},"points":5,"playsLeft":0,"balance":18}"""),
        )
        assertTrue(paw is PlayMiniGameResult.LuckyPawSuccess)
        assertEquals(5, (paw as PlayMiniGameResult.LuckyPawSuccess).treat)
        assertEquals(0, paw.playsLeft)

        val limited = GamesParsers.parsePlayResult(
            JSONObject("""{"ok":false,"error":"daily_limit_reached","playsLeft":0}"""),
        )
        assertTrue(limited is PlayMiniGameResult.Failure)
        assertTrue((limited as PlayMiniGameResult.Failure).message.contains("tomorrow"))
        assertEquals(0, limited.playsLeft)
    }

    @Test
    fun parsesAWonPrizeAndTreatsAMissingOneAsNone() {
        val won = GamesParsers.parsePlayResult(
            JSONObject(
                """{"ok":true,"playId":13,"game":"cat-cups","outcome":{"hiddenUnder":1,"won":true},"points":3,"playsLeft":1,"balance":20,""" +
                    """"prize":{"id":"p1","name":"Free cookie","code":"RWD-ABCD2345","expiresAt":"2026-11-26T15:59:59+00:00"}}""",
            ),
        ) as PlayMiniGameResult.CatCupsSuccess
        assertEquals(WonPrize("p1", "Free cookie", "RWD-ABCD2345", "2026-11-26T15:59:59+00:00"), won.prize)
        assertTrue(GamesParsers.prizeLine(won.prize).contains("You won Free cookie! Code RWD-ABCD2345 · Use by Nov 26, 2026"))

        val paw = GamesParsers.parsePlayResult(
            JSONObject("""{"ok":true,"playId":14,"game":"lucky-paw","outcome":{"treat":2},"points":2,"playsLeft":0,"balance":22,"prize":null}"""),
        ) as PlayMiniGameResult.LuckyPawSuccess
        assertNull(paw.prize)
        assertEquals("", GamesParsers.prizeLine(paw.prize))

        // Before the prizes migration the field is absent; a prize without a code is ignored.
        assertNull(GamesParsers.parsePrize(null))
        assertNull(GamesParsers.parsePrize(JSONObject("""{"id":"p1","name":"Free cookie"}""")))
    }

    @Test
    fun detectsMissingFunctionsWaitingStatusesAndLabels() {
        assertTrue(GamesParsers.isMissingFunctionError(404, """{"code":"PGRST202","message":"Could not find the function"}"""))
        assertTrue(GamesParsers.isMissingFunctionError(400, """{"code":"42883"}"""))
        assertFalse(GamesParsers.isMissingFunctionError(401, """{"code":"42501"}"""))

        assertEquals("1 point", GamesParsers.pointsLabel(1))
        assertEquals("3 points", GamesParsers.pointsLabel(3))
        assertEquals("1 play left today", GamesParsers.playsLeftLabel(1))
        assertEquals("No plays left today", GamesParsers.playsLeftLabel(0))
        assertEquals("2 plays left today", GamesParsers.playsLeftLabel(2))

        for (s in listOf("pending", "accepted", "preparing")) {
            assertTrue(s, MiniGamesUiHelper.isWaitingStatus(s))
        }
        for (s in listOf("ready", "completed", "rejected", "cancelled")) {
            assertFalse(s, MiniGamesUiHelper.isWaitingStatus(s))
        }
    }
}
