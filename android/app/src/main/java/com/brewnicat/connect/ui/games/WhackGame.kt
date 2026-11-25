package com.brewnicat.connect.ui.games

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Whack
import com.brewnicat.connect.data.WhackState
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.Kit
import kotlin.random.Random

@Composable
fun WhackGame(paused: Boolean, onFinish: (Int) -> Unit) {
    val rnd = remember { Random.Default }
    var s by remember { mutableStateOf(WhackState()) }
    val isPaused by rememberUpdatedState(paused)
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(Unit) {
        var last = 0L
        while (!s.over) {
            androidx.compose.runtime.withFrameNanos { now ->
                if (last != 0L && !isPaused) s = Whack.tick(s, ((now - last) / 1_000_000L).toInt().coerceIn(0, 100), rnd)
                last = now
            }
        }
        onFinish(s.score)
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HudChip("${(s.timeLeftMs + 999) / 1000}s", icon = "clock")
            HudChip("Score ${s.score}", strong = true, icon = "mouse")
            if (s.combo >= 2) HudChip("x${s.combo}", icon = "flame")
        }
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            for (row in 0..2) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    for (col in 0..2) {
                        val hole = row * 3 + col
                        Box(Modifier.weight(1f)) {
                            Hole(up = s.mouse == hole, golden = s.golden) {
                                if (!paused) {
                                    if (s.mouse == hole) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    s = Whack.whack(s, hole, rnd)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Hole(up: Boolean, golden: Boolean, onTap: () -> Unit) {
    val rise by animateFloatAsState(if (up) 1f else 0f, spring(dampingRatio = 0.5f, stiffness = 700f), label = "rise")
    Box(
        Modifier.fillMaxWidth().aspectRatio(1f).clip(CircleShape)
            .background(Brush.verticalGradient(listOf(Color(0xFF6B4A2B), Color(0xFF3B2814))))
            .border(3.dp, Kit.colors.separator, CircleShape)
            .pressable(onClick = onTap).semantics { contentDescription = if (up) "Mouse" else "Empty hole" },
        contentAlignment = Alignment.Center,
    ) {
        PixelIcon(
            if (golden) "mouse-gold" else "mouse", 48.dp,
            Modifier.graphicsLayer { scaleX = rise; scaleY = rise; translationY = (1f - rise) * 40f; alpha = rise },
        )
    }
}
