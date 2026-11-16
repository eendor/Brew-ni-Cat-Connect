package com.brewnicat.connect.data

import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ArcadeTest {
    @Test fun `every game has a unique id and the lower-is-better rule only for memory`() {
        assertEquals(Arcade.GAMES.size, Arcade.GAMES.map { it.id }.toSet().size)
        assertTrue(Arcade.isBetter("memory", 12, 20))
        assertFalse(Arcade.isBetter("memory", 25, 20))
        assertTrue(Arcade.isBetter("catch", 30, 20))
        assertFalse(Arcade.isBetter("catch", 10, 20))
        assertTrue(Arcade.isBetter("stack", 1, null))
        assertFalse(Arcade.isBetter("simon", 0, null))
    }

    // ----- memory
    @Test fun `deal makes every face appear exactly twice`() {
        val s = Memory.deal(Random(1))
        assertEquals(16, s.faces.size)
        assertTrue(s.faces.groupBy { it }.values.all { it.size == 2 })
    }

    @Test fun `a matching pair stays matched and a mismatch must be cleared`() {
        val s0 = MemoryState(faces = listOf(0, 1, 0, 1))
        val s1 = Memory.flip(Memory.flip(s0, 0), 2)
        assertEquals(setOf(0, 2), s1.matched)
        assertEquals(1, s1.moves)
        val m = Memory.flip(Memory.flip(s1, 1), 1) // same card again: ignored
        assertEquals(setOf(1), m.revealed)
        val bad = Memory.flip(Memory.flip(MemoryState(faces = listOf(0, 1, 0, 1)), 0), 1)
        assertNotNull(bad.pending)
        assertEquals(bad, Memory.flip(bad, 2)) // locked while the mismatch is showing
        val cleared = Memory.clearMismatch(bad)
        assertNull(cleared.pending)
        assertTrue(cleared.revealed.isEmpty())
        assertEquals(1, cleared.moves)
    }

    @Test fun `memory is won when every card is matched`() {
        var s = MemoryState(faces = listOf(0, 0, 1, 1))
        for ((a, b) in listOf(0 to 1, 2 to 3)) s = Memory.flip(Memory.flip(s, a), b)
        assertTrue(s.won)
        assertEquals(2, s.moves)
    }

    // ----- whack
    @Test fun `whacking the mouse scores and an empty hole breaks the combo`() {
        val up = WhackState(mouse = 4, mouseLeftMs = 800, combo = 2)
        val hit = Whack.whack(up, 4, Random(1))
        assertEquals(1, hit.score)
        assertEquals(3, hit.combo)
        assertNull(hit.mouse)
        val miss = Whack.whack(up, 5, Random(1))
        assertEquals(0, miss.combo)
        assertEquals(1, miss.misses)
        assertEquals(4, miss.mouse)
    }

    @Test fun `golden mice and streaks score more`() {
        val golden = Whack.whack(WhackState(mouse = 0, golden = true, mouseLeftMs = 500), 0, Random(1))
        assertEquals(3, golden.score)
        val streak = Whack.whack(WhackState(mouse = 0, mouseLeftMs = 500, combo = 4), 0, Random(1))
        assertEquals(2, streak.score)
    }

    @Test fun `a mouse that gets away costs the streak and mice get quicker`() {
        val gone = Whack.tick(WhackState(mouse = 1, mouseLeftMs = 100, combo = 5), 200, Random(1))
        assertNull(gone.mouse)
        assertEquals(0, gone.combo)
        assertEquals(1, gone.misses)
        assertTrue(Whack.lifetimeMs(WHACK_MS, false) > Whack.lifetimeMs(5_000, false))
        assertTrue(Whack.lifetimeMs(WHACK_MS, true) < Whack.lifetimeMs(WHACK_MS, false))
    }

    @Test fun `whack spawns after the gap and ends when time runs out`() {
        var s = WhackState(gapMs = 100)
        s = Whack.tick(s, 150, Random(2))
        assertNotNull(s.mouse)
        assertTrue(s.mouse!! in 0 until Whack.HOLES)
        val end = Whack.tick(WhackState(timeLeftMs = 50, mouse = 3, mouseLeftMs = 900), 100, Random(2))
        assertTrue(end.over)
        assertNull(end.mouse)
        assertEquals(end, Whack.tick(end, 100, Random(2)))
    }

    // ----- catch
    @Test fun `the cat catches treats it is under and loses a life to chilis`() {
        val rnd = Random(3)
        val fish = Catch.step(CatchState(catX = 0.5f, items = listOf(Faller(0.5f, 0.87f, TreatKind.FISH)), spawnIn = 5f), 0.1f, rnd)
        assertEquals(1, fish.score)
        assertTrue(fish.items.isEmpty())
        val tea = Catch.step(CatchState(catX = 0.5f, items = listOf(Faller(0.55f, 0.87f, TreatKind.TEA)), spawnIn = 5f), 0.1f, rnd)
        assertEquals(3, tea.score)
        val chili = Catch.step(CatchState(catX = 0.5f, items = listOf(Faller(0.5f, 0.87f, TreatKind.CHILI)), spawnIn = 5f), 0.1f, rnd)
        assertEquals(2, chili.lives)
        assertEquals(0, chili.score)
    }

    @Test fun `treats far from the cat fall past and chilis that are missed cost nothing`() {
        val s = Catch.step(
            CatchState(catX = 0.1f, items = listOf(Faller(0.9f, 0.9f, TreatKind.FISH), Faller(0.9f, 1.05f, TreatKind.CHILI)), spawnIn = 5f),
            0.2f, Random(1),
        )
        assertEquals(0, s.score)
        assertEquals(3, s.lives)
        assertTrue(s.items.none { it.y > 1.06f })
    }

    @Test fun `the cat stays on screen, spawning is steady and the game ends on lives or time`() {
        assertEquals(0.08f, Catch.moveCat(CatchState(), -3f).catX, 0.0001f)
        assertEquals(0.92f, Catch.moveCat(CatchState(), 3f).catX, 0.0001f)
        var s = CatchState(spawnIn = 0f)
        s = Catch.step(s, 0.016f, Random(4))
        assertEquals(1, s.items.size)
        assertTrue(CatchState(lives = 0).over)
        assertTrue(CatchState(timeLeftSec = 0f).over)
        assertTrue(Catch.speed(40f) > Catch.speed(0f))
    }

    // ----- stack
    @Test fun `a cup that overlaps is trimmed and a perfect drop keeps the full width`() {
        val s = StackState(tower = listOf(0.3f to 0.4f), x = 0.5f, width = 0.4f)
        val dropped = Stack.drop(s)
        assertFalse(dropped.over)
        assertEquals(1, dropped.height)
        assertEquals(0.5f, dropped.tower.last().first, 0.0001f)
        assertEquals(0.2f, dropped.tower.last().second, 0.0001f)
        val perfect = Stack.drop(StackState(tower = listOf(0.3f to 0.4f), x = 0.305f, width = 0.4f))
        assertEquals(1, perfect.perfects)
        assertEquals(0.4f, perfect.tower.last().second, 0.0001f)
    }

    @Test fun `a cup that misses the tower ends the game`() {
        val s = Stack.drop(StackState(tower = listOf(0.0f to 0.2f), x = 0.7f, width = 0.2f))
        assertTrue(s.over)
        assertEquals(s, Stack.drop(s))
    }

    @Test fun `the sliding cup bounces off both walls and speeds up`() {
        var s = StackState(x = 0.55f, width = 0.4f, dir = 1)
        s = Stack.advance(s, 1f)
        assertEquals(-1, s.dir)
        assertEquals(0.6f, s.x, 0.0001f)
        var l = StackState(x = 0.05f, width = 0.4f, dir = -1)
        l = Stack.advance(l, 1f)
        assertEquals(1, l.dir)
        assertEquals(0f, l.x, 0.0001f)
        assertTrue(Stack.speed(20) > Stack.speed(0))
    }

    // ----- simon
    @Test fun `each round adds one pad and a wrong tap ends the game`() {
        var s = Simon.nextRound(SimonState(), Random(5))
        s = Simon.nextRound(s, Random(5))
        assertEquals(2, s.sequence.size)
        assertEquals(1, s.rounds)
        val (ok, done) = Simon.tap(s, s.sequence[0])
        assertFalse(done)
        val (finished, complete) = Simon.tap(ok, s.sequence[1])
        assertTrue(complete)
        assertFalse(finished.over)
        val wrongPad = (s.sequence[0] + 1) % Simon.PADS
        val (lost, _) = Simon.tap(s, wrongPad)
        assertTrue(lost.over)
        assertEquals(1, lost.rounds)
    }

    @Test fun `longer patterns are shown faster but never too fast`() {
        assertTrue(Simon.showMs(1) > Simon.showMs(10))
        assertEquals(280L, Simon.showMs(50))
    }
}
