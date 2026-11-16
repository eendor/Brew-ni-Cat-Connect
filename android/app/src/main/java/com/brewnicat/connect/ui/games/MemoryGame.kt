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
import androidx.compose.foundation.shape.RoundedCornerShape
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import androidx.compose.ui.unit.sp
import com.brewnicat.connect.data.Memory
import com.brewnicat.connect.data.MemoryState
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitIcons
import kotlin.random.Random
import kotlinx.coroutines.delay

@Composable
fun MemoryGame(paused: Boolean, onFinish: (Int) -> Unit) {
    var s by remember { mutableStateOf(Memory.deal(Random.Default)) }
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(s.pending) {
        if (s.pending != null) {
            delay(750)
            s = Memory.clearMismatch(s)
        }
    }
    LaunchedEffect(s.won) {
        if (s.won) {
            delay(700)
            onFinish(s.moves)
        }
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HudChip("Moves ${s.moves}")
            HudChip("Pairs ${s.matched.size / 2}/${s.faces.size / 2}", strong = true)
        }
        val cols = 4
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            s.faces.chunked(cols).forEachIndexed { r, row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEachIndexed { c, face ->
                        val i = r * cols + c
                        Box(Modifier.weight(1f)) {
                            MemoryCard(
                                face = Memory.FACES[face % Memory.FACES.size],
                                up = i in s.revealed || i in s.matched,
                                matched = i in s.matched,
                            ) {
                                if (!paused) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    s = Memory.flip(s, i)
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
private fun MemoryCard(face: String, up: Boolean, matched: Boolean, onClick: () -> Unit) {
    val turn by animateFloatAsState(if (up) 180f else 0f, spring(dampingRatio = 0.7f, stiffness = 260f), label = "flip")
    val shape = RoundedCornerShape(18.dp)
    Box(
        Modifier.fillMaxWidth().aspectRatio(0.82f)
            .graphicsLayer { rotationY = turn; cameraDistance = 14f * density }
            .clip(shape)
            .background(
                if (turn > 90f) Brush.verticalGradient(listOf(Kit.colors.cell, if (matched) Kit.colors.tint.copy(alpha = 0.18f) else Kit.colors.cell))
                else Brush.linearGradient(listOf(Kit.colors.tintFill, Kit.colors.tint.copy(alpha = 0.75f))),
            )
            .border(1.dp, Kit.colors.separator, shape)
            .pressable(enabled = !up, onClick = onClick)
            .semantics { contentDescription = if (up) "Card $face" else "Face-down card" },
        contentAlignment = Alignment.Center,
    ) {
        if (turn > 90f) {
            Text(face, style = KitType.body.copy(fontSize = 34.sp), modifier = Modifier.graphicsLayer { rotationY = 180f })
        } else {
            Icon(KitIcons.PawPrint, null, tint = Color.White.copy(alpha = 0.6f), size = 30.dp)
        }
    }
}
