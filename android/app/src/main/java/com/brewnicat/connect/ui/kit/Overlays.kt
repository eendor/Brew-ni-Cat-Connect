package com.brewnicat.connect.ui.kit

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class Toast(val text: String, val icon: ImageVector, val actionLabel: String?, val onAction: (() -> Unit)?)

internal class OverlayEntry(val content: @Composable () -> Unit)

/**
 * Where sheets, alerts and the toast banner are drawn: above every screen and the
 * tab bar, but inside the same window so they can blur what is behind them.
 */
@Stable
class OverlayHost {
    internal val entries = mutableStateListOf<OverlayEntry>()
    var toast by mutableStateOf<Toast?>(null)
        private set

    val modal: Boolean get() = entries.isNotEmpty()

    fun toast(text: String, icon: ImageVector = KitIcons.CircleCheck, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
        toast = Toast(text, icon, actionLabel, onAction)
    }

    fun clearToast() { toast = null }
}

val LocalOverlayHost = staticCompositionLocalOf<OverlayHost> { error("No OverlayHost") }

/** Shows [content] in the overlay layer for as long as this call stays in the composition. */
@Composable
fun Overlay(content: @Composable () -> Unit) {
    val host = LocalOverlayHost.current
    val current by rememberUpdatedState(content)
    DisposableEffect(host) {
        val entry = OverlayEntry { current() }
        host.entries += entry
        onDispose { host.entries -= entry }
    }
}

/** Draws the host's overlays and toast. Call last in the root, above everything else. */
@Composable
fun OverlayLayer(host: OverlayHost) {
    val elevated = Kit.colors.elevated()
    CompositionLocalProvider(LocalKitColors provides elevated) {
        host.entries.forEach { entry -> androidx.compose.runtime.key(entry) { entry.content() } }
    }
    ToastBanner(host)
}

@Composable
private fun ToastBanner(host: OverlayHost) {
    val c = Kit.colors
    val toast = host.toast
    var shown by remember { mutableStateOf<Toast?>(null) }
    if (toast != null) shown = toast
    LaunchedEffect(toast) {
        if (toast != null) {
            delay(3500)
            host.clearToast()
        }
    }
    Box(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 12.dp, vertical = 6.dp), contentAlignment = Alignment.TopCenter) {
        AnimatedVisibility(
            toast != null,
            enter = slideInVertically(spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessMediumLow)) { -it * 2 } + fadeIn(),
            exit = slideOutVertically(tween(220)) { -it * 2 } + fadeOut(tween(180)),
        ) {
            val t = shown ?: return@AnimatedVisibility
            Row(
                Modifier.widthIn(max = 480.dp).fillMaxWidth().glass(RoundedCornerShape(26.dp)).padding(start = 14.dp, end = 8.dp, top = 8.dp, bottom = 8.dp)
                    .heightIn(min = 40.dp).semantics { liveRegion = LiveRegionMode.Polite },
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(t.icon, null, tint = c.tint, size = 22.dp)
                Text(t.text, style = KitType.subhead.medium, color = c.label, modifier = Modifier.weight(1f), maxLines = 3)
                if (t.actionLabel != null && t.onAction != null) {
                    KitButton(t.actionLabel, { host.clearToast(); t.onAction.invoke() }, style = ButtonStyle.Prominent, size = ButtonSize.Small)
                }
            }
        }
    }
}

/**
 * The kit's sheet: a floating Liquid Glass panel inset from the screen edges, with a
 * grabber, a glass close button, a centred title and an optional pinned footer.
 * [content] and [footer] receive `dismiss`, which animates the sheet away and then
 * calls [onDismiss]. Dragging down, tapping outside and Back all dismiss.
 */
@Composable
fun Sheet(
    onDismiss: () -> Unit,
    title: String? = null,
    trailing: (@Composable (dismiss: () -> Unit) -> Unit)? = null,
    footer: (@Composable ColumnScope.(dismiss: () -> Unit) -> Unit)? = null,
    content: @Composable ColumnScope.(dismiss: () -> Unit) -> Unit,
) {
    Overlay {
        val c = Kit.colors
        val scope = rememberCoroutineScope()
        val shown = remember { Animatable(0f) }
        val drag = remember { Animatable(0f) }
        var heightPx by remember { mutableStateOf(0) }
        var leaving by remember { mutableStateOf(false) }
        val latestDismiss by rememberUpdatedState(onDismiss)
        val dismiss: () -> Unit = {
            if (!leaving) {
                leaving = true
                scope.launch {
                    shown.animateTo(0f, tween(230))
                    latestDismiss()
                }
            }
        }
        LaunchedEffect(Unit) { shown.animateTo(1f, spring(dampingRatio = 0.86f, stiffness = Spring.StiffnessMediumLow)) }
        BackHandler(onBack = dismiss)

        fun settle(velocity: Float) {
            if (drag.value > heightPx * 0.28f || velocity > 1400f) dismiss()
            else scope.launch { drag.animateTo(0f, spring(dampingRatio = 0.8f)) }
        }
        val connection = remember {
            object : NestedScrollConnection {
                override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                    if (drag.value > 0f && available.y < 0f) {
                        val used = available.y.coerceAtLeast(-drag.value)
                        scope.launch { drag.snapTo(drag.value + used) }
                        return Offset(0f, used)
                    }
                    return Offset.Zero
                }

                override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                    if (available.y > 0f && source == NestedScrollSource.UserInput) {
                        scope.launch { drag.snapTo(drag.value + available.y) }
                        return Offset(0f, available.y)
                    }
                    return Offset.Zero
                }

                override suspend fun onPreFling(available: Velocity): Velocity {
                    if (drag.value > 0f) {
                        settle(available.y)
                        return available
                    }
                    return Velocity.Zero
                }
            }
        }
        val headerDrag = rememberDraggableState { delta -> scope.launch { drag.snapTo((drag.value + delta).coerceAtLeast(0f)) } }

        val statusBar = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
        val navBar = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
        BoxWithConstraints(Modifier.fillMaxSize()) {
            Box(
                Modifier.fillMaxSize().graphicsLayer { alpha = shown.value * (1f - (drag.value / (heightPx.coerceAtLeast(1) * 1.4f)).coerceIn(0f, 1f)) }
                    .background(c.scrim).clickable(interactionSource = null, indication = null, onClickLabel = "Close", onClick = dismiss),
            )
            val shape = RoundedCornerShape(36.dp)
            Column(
                Modifier.align(Alignment.BottomCenter).imePadding()
                    .padding(start = 8.dp, end = 8.dp, bottom = navBar.coerceAtLeast(8.dp) + 2.dp)
                    .widthIn(max = 560.dp).fillMaxWidth()
                    .heightIn(max = maxHeight - statusBar - navBar.coerceAtLeast(8.dp) - 14.dp)
                    .onSizeChanged { heightPx = it.height }
                    .graphicsLayer { translationY = (1f - shown.value) * (heightPx + 200f) + drag.value }
                    .glass(shape, tint = c.grouped, tintAlpha = if (c.dark) 0.86f else 0.9f)
                    .clickable(interactionSource = null, indication = null) {}
                    .nestedScroll(connection)
                    .semantics { if (title != null) paneTitle = title },
            ) { CompositionLocalProvider(LocalBackdrop provides null) {
                Box(
                    Modifier.fillMaxWidth().draggable(headerDrag, Orientation.Vertical, onDragStopped = { settle(it) }),
                ) {
                    Box(Modifier.align(Alignment.TopCenter).padding(top = 6.dp).size(36.dp, 5.dp).clip(CircleShape).background(c.label3))
                    Box(Modifier.fillMaxWidth().padding(top = 16.dp, start = 14.dp, end = 14.dp, bottom = 6.dp).heightIn(min = 44.dp), contentAlignment = Alignment.Center) {
                        GlassIconButton(KitIcons.X, "Close", dismiss, Modifier.align(Alignment.CenterStart))
                        if (title != null) {
                            Text(title, style = KitType.headline, color = c.label, maxLines = 2, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 56.dp).semantics { heading() })
                        }
                        if (trailing != null) Box(Modifier.align(Alignment.CenterEnd)) { trailing(dismiss) }
                    }
                }
                Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(bottom = if (footer == null) 20.dp else 12.dp)) { content(dismiss) }
                if (footer != null) Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp)) { footer(dismiss) }
            } }
        }
    }
}

/**
 * The kit's alert: a glass card with a bold title, a grey message, and two capsule
 * buttons side by side (grey secondary, tinted primary).
 */
@Composable
fun Alert(title: String, message: String, primary: String, onPrimary: () -> Unit, secondary: String, onDismiss: () -> Unit, destructive: Boolean = false) {
    Overlay {
        val c = Kit.colors
        val shown = remember { Animatable(0f) }
        LaunchedEffect(Unit) { shown.animateTo(1f, spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessMedium)) }
        BackHandler(onBack = onDismiss)
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Box(Modifier.fillMaxSize().graphicsLayer { alpha = shown.value }.background(c.scrim).clickable(interactionSource = null, indication = null, onClick = onDismiss))
            Column(
                Modifier.padding(24.dp).widthIn(max = 320.dp).fillMaxWidth()
                    .graphicsLayer { alpha = shown.value.coerceIn(0f, 1f); val s = 0.9f + 0.1f * shown.value; scaleX = s; scaleY = s }
                    .glass(RoundedCornerShape(32.dp), tint = c.grouped, tintAlpha = if (c.dark) 0.8f else 0.84f)
                    .clickable(interactionSource = null, indication = null) {}
                    .padding(start = 22.dp, end = 22.dp, top = 22.dp, bottom = 16.dp)
                    .semantics { paneTitle = title },
            ) {
                Text(title, style = KitType.headline, color = c.label, modifier = Modifier.semantics { heading() })
                Text(message, style = KitType.subhead, color = c.label2, modifier = Modifier.padding(top = 6.dp))
                Row(Modifier.fillMaxWidth().padding(top = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    KitButton(secondary, onDismiss, Modifier.weight(1f), style = ButtonStyle.Gray, size = ButtonSize.Medium)
                    KitButton(primary, onPrimary, Modifier.weight(1f), style = if (destructive) ButtonStyle.Destructive else ButtonStyle.Prominent, size = ButtonSize.Medium)
                }
            }
        }
    }
}

/** Spacer that keeps the last rows of a sheet clear of its rounded bottom edge. */
@Composable
fun SheetSpacer() = Box(Modifier.height(8.dp))
