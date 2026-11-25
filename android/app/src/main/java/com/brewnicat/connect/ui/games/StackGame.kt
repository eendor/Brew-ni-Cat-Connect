package com.brewnicat.connect.ui.games

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R
import com.brewnicat.connect.data.Stack
import com.brewnicat.connect.data.StackState
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.pressable
import kotlin.math.max

@Composable
fun StackGame(paused: Boolean, onFinish: (Int) -> Unit) {
    var s by remember { mutableStateOf(StackState()) }
    val isPaused by rememberUpdatedState(paused)
    val haptic = LocalHapticFeedback.current
    val block = ImageBitmap.imageResource(R.drawable.game_stack_block)
    val sliding = ImageBitmap.imageResource(R.drawable.game_stack_block_lit)

    LaunchedEffect(Unit) {
        var last = 0L
        while (!s.over) {
            withFrameNanos { now ->
                if (last != 0L && !isPaused) s = Stack.advance(s, ((now - last) / 1_000_000_000f).coerceIn(0f, 0.05f))
                last = now
            }
        }
        onFinish(s.height)
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HudChip("${s.height}", strong = true, icon = "cup")
            if (s.perfects > 0) HudChip("${s.perfects} perfect", icon = "sparkle")
        }
        Canvas(
            Modifier.fillMaxWidth().weight(1f).clip(RoundedCornerShape(28.dp))
                .background(Brush.verticalGradient(if (Kit.colors.dark) listOf(Color(0xFF3A2A1A), Color(0xFF1C1C1E)) else listOf(Color(0xFFFFE3C2), Color(0xFFF6EEE1))))
                .pressable(enabled = !paused) {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    s = Stack.drop(s)
                }
                .semantics { contentDescription = "Tap to drop the cup" },
        ) {
            val cupH = size.width * 0.085f
            val baseY = size.height - cupH * 1.2f
            // Scroll the camera so the top of the tower stays in view.
            val lift = max(0f, (s.tower.size - 7) * cupH)
            // Each cup is the pixel-art block as a 9-slice, so it can be any width.
            val blockH = cupH * 0.92f
            fun cup(image: ImageBitmap, x: Float, w: Float, y: Float) =
                drawNineSlice(image, x * size.width, y, w * size.width, blockH, GameSprites.BLOCK_SLICE, blockH / image.height)
            s.tower.forEachIndexed { i, (x, w) -> cup(block, x, w, baseY - i * cupH + lift) }
            if (!s.over) cup(sliding, s.x, s.width, baseY - s.tower.size * cupH + lift - cupH * 0.2f)
        }
    }
}
