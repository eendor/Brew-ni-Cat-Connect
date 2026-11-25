package com.brewnicat.connect.data

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/*
 * Free-play arcade games for the waiting screen. They are played for fun only:
 * no points, no network, nothing sent anywhere. The loyalty-point games stay
 * server-decided (Games.kt). Every rule below is a pure function of its state
 * and an injected Random, so it is covered by plain JVM tests.
 */

/** [icon] names the game's pixel-art icon (GameSprites.ICONS). */
data class ArcadeGame(val id: String, val name: String, val icon: String, val blurb: String, val unit: String)

object Arcade {
    val GAMES = listOf(
        ArcadeGame("catch", "Treat Catcher", "fish", "Slide the cat to catch fish and milk tea. Dodge the chilis!", "treats"),
        ArcadeGame("whack", "Whack-a-Mouse", "mouse", "Mice pop out of the holes. Tap them fast; golden ones are worth more.", "points"),
        ArcadeGame("stack", "Cup Stack", "cup", "Tap to drop each sliding cup. Line them up to build the tallest tower.", "cups"),
        ArcadeGame("simon", "Paw Says", "paw", "Watch the paws light up, then repeat the pattern. It gets longer each round.", "rounds"),
        ArcadeGame("memory", "Cat Match", "card", "Flip the cards and find all the matching pairs in the fewest moves.", "moves"),
    )

    fun byId(id: String): ArcadeGame? = GAMES.firstOrNull { it.id == id }

    /** For "moves" a lower score is better; for every other game higher wins. A zero never counts. */
    fun isBetter(gameId: String, score: Int, best: Int?): Boolean =
        score > 0 && (best == null || if (gameId == "memory") score < best else score > best)
}

/* ---------- Cat Match (memory) ---------- */

data class MemoryState(
    val faces: List<Int>,
    val revealed: Set<Int> = emptySet(),
    val matched: Set<Int> = emptySet(),
    val moves: Int = 0,
    /** A mismatched pair waiting to be turned back over. */
    val pending: Pair<Int, Int>? = null,
) {
    val won: Boolean get() = matched.size == faces.size
}

object Memory {
    const val PAIRS = 8
    /** The cards' faces, by pixel-art icon. */
    val FACES = listOf("cat", "tea", "fries", "fish", "milk", "ramen", "paw", "coffee")

    /** What a screen reader calls a face. */
    fun faceName(face: String): String = if (face == "tea") "milk tea" else face

    fun deal(rnd: Random, pairs: Int = PAIRS): MemoryState =
        MemoryState(faces = (0 until pairs).flatMap { listOf(it, it) }.shuffled(rnd))

    fun flip(s: MemoryState, i: Int): MemoryState {
        if (s.pending != null || i !in s.faces.indices || i in s.matched || i in s.revealed) return s
        val open = s.revealed.firstOrNull() ?: return s.copy(revealed = setOf(i))
        val moves = s.moves + 1
        return if (s.faces[open] == s.faces[i]) {
            s.copy(revealed = emptySet(), matched = s.matched + open + i, moves = moves)
        } else {
            s.copy(revealed = setOf(open, i), moves = moves, pending = open to i)
        }
    }

    fun clearMismatch(s: MemoryState): MemoryState =
        if (s.pending == null) s else s.copy(revealed = emptySet(), pending = null)
}

/* ---------- Whack-a-Mouse (reflex) ---------- */

data class WhackState(
    val timeLeftMs: Int = WHACK_MS,
    val mouse: Int? = null,
    val golden: Boolean = false,
    val mouseLeftMs: Int = 0,
    val gapMs: Int = 350,
    val score: Int = 0,
    val combo: Int = 0,
    val bestCombo: Int = 0,
    val misses: Int = 0,
    val spawned: Int = 0,
) {
    val over: Boolean get() = timeLeftMs <= 0
}

const val WHACK_MS = 30_000

object Whack {
    const val HOLES = 9

    /** Mice stay up less time as the round goes on. */
    fun lifetimeMs(timeLeftMs: Int, golden: Boolean): Int {
        val elapsed = WHACK_MS - timeLeftMs
        val base = max(520, 1100 - elapsed / 60)
        return if (golden) (base * 0.7f).toInt() else base
    }

    fun tick(s: WhackState, dtMs: Int, rnd: Random): WhackState {
        if (s.over) return s
        var n = s.copy(timeLeftMs = max(0, s.timeLeftMs - dtMs))
        if (n.over) return n.copy(mouse = null)
        if (n.mouse != null) {
            val left = n.mouseLeftMs - dtMs
            n = if (left <= 0) n.copy(mouse = null, combo = 0, misses = n.misses + 1, gapMs = 250 + rnd.nextInt(350))
            else n.copy(mouseLeftMs = left)
        } else {
            val gap = n.gapMs - dtMs
            if (gap > 0) {
                n = n.copy(gapMs = gap)
            } else {
                val golden = (n.spawned + 1) % 7 == 0
                n = n.copy(mouse = rnd.nextInt(HOLES), golden = golden, mouseLeftMs = lifetimeMs(n.timeLeftMs, golden), spawned = n.spawned + 1)
            }
        }
        return n
    }

    /** Tapping the mouse scores (more with a streak); tapping an empty hole breaks the streak. */
    fun whack(s: WhackState, hole: Int, rnd: Random): WhackState {
        if (s.over) return s
        return if (s.mouse == hole) {
            val combo = s.combo + 1
            val gained = (if (s.golden) 3 else 1) + combo / 5
            s.copy(mouse = null, score = s.score + gained, combo = combo, bestCombo = max(s.bestCombo, combo), gapMs = 200 + rnd.nextInt(300))
        } else {
            s.copy(combo = 0, misses = s.misses + 1)
        }
    }
}

/* ---------- Treat Catcher (catching) ---------- */

enum class TreatKind(val icon: String, val points: Int) { FISH("fish", 1), TEA("tea", 3), CHILI("chili", 0) }

data class Faller(val x: Float, val y: Float, val kind: TreatKind)

data class CatchState(
    val catX: Float = 0.5f,
    val items: List<Faller> = emptyList(),
    val score: Int = 0,
    val lives: Int = 3,
    val timeLeftSec: Float = CATCH_SEC,
    val spawnIn: Float = 0.5f,
    val elapsed: Float = 0f,
) {
    val over: Boolean get() = lives <= 0 || timeLeftSec <= 0f
}

const val CATCH_SEC = 45f

object Catch {
    const val CAT_Y = 0.88f
    const val CATCH_HALF_WIDTH = 0.13f

    fun speed(elapsed: Float): Float = 0.30f + min(0.45f, elapsed * 0.012f)

    fun moveCat(s: CatchState, x: Float): CatchState = s.copy(catX = x.coerceIn(0.08f, 0.92f))

    fun step(s: CatchState, dt: Float, rnd: Random): CatchState {
        if (s.over) return s
        var score = s.score
        var lives = s.lives
        val kept = ArrayList<Faller>(s.items.size + 1)
        for (f in s.items) {
            val moved = f.copy(y = f.y + speed(s.elapsed) * dt)
            if (moved.y >= CAT_Y && moved.y <= CAT_Y + 0.07f && abs(moved.x - s.catX) <= CATCH_HALF_WIDTH) {
                if (moved.kind == TreatKind.CHILI) lives-- else score += moved.kind.points
            } else if (moved.y <= 1.06f) {
                kept.add(moved)
            }
        }
        var spawnIn = s.spawnIn - dt
        if (spawnIn <= 0f) {
            val roll = rnd.nextFloat()
            val kind = when {
                roll < 0.22f -> TreatKind.CHILI
                roll < 0.40f -> TreatKind.TEA
                else -> TreatKind.FISH
            }
            kept.add(Faller(0.08f + rnd.nextFloat() * 0.84f, -0.04f, kind))
            spawnIn = max(0.35f, 0.85f - s.elapsed * 0.01f) + rnd.nextFloat() * 0.25f
        }
        return s.copy(
            items = kept, score = score, lives = lives, spawnIn = spawnIn,
            elapsed = s.elapsed + dt, timeLeftSec = max(0f, s.timeLeftSec - dt),
        )
    }
}

/* ---------- Cup Stack (timing) ---------- */

data class StackState(
    /** Landed cups as (left edge, width) in 0..1 board units, bottom first. */
    val tower: List<Pair<Float, Float>> = listOf(0.3f to 0.4f),
    val x: Float = 0f,
    val width: Float = 0.4f,
    val dir: Int = 1,
    val perfects: Int = 0,
    val over: Boolean = false,
) {
    val height: Int get() = tower.size - 1
}

object Stack {
    const val PERFECT = 0.012f

    fun speed(height: Int): Float = 0.55f + min(1.0f, height * 0.05f)

    fun advance(s: StackState, dt: Float): StackState {
        if (s.over) return s
        var x = s.x + s.dir * speed(s.height) * dt
        var dir = s.dir
        if (x + s.width >= 1f) { x = 1f - s.width; dir = -1 }
        if (x <= 0f) { x = 0f; dir = 1 }
        return s.copy(x = x, dir = dir)
    }

    fun drop(s: StackState): StackState {
        if (s.over) return s
        val (topX, topW) = s.tower.last()
        val left = max(s.x, topX)
        val right = min(s.x + s.width, topX + topW)
        val overlap = right - left
        if (overlap <= 0.005f) return s.copy(over = true)
        val perfect = abs(s.x - topX) <= PERFECT
        val landed = if (perfect) topX to topW else left to overlap
        val nextWidth = if (perfect) min(0.5f, topW + 0.01f) else overlap
        return s.copy(
            tower = s.tower + landed, width = nextWidth, x = if (s.dir > 0) 0f else 1f - nextWidth,
            perfects = s.perfects + if (perfect) 1 else 0,
        )
    }
}

/* ---------- Paw Says (pattern) ---------- */

data class SimonState(
    val sequence: List<Int> = emptyList(),
    val input: Int = 0,
    val over: Boolean = false,
) {
    /** Rounds fully repeated so far. */
    val rounds: Int get() = max(0, sequence.size - 1)
}

object Simon {
    const val PADS = 4

    fun nextRound(s: SimonState, rnd: Random): SimonState = s.copy(sequence = s.sequence + rnd.nextInt(PADS), input = 0)

    /** The player tapped [pad]. Returns the new state and whether the whole round is now complete. */
    fun tap(s: SimonState, pad: Int): Pair<SimonState, Boolean> {
        if (s.over || s.input >= s.sequence.size) return s to false
        if (s.sequence[s.input] != pad) return s.copy(over = true) to false
        val next = s.copy(input = s.input + 1)
        return next to (next.input == next.sequence.size)
    }

    /** Milliseconds each pad stays lit; speeds up in longer rounds. */
    fun showMs(length: Int): Long = max(280L, 560L - length * 20L)
}
