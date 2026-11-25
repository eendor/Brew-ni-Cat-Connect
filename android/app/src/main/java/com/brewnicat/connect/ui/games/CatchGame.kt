package com.brewnicat.connect.ui.games

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R
import com.brewnicat.connect.data.Catch
import com.brewnicat.connect.data.CatchState
import com.brewnicat.connect.data.TreatKind
import com.brewnicat.connect.ui.kit.Kit
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.random.Random

@Composable
fun CatchGame(paused: Boolean, onFinish: (Int) -> Unit) {
    val rnd = remember { Random.Default }
    var s by remember { mutableStateOf(CatchState()) }
    val isPaused by rememberUpdatedState(paused)
    val treats = TreatKind.entries.associateWith { ImageBitmap.imageResource(GameSprites.icon(it.icon)) }
    val cat = ImageBitmap.imageResource(R.drawable.cat_kulas)
    var facing by remember { mutableFloatStateOf(1f) }
    fun moveTo(x: Float) {
        if (abs(x - s.catX) > 0.005f) facing = if (x < s.catX) -1f else 1f
        s = Catch.moveCat(s, x)
    }

    LaunchedEffect(Unit) {
        var last = 0L
        while (!s.over) {
            withFrameNanos { now ->
                if (last != 0L && !isPaused) s = Catch.step(s, ((now - last) / 1_000_000_000f).coerceIn(0f, 0.05f), rnd)
                last = now
            }
        }
        onFinish(s.score)
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HudChip("${s.timeLeftSec.toInt() + 1}s", icon = "clock")
            HudChip("${s.score}", strong = true, icon = "fish")
            LivesChip(s.lives)
        }
        Canvas(
            Modifier.fillMaxWidth().weight(1f).clip(RoundedCornerShape(28.dp))
                .background(Brush.verticalGradient(if (Kit.colors.dark) listOf(Color(0xFF15324A), Color(0xFF1C1C1E)) else listOf(Color(0xFFBFE3F2), Color(0xFFF6EEE1))))
                .pointerInput(Unit) {
                    detectDragGestures { change, _ -> moveTo(change.position.x / size.width) }
                }
                .pointerInput(Unit) { detectTapGestures { moveTo(it.x / size.width) } }
                .semantics { contentDescription = "Game board. Drag left and right to move the cat." },
        ) {
            drawRect(Color(0xFFB98B5E), topLeft = Offset(0f, size.height * 0.95f), size = androidx.compose.ui.geometry.Size(size.width, size.height * 0.05f))
            val item = wholeScale(size.width * 0.095f / 16f) * 16
            for (f in s.items) {
                val at = IntOffset((f.x * size.width).roundToInt() - item / 2, (f.y * size.height).roundToInt() - item / 2)
                drawPixels(treats.getValue(f.kind), at, IntSize(item, item))
            }
            // Kulas walks a step every 1/40 of the board, facing the way he moves.
            val catScale = wholeScale(size.width * 0.28f / 48f)
            val catW = 48 * catScale
            val catH = 40 * catScale
            val catLeft = (s.catX * size.width).roundToInt() - catW / 2
            val catTop = (size.height * 0.965f).roundToInt() - catH
            val frame = (s.catX * 40).toInt().coerceAtLeast(0) % 6
            scale(facing, 1f, pivot = Offset(s.catX * size.width, catTop + catH / 2f)) {
                drawImage(
                    image = cat,
                    srcOffset = IntOffset(frame * 48, 0),
                    srcSize = IntSize(48, 40),
                    dstOffset = IntOffset(catLeft, catTop),
                    dstSize = IntSize(catW, catH),
                    filterQuality = FilterQuality.None,
                )
            }
        }
    }
}
