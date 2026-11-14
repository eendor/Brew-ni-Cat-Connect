package com.brewnicat.connect.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.brewnicat.connect.R
import com.brewnicat.connect.data.GamesParsers
import com.brewnicat.connect.data.MiniGameInfo
import com.brewnicat.connect.data.PlayMiniGameResult
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.theme.Brand
import kotlin.math.roundToInt
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class CatMode(val row: Int) {
    WALK(0),
    LOOK(1),
    MEOW(2),
}

@Composable
fun CatPixelSprite(
    @DrawableRes resId: Int,
    mode: CatMode = CatMode.LOOK,
    animating: Boolean = false,
    size: DpSize = DpSize(72.dp, 60.dp),
) {
    val sheet = ImageBitmap.imageResource(resId)
    var frame by remember { mutableIntStateOf(0) }
    LaunchedEffect(animating) {
        if (!animating) {
            frame = 0
            return@LaunchedEffect
        }
        while (true) {
            delay(110L)
            frame = (frame + 1) % 6
        }
    }
    Canvas(Modifier.size(size)) {
        drawImage(
            image = sheet,
            srcOffset = IntOffset(frame * 48, mode.row * 40),
            srcSize = IntSize(48, 40),
            dstOffset = IntOffset.Zero,
            dstSize = IntSize(this.size.width.roundToInt(), this.size.height.roundToInt()),
            filterQuality = FilterQuality.None,
        )
    }
}

@Composable
fun MiniGamesDialog(vm: AppViewModel) {
    val statusState = vm.gameStatus
    val signedIn = vm.session != null

    Dialog(
        onDismissRequest = { vm.closeGamesPopup() },
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .heightIn(max = 720.dp),
            shape = MaterialTheme.shapes.extraLarge,
            color = Brand.colors.canvas,
            tonalElevation = 4.dp,
        ) {
            Column(
                Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    CatPixelSprite(R.drawable.cat_kulas, CatMode.LOOK, animating = false, size = DpSize(64.dp, 54.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Play while you wait",
                            style = MaterialTheme.typography.titleLarge,
                            color = Brand.colors.ink,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            "Earn loyalty points while the shop prepares your order.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Brand.colors.muted,
                        )
                    }
                    IconButton(onClick = { vm.closeGamesPopup() }) {
                        Icon(Icons.Rounded.Close, contentDescription = "Close games", tint = Brand.colors.ink)
                    }
                }

                when (statusState) {
                    Loadable.Loading -> Box(
                        Modifier.fillMaxWidth().padding(28.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = Brand.colors.accent)
                    }
                    is Loadable.Failed -> Card(Modifier.fillMaxWidth()) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(statusState.message, style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink, textAlign = TextAlign.Center)
                            TextButton(onClick = { vm.loadMiniGames() }) { Text("Try again", color = Brand.colors.accent) }
                        }
                    }
                    is Loadable.Ready -> {
                        val status = statusState.value
                        if (status == null) {
                            Card(Modifier.fillMaxWidth()) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    CatPixelSprite(R.drawable.cat_kulas, CatMode.LOOK)
                                    Text("The cats are still setting up", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                                    Text("Mini-games aren't open on this shop yet.", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted, textAlign = TextAlign.Center)
                                }
                            }
                        } else {
                            if (!signedIn) {
                                Card(Modifier.fillMaxWidth()) {
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    ) {
                                        Text(
                                            "Sign in with Google on Account to earn points when you play.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Brand.colors.ink,
                                            modifier = Modifier.weight(1f),
                                        )
                                        OutlinedButton(onClick = {
                                            vm.closeGamesPopup()
                                            vm.selectTab(Screen.Account)
                                        }) { Text("Sign in", color = Brand.colors.accent) }
                                    }
                                }
                            } else {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Pill(
                                        text = GamesParsers.playsLeftLabel(status.playsLeft),
                                        color = Brand.colors.accent,
                                        background = Brand.colors.accentSurface,
                                    )
                                    vm.loyaltyBalance?.let { bal ->
                                        Pill(
                                            text = "$bal pts",
                                            color = Brand.colors.strong,
                                            background = Brand.colors.warm,
                                        )
                                    }
                                }
                                if (status.playsLeft <= 0) {
                                    Notice("You've played all your games for today. Your plays reset tomorrow.", warning = false)
                                }
                            }

                            val outOfPlays = !signedIn || status.playsLeft <= 0
                            status.games.find { it.id == "cat-cups" }?.let { info ->
                                CatCupsCard(info = info, disabled = outOfPlays || vm.gamePlaying) { choice ->
                                    vm.playCatCups(choice)
                                }
                            }
                            status.games.find { it.id == "lucky-paw" }?.let { info ->
                                LuckyPawCard(info = info, disabled = outOfPlays || vm.gamePlaying) {
                                    vm.playLuckyPaw()
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
private fun CatCupsCard(
    info: MiniGameInfo,
    disabled: Boolean,
    onPick: suspend (Int) -> PlayMiniGameResult,
) {
    val scope = rememberCoroutineScope()
    val shufflePulse = remember { Animatable(0f) }
    var picked by remember { mutableStateOf<Int?>(null) }
    var hiddenUnder by remember { mutableStateOf<Int?>(null) }
    var won by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    Card(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(info.name, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
            Text(
                buildString {
                    append(info.description)
                    if (info.winPoints != null && info.tryPoints != null) {
                        append(" ${info.winPoints} pts for a find, ${info.tryPoints} pt for trying.")
                    }
                },
                style = MaterialTheme.typography.bodySmall,
                color = Brand.colors.muted,
            )

            Row(
                Modifier.fillMaxWidth().padding(top = 24.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom,
            ) {
                for (cup in 0..2) {
                    val lifted = picked == cup || hiddenUnder == cup
                    val liftDp by animateDpAsState(
                        targetValue = if (lifted) (-42).dp else 0.dp,
                        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                        label = "cupLift$cup",
                    )
                    Box(
                        Modifier
                            .size(width = 76.dp, height = 84.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .clickable(enabled = !disabled && !busy && hiddenUnder == null) {
                                busy = true
                                picked = cup
                                statusMessage = null
                                scope.launch {
                                    shufflePulse.animateTo(8f)
                                    shufflePulse.animateTo(-8f)
                                    shufflePulse.animateTo(0f)
                                    when (val res = onPick(cup)) {
                                        is PlayMiniGameResult.CatCupsSuccess -> {
                                            hiddenUnder = res.hiddenUnder
                                            won = res.won
                                            statusMessage = if (res.won) {
                                                "You found Oreo! +${GamesParsers.pointsLabel(res.points)}"
                                            } else {
                                                "Oreo was under cup ${res.hiddenUnder + 1}. +${GamesParsers.pointsLabel(res.points)} for playing"
                                            }
                                        }
                                        is PlayMiniGameResult.Failure -> {
                                            picked = null
                                            statusMessage = res.message
                                        }
                                        else -> Unit
                                    }
                                    busy = false
                                }
                            },
                        contentAlignment = Alignment.BottomCenter,
                    ) {
                        if (hiddenUnder == cup) {
                            CatPixelSprite(
                                resId = R.drawable.cat_oreo,
                                mode = if (won) CatMode.MEOW else CatMode.LOOK,
                                animating = won,
                                size = DpSize(64.dp, 54.dp),
                            )
                        }
                        Box(
                            Modifier
                                .offset {
                                    val sway = shufflePulse.value * if (cup == 1) -1f else 1f
                                    IntOffset(sway.dp.roundToPx(), liftDp.roundToPx())
                                }
                                .alpha(if (disabled && hiddenUnder == null) 0.55f else 1f),
                        ) {
                            CupGraphic(cup + 1, picked == cup)
                        }
                    }
                }
            }

            Text(
                text = statusMessage ?: "Which cup is Oreo under?",
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.colors.ink,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            if (hiddenUnder != null && !busy) {
                OutlinedButton(
                    onClick = {
                        hiddenUnder = null
                        picked = null
                        won = false
                        statusMessage = null
                    },
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text("Hide him again", color = Brand.colors.accent)
                }
            }
        }
    }
}

@Composable
private fun LuckyPawCard(
    info: MiniGameInfo,
    disabled: Boolean,
    onShake: suspend () -> PlayMiniGameResult,
) {
    val scope = rememberCoroutineScope()
    val shakeAngle = remember { Animatable(0f) }
    var treat by remember { mutableStateOf<Int?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    Card(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Column(Modifier.fillMaxWidth()) {
                Text(info.name, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                Text(
                    "${info.description} Up to ${GamesParsers.pointsLabel(info.maxPoints)}.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Brand.colors.muted,
                )
            }

            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Box(Modifier.graphicsLayer { rotationZ = shakeAngle.value }) {
                    JarGraphic()
                }
                CatPixelSprite(
                    resId = R.drawable.cat_latte,
                    mode = if (treat != null) CatMode.MEOW else CatMode.LOOK,
                    animating = treat != null || busy,
                    size = DpSize(72.dp, 60.dp),
                )
            }

            Text(
                text = statusMessage ?: "Shake the jar to see what Latte finds.",
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.colors.ink,
                textAlign = TextAlign.Center,
            )

            PrimaryButton(
                text = if (busy) "Shaking…" else "Shake the jar",
                enabled = !disabled,
                busy = busy,
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    busy = true
                    treat = null
                    statusMessage = null
                    scope.launch {
                        for (deg in listOf(-14f, 12f, -10f, 8f, -4f, 0f)) {
                            shakeAngle.animateTo(deg)
                        }
                        when (val res = onShake()) {
                            is PlayMiniGameResult.LuckyPawSuccess -> {
                                treat = res.treat
                                statusMessage = "Latte pawed out ${GamesParsers.pointsLabel(res.treat)}!"
                            }
                            is PlayMiniGameResult.Failure -> statusMessage = res.message
                            else -> Unit
                        }
                        busy = false
                    }
                },
            )
        }
    }
}

@Composable
private fun CupGraphic(number: Int, highlighted: Boolean) {
    val fill = if (highlighted) Brand.colors.strong else Brand.colors.accentFill
    val outline = Brand.colors.ink
    val stripe = Brand.colors.card
    Box(Modifier.size(64.dp, 60.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(64.dp, 60.dp)) {
            val w = size.width
            val h = size.height
            val path = Path().apply {
                moveTo(w * 0.14f, h * 0.90f)
                lineTo(w * 0.25f, h * 0.12f)
                lineTo(w * 0.75f, h * 0.12f)
                lineTo(w * 0.86f, h * 0.90f)
                close()
            }
            drawPath(path, color = fill)
            drawPath(path, color = outline, style = Stroke(width = 4f))
            drawRoundRect(
                color = outline,
                topLeft = Offset(w * 0.08f, h * 0.86f),
                size = Size(w * 0.84f, h * 0.12f),
                cornerRadius = CornerRadius(6f, 6f),
            )
            drawLine(stripe.copy(alpha = 0.7f), Offset(w * 0.30f, h * 0.38f), Offset(w * 0.70f, h * 0.38f), strokeWidth = 5f)
        }
        Text(
            "$number",
            style = MaterialTheme.typography.labelLarge,
            color = Color.White,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Composable
private fun JarGraphic() {
    val glass = Brand.colors.warm
    val outline = Brand.colors.ink
    val lid = Brand.colors.ink
    val treat = Brand.colors.strong
    Canvas(Modifier.size(72.dp, 84.dp)) {
        val w = size.width
        val h = size.height
        drawRoundRect(
            color = lid,
            topLeft = Offset(w * 0.22f, h * 0.04f),
            size = Size(w * 0.56f, h * 0.12f),
            cornerRadius = CornerRadius(8f, 8f),
        )
        drawRoundRect(
            color = glass,
            topLeft = Offset(w * 0.12f, h * 0.18f),
            size = Size(w * 0.76f, h * 0.78f),
            cornerRadius = CornerRadius(18f, 18f),
        )
        drawRoundRect(
            color = outline,
            topLeft = Offset(w * 0.12f, h * 0.18f),
            size = Size(w * 0.76f, h * 0.78f),
            cornerRadius = CornerRadius(18f, 18f),
            style = Stroke(width = 4f),
        )
        for ((cx, cy) in listOf(0.32f to 0.76f, 0.50f to 0.82f, 0.66f to 0.74f, 0.42f to 0.62f, 0.58f to 0.60f)) {
            drawCircle(treat, radius = w * 0.08f, center = Offset(w * cx, h * cy))
        }
    }
}
