package com.brewnicat.connect.ui.games

import android.graphics.Paint
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.brewnicat.connect.data.Catch
import com.brewnicat.connect.data.CatchState
import com.brewnicat.connect.data.TreatKind
import com.brewnicat.connect.ui.kit.Kit
import kotlin.random.Random

@Composable
fun CatchGame(paused: Boolean, onFinish: (Int) -> Unit) {
    val rnd = remember { Random.Default }
    var s by remember { mutableStateOf(CatchState()) }
    val isPaused by rememberUpdatedState(paused)
    val paint = remember { Paint().apply { textAlign = Paint.Align.CENTER; isAntiAlias = true } }

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
            HudChip("⏱ ${s.timeLeftSec.toInt() + 1}s")
            HudChip("🐟 ${s.score}", strong = true)
            HudChip("❤️".repeat(s.lives.coerceAtLeast(0)).ifEmpty { "💔" })
        }
        Canvas(
            Modifier.fillMaxWidth().weight(1f).clip(RoundedCornerShape(28.dp))
                .background(Brush.verticalGradient(if (Kit.colors.dark) listOf(Color(0xFF15324A), Color(0xFF1C1C1E)) else listOf(Color(0xFFBFE3F2), Color(0xFFF6EEE1))))
                .pointerInput(Unit) {
                    detectDragGestures { change, _ -> s = Catch.moveCat(s, change.position.x / size.width) }
                }
                .pointerInput(Unit) { detectTapGestures { s = Catch.moveCat(s, it.x / size.width) } }
                .semantics { contentDescription = "Game board. Drag left and right to move the cat." },
        ) {
            drawRect(Color(0xFFB98B5E), topLeft = Offset(0f, size.height * 0.95f), size = androidx.compose.ui.geometry.Size(size.width, size.height * 0.05f))
            drawIntoCanvas { canvas ->
                val native = canvas.nativeCanvas
                paint.textSize = size.width * 0.095f
                for (f in s.items) {
                    val e = if (f.kind == TreatKind.CHILI) TreatKind.CHILI.emoji else f.kind.emoji
                    native.drawText(e, f.x * size.width, f.y * size.height, paint)
                }
                paint.textSize = size.width * 0.17f
                native.drawText("🐱", s.catX * size.width, (Catch.CAT_Y + 0.07f) * size.height, paint)
            }
        }
    }
}
