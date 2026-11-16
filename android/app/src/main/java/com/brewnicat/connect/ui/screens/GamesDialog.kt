package com.brewnicat.connect.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R
import com.brewnicat.connect.data.ArcadeGame
import com.brewnicat.connect.data.GamesParsers
import com.brewnicat.connect.data.MiniGameInfo
import com.brewnicat.connect.data.PlayMiniGameResult
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.games.ArcadeDialog
import com.brewnicat.connect.ui.games.ArcadeList
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.Group
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Sheet
import com.brewnicat.connect.ui.kit.SheetSpacer
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.semibold
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

/** The points games, in a kit sheet over the order. */
@Composable
fun MiniGamesDialog(vm: AppViewModel) {
    val statusState = vm.gameStatus
    val signedIn = vm.session != null
    var playing by remember { mutableStateOf<ArcadeGame?>(null) }

    Sheet(onDismiss = { vm.closeGamesPopup() }, title = "Play while you wait") {
        val c = Kit.colors
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(top = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CatPixelSprite(R.drawable.cat_kulas, CatMode.LOOK, animating = true, size = DpSize(64.dp, 54.dp))
            Text("Games to enjoy while the shop prepares your order.", style = KitType.subhead, color = c.label2, modifier = Modifier.weight(1f))
        }
        vm.gamesOrderBanner?.takeIf { it.second }?.let { (label, _) ->
            Notice("$label! Head to the counter to pick it up.", Modifier.padding(horizontal = 16.dp).padding(top = 12.dp), warning = true)
        }

        when (statusState) {
            Loadable.Loading -> LoadingState()
            is Loadable.Failed -> EmptyState(KitIcons.CircleAlert, "Games unavailable", statusState.message, actionLabel = "Try again", onAction = { vm.loadMiniGames() }, warning = true)
            is Loadable.Ready -> {
                val status = statusState.value
                if (status == null) {
                    EmptyState(KitIcons.PawPrint, "The cats are still setting up", "Mini-games aren't open on this shop yet.")
                } else {
                    if (!signedIn) {
                        Section {
                            Cell {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("Sign in with Google on Account to earn points when you play.", style = KitType.subhead, color = c.label, modifier = Modifier.weight(1f))
                                    KitButton("Sign in", { vm.closeGamesPopup(); vm.selectTab(Screen.Account) }, style = ButtonStyle.Tinted, size = ButtonSize.Small)
                                }
                            }
                        }
                    } else {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Badge(GamesParsers.playsLeftLabel(status.playsLeft))
                            vm.loyaltyBalance?.let { bal -> Badge("$bal pts", color = c.orange) }
                        }
                        if (status.playsLeft <= 0) {
                            Notice("You've played all your games for today. Your plays reset tomorrow.", Modifier.padding(horizontal = 16.dp).padding(top = 12.dp))
                        }
                    }

                    val outOfPlays = !signedIn || status.playsLeft <= 0
                    status.games.find { it.id == "cat-cups" }?.let { info ->
                        CatCupsCard(info = info, disabled = outOfPlays || vm.gamePlaying) { choice -> vm.playCatCups(choice) }
                    }
                    status.games.find { it.id == "lucky-paw" }?.let { info ->
                        LuckyPawCard(info = info, disabled = outOfPlays || vm.gamePlaying) { vm.playLuckyPaw() }
                    }
                }
            }
        }

        ArcadeList(bestOf = vm::arcadeBest) { playing = it }
        SheetSpacer()
    }

    playing?.let { game ->
        ArcadeDialog(
            game = game,
            best = vm.arcadeBest(game.id),
            orderBanner = vm.gamesOrderBanner,
            onResult = { score -> vm.recordArcade(game.id, score) },
            onClose = { playing = null },
        )
    }
}

@Composable
private fun GameCard(title: String, description: String, content: @Composable ColumnScope.() -> Unit) {
    val c = Kit.colors
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 16.dp)) {
        Group {
            Cell {
                Text(title, style = KitType.headline, color = c.label)
                Text(description, style = KitType.footnote, color = c.label2, modifier = Modifier.padding(top = 2.dp))
                content()
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
    val c = Kit.colors
    val scope = rememberCoroutineScope()
    val shufflePulse = remember { Animatable(0f) }
    var picked by remember { mutableStateOf<Int?>(null) }
    var hiddenUnder by remember { mutableStateOf<Int?>(null) }
    var won by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    GameCard(
        info.name,
        buildString {
            append(info.description)
            if (info.winPoints != null && info.tryPoints != null) {
                append(" ${info.winPoints} pts for a find, ${info.tryPoints} pt for trying.")
            }
        },
    ) {
        Row(
            Modifier.fillMaxWidth().padding(top = 40.dp),
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
                        .semantics { contentDescription = "Cup ${cup + 1}" }
                        .pressable(enabled = !disabled && !busy && hiddenUnder == null, role = Role.Button) {
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
                        }
                        .clip(RoundedCornerShape(14.dp)),
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
            style = KitType.body.semibold,
            color = c.label,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )

        if (hiddenUnder != null && !busy) {
            KitButton(
                "Hide him again",
                {
                    hiddenUnder = null
                    picked = null
                    won = false
                    statusMessage = null
                },
                Modifier.align(Alignment.CenterHorizontally).padding(top = 10.dp),
                style = ButtonStyle.Tinted, size = ButtonSize.Small,
            )
        }
    }
}

@Composable
private fun LuckyPawCard(
    info: MiniGameInfo,
    disabled: Boolean,
    onShake: suspend () -> PlayMiniGameResult,
) {
    val c = Kit.colors
    val scope = rememberCoroutineScope()
    val shakeAngle = remember { Animatable(0f) }
    var treat by remember { mutableStateOf<Int?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    GameCard(info.name, "${info.description} Up to ${GamesParsers.pointsLabel(info.maxPoints)}.") {
        Row(
            Modifier.fillMaxWidth().padding(top = 16.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
        ) {
            Box(Modifier.graphicsLayer { rotationZ = shakeAngle.value }) { JarGraphic() }
            CatPixelSprite(
                resId = R.drawable.cat_latte,
                mode = if (treat != null) CatMode.MEOW else CatMode.LOOK,
                animating = treat != null || busy,
                size = DpSize(72.dp, 60.dp),
            )
        }

        Text(
            text = statusMessage ?: "Shake the jar to see what Latte finds.",
            style = KitType.body.semibold,
            color = c.label,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )

        KitButton(
            if (busy) "Shaking…" else "Shake the jar",
            {
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
            Modifier.fillMaxWidth().padding(top = 12.dp),
            size = ButtonSize.Medium,
            enabled = !disabled,
            busy = busy,
        )
    }
}

@Composable
private fun CupGraphic(number: Int, highlighted: Boolean) {
    val c = Kit.colors
    val fill = if (highlighted) c.orange else c.tintFill
    val outline = c.label
    val stripe = Color.White
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
            drawPath(path, color = outline.copy(alpha = 0.85f), style = Stroke(width = 4f))
            drawRoundRect(
                color = outline,
                topLeft = Offset(w * 0.08f, h * 0.86f),
                size = Size(w * 0.84f, h * 0.12f),
                cornerRadius = CornerRadius(6f, 6f),
            )
            drawLine(stripe.copy(alpha = 0.6f), Offset(w * 0.30f, h * 0.38f), Offset(w * 0.70f, h * 0.38f), strokeWidth = 5f)
        }
        Text("$number", style = KitType.headline, color = Color.White, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun JarGraphic() {
    val c = Kit.colors
    val glass = c.fill
    val outline = c.label2
    val lid = c.brown
    val treat = c.orange
    Canvas(Modifier.size(72.dp, 84.dp)) {
        val w = size.width
        val h = size.height
        drawRoundRect(lid, topLeft = Offset(w * 0.22f, h * 0.04f), size = Size(w * 0.56f, h * 0.12f), cornerRadius = CornerRadius(8f, 8f))
        drawRoundRect(glass, topLeft = Offset(w * 0.12f, h * 0.18f), size = Size(w * 0.76f, h * 0.78f), cornerRadius = CornerRadius(18f, 18f))
        drawRoundRect(outline, topLeft = Offset(w * 0.12f, h * 0.18f), size = Size(w * 0.76f, h * 0.78f), cornerRadius = CornerRadius(18f, 18f), style = Stroke(width = 4f))
        for ((cx, cy) in listOf(0.32f to 0.76f, 0.50f to 0.82f, 0.66f to 0.74f, 0.42f to 0.62f, 0.58f to 0.60f)) {
            drawCircle(treat, radius = w * 0.08f, center = Offset(w * cx, h * cy))
        }
    }
}
