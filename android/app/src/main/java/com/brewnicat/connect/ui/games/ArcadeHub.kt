package com.brewnicat.connect.ui.games

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.brewnicat.connect.data.Arcade
import com.brewnicat.connect.data.ArcadeGame
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.Group
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.bold
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.semibold

/** One tile colour per game, from the kit's system colours. */
@Composable
private fun tileColor(id: String): Color {
    val c = Kit.colors
    return when (id) {
        "catch" -> c.teal
        "whack" -> c.brown
        "stack" -> c.orange
        "simon" -> c.purple
        "memory" -> c.pink
        else -> c.tint
    }
}

@Composable
private fun GameTile(game: ArcadeGame, size: Int) {
    val color = tileColor(game.id)
    Box(
        Modifier.size(size.dp).clip(RoundedCornerShape((size * 0.27f).dp))
            .background(Brush.verticalGradient(listOf(color.copy(alpha = 0.55f), color))),
        contentAlignment = Alignment.Center,
    ) { PixelIcon(game.icon, (size * 0.6f).dp) }
}

/** The "Just for fun" section of the games sheet. Free play: nothing is sent or earned. */
@Composable
fun ArcadeList(bestOf: (String) -> Int?, onPlay: (ArcadeGame) -> Unit) {
    val c = Kit.colors
    Section(header = "Just for fun", footer = "Free play, no coins. Beat your own best!") {
        Arcade.GAMES.forEach { game ->
            val best = bestOf(game.id)
            ListRow(
                title = game.name,
                subtitle = game.blurb,
                leading = { GameTile(game, 40) },
                trailing = { if (best == null) Badge("Play") else Badge("Best $best", color = c.orange) },
                chevron = true,
                onClick = { onPlay(game) },
            )
        }
    }
}

/** "1 cup", "3 cups": drops the plural s for one. */
internal fun amount(n: Int, unit: String): String = "$n ${if (n == 1 && unit.endsWith("s")) unit.dropLast(1) else unit}"

private enum class Phase { Intro, Playing, Over }

/**
 * Full-screen host for one arcade game. Pauses while the app is in the
 * background and keeps the order status on top, so "Ready for pickup" is never hidden.
 */
@Composable
fun ArcadeDialog(
    game: ArcadeGame,
    best: Int?,
    orderBanner: Pair<String, Boolean>?,
    onResult: (score: Int) -> Boolean,
    onClose: () -> Unit,
) {
    var phase by remember { mutableStateOf(Phase.Intro) }
    var round by remember { mutableIntStateOf(0) }
    var score by remember { mutableIntStateOf(0) }
    var newBest by remember { mutableStateOf(false) }
    var shownBest by remember { mutableStateOf(best) }
    val paused = rememberAppPaused()

    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        val c = Kit.colors
        val view = LocalView.current
        DisposableEffect(view, c.dark) {
            (view.parent as? DialogWindowProvider)?.window?.let { window ->
                WindowCompat.getInsetsController(window, view).apply {
                    isAppearanceLightStatusBars = !c.dark
                    isAppearanceLightNavigationBars = !c.dark
                }
            }
            onDispose {}
        }
        Box(Modifier.fillMaxSize().background(c.grouped)) {
            Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(game.name, style = KitType.title1.bold, color = c.label, modifier = Modifier.semantics { heading() })
                        Text(
                            shownBest?.let { "Your best: ${amount(it, game.unit)}" } ?: "Free play",
                            style = KitType.subhead, color = c.label2,
                        )
                    }
                    Box(
                        Modifier.size(36.dp).clip(CircleShape).background(c.fill3)
                            .pressable(onClick = onClose).semantics { contentDescription = "Close ${game.name}" },
                        contentAlignment = Alignment.Center,
                    ) { Icon(KitIcons.X, null, tint = c.label2, size = 18.dp) }
                }
                if (orderBanner != null) {
                    val ready = orderBanner.second
                    Notice(
                        if (ready) "${orderBanner.first}! Head to the counter to pick it up." else "Your order: ${orderBanner.first}",
                        Modifier.padding(top = 12.dp),
                        warning = ready,
                    )
                }
                Spacer(Modifier.height(14.dp))
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    when (phase) {
                        Phase.Intro -> Panel(game, game.name, game.blurb, "Start", onClose) { phase = Phase.Playing }
                        Phase.Playing -> key(round) {
                            GameHost(game.id, paused) { final ->
                                score = final
                                newBest = onResult(final)
                                if (newBest) shownBest = final
                                phase = Phase.Over
                            }
                        }
                        Phase.Over -> Panel(
                            game,
                            if (newBest) "New best!" else "Nice try!",
                            "You got ${amount(score, game.unit)}.",
                            "Play again", onClose, trophy = newBest,
                        ) { round++; phase = Phase.Playing }
                    }
                }
            }
        }
    }
}

@Composable
private fun GameHost(id: String, paused: Boolean, onFinish: (Int) -> Unit) {
    when (id) {
        "catch" -> CatchGame(paused, onFinish)
        "whack" -> WhackGame(paused, onFinish)
        "stack" -> StackGame(paused, onFinish)
        "simon" -> SimonGame(paused, onFinish)
        "memory" -> MemoryGame(paused, onFinish)
    }
}

@Composable
private fun Panel(
    game: ArcadeGame,
    title: String,
    body: String,
    action: String,
    onClose: () -> Unit,
    trophy: Boolean = false,
    onAction: () -> Unit,
) {
    val c = Kit.colors
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Group {
            Cell {
                Column(
                    Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (trophy) {
                        Box(Modifier.size(84.dp).clip(RoundedCornerShape(23.dp)).background(c.yellow), contentAlignment = Alignment.Center) {
                            PixelIcon("trophy", 56.dp)
                        }
                    } else {
                        GameTile(game, 84)
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(title, style = KitType.title2.bold, color = c.label, textAlign = TextAlign.Center)
                    Text(body, style = KitType.body, color = c.label2, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(8.dp))
                    KitButton(action, onAction, Modifier.fillMaxWidth())
                    KitButton("Back to my order", onClose, Modifier.fillMaxWidth(), style = ButtonStyle.Plain)
                }
            }
        }
    }
}

/** True while the app is not in the foreground, so a running game can freeze. */
@Composable
fun rememberAppPaused(): Boolean {
    val owner = LocalLifecycleOwner.current
    var paused by remember { mutableStateOf(false) }
    DisposableEffect(owner) {
        val observer = LifecycleEventObserver { _, _ ->
            paused = !owner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)
        }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
    return paused
}

/** A small capsule for a game's score line, with an optional pixel-art [icon]. */
@Composable
fun HudChip(text: String, modifier: Modifier = Modifier, strong: Boolean = false, icon: String? = null) {
    val c = Kit.colors
    Row(
        modifier.clip(CircleShape).background(if (strong) c.tintFill else c.cell)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) PixelIcon(icon, 16.dp)
        Text(text, style = KitType.subhead.semibold, color = if (strong) c.onTint else c.label)
    }
}
