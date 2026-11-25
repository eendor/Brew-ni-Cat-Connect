package com.brewnicat.connect.ui.games

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Simon
import com.brewnicat.connect.data.SimonState
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.Kit
import kotlin.random.Random
import kotlinx.coroutines.delay

private val PAD_NAMES = listOf("Green paw", "Orange paw", "Blue paw", "Pink paw")
private val PAD_ON = listOf(Color(0xFF3DBE7A), Color(0xFFFF9F43), Color(0xFF4DA3FF), Color(0xFFFF6FA5))
private val PAD_OFF = listOf(Color(0xFF2B7A52), Color(0xFFB8702F), Color(0xFF3A74B8), Color(0xFFB84D77))

@Composable
fun SimonGame(paused: Boolean, onFinish: (Int) -> Unit) {
    val rnd = remember { Random.Default }
    var s by remember { mutableStateOf(Simon.nextRound(SimonState(), rnd)) }
    var lit by remember { mutableIntStateOf(-1) }
    var showing by remember { mutableStateOf(true) }
    var round by remember { mutableIntStateOf(1) }
    val haptic = LocalHapticFeedback.current

    // Play the pattern for this round, then hand over to the player.
    LaunchedEffect(round) {
        showing = true
        delay(700)
        val ms = Simon.showMs(s.sequence.size)
        for (pad in s.sequence) {
            while (paused) delay(100)
            lit = pad; delay(ms); lit = -1; delay(160)
        }
        showing = false
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HudChip("Round ${s.sequence.size}", icon = "paw")
            HudChip(if (showing) "Watch the paws…" else "Your turn!", strong = !showing)
        }
        Text(
            if (showing) "Remember the order" else "Tap the same order (${s.input}/${s.sequence.size})",
            style = KitType.subhead, color = Kit.colors.label2, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
        )
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            for (row in 0..1) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    for (col in 0..1) {
                        val pad = row * 2 + col
                        val color by animateColorAsState(if (lit == pad) PAD_ON[pad] else PAD_OFF[pad], tween(90), label = "pad")
                        Box(
                            Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(30.dp)).background(color)
                                .pressable(enabled = !showing && !s.over && !paused) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    val (next, complete) = Simon.tap(s, pad)
                                    s = next
                                    lit = pad
                                    if (next.over) onFinish(next.rounds)
                                    else if (complete) { s = Simon.nextRound(next, rnd); round++ }
                                }
                                .semantics { contentDescription = PAD_NAMES[pad] },
                            contentAlignment = Alignment.Center,
                        ) { PixelIcon("paw-white", 64.dp, alpha = if (lit == pad) 1f else 0.7f) }
                    }
                }
            }
        }
    }
    // Un-light the tapped pad shortly after a tap.
    LaunchedEffect(lit, showing) {
        if (!showing && lit >= 0) { delay(200); lit = -1 }
    }
}
