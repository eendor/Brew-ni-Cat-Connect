package com.brewnicat.connect.ui

import com.brewnicat.connect.data.Arcade
import com.brewnicat.connect.data.Memory
import com.brewnicat.connect.data.TreatKind
import com.brewnicat.connect.ui.games.GameSprites
import com.brewnicat.connect.ui.games.wholeScale
import java.io.DataInputStream
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** TC-P9-117: the games draw only the Aseprite pixel art the app ships (ADR-032). */
class GameSpritesTest {
    private val res = File("src/main/res/drawable-nodpi")

    /** A PNG's width and height, from its IHDR chunk. */
    private fun pngSize(file: File): Pair<Int, Int> = DataInputStream(file.inputStream()).use {
        it.skipBytes(16)
        it.readInt() to it.readInt()
    }

    @Test
    fun everyIconTheGamesUseIsASprite() {
        val used = Arcade.GAMES.map { it.icon } + Memory.FACES + TreatKind.entries.map { it.icon } +
            listOf("heart", "heart-empty", "trophy", "flame", "sparkle", "clock", "paw-white", "mouse-gold")
        for (name in used) assertTrue("no sprite for $name", name in GameSprites.ICONS)
        assertEquals("milk tea", Memory.faceName("tea"))
    }

    @Test
    fun theIconsMatchTheWebsiteAndEveryFrameShips() {
        val web = File("../../src/lib/games/sprites.ts").readText()
            .substringAfter("GAME_ICONS = [").substringBefore("]")
            .let { list -> Regex("\"([a-z-]+)\"").findAll(list).map { it.groupValues[1] }.toList() }
        assertEquals(web, GameSprites.ICONS.keys.toList())
        for (name in web) assertEquals(name, 16 to 16, pngSize(File(res, "game_${name.replace('-', '_')}.png")))
        assertEquals(40 to 36, pngSize(File(res, "game_hiding_cup.png")))
        assertEquals(40 to 36, pngSize(File(res, "game_hiding_cup_lit.png")))
        assertEquals(48 to 56, pngSize(File(res, "game_treat_jar.png")))
        assertEquals(16 to 12, pngSize(File(res, "game_stack_block.png")))
        assertEquals(16 to 12, pngSize(File(res, "game_stack_block_lit.png")))
    }

    @Test
    fun noGameDrawsAnEmoji() {
        val emoji = Regex("[\\x{2600}-\\x{27BF}\\x{1F000}-\\x{1FFFF}]")
        val sources = File("src/main/java/com/brewnicat/connect/ui/games").listFiles().orEmpty().toList() +
            File("src/main/java/com/brewnicat/connect/data/Arcade.kt") +
            File("src/main/java/com/brewnicat/connect/ui/screens/GamesDialog.kt")
        assertTrue(sources.size > 3)
        for (file in sources) assertFalse("emoji in ${file.name}", emoji.containsMatchIn(file.readText()))
    }

    @Test
    fun spritesScaleByWholePixels() {
        assertEquals(1, wholeScale(0.2f))
        assertEquals(3, wholeScale(2.75f))
        assertEquals(8, wholeScale(8.25f))
    }
}
