package com.brewnicat.connect.ui.kit

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeEffect
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

/** Space a page must leave at the bottom for what floats over it (the tab bar, the cart pill). */
val LocalBottomInset = compositionLocalOf { 0.dp }

/**
 * A screen in the kit's grouped style. The content scrolls under a floating bar:
 * a Liquid Glass back button, the title (large in the content, small in the bar
 * once that has scrolled away), and trailing actions. [pinned] stays under the bar;
 * [bottomBar] is a glass panel fixed to the bottom.
 */
@Composable
fun Page(
    title: String,
    onBack: (() -> Unit)? = null,
    largeTitle: Boolean = true,
    trailing: (@Composable RowScope.() -> Unit)? = null,
    pinned: (@Composable () -> Unit)? = null,
    bottomBar: (@Composable ColumnScope.() -> Unit)? = null,
    state: LazyListState = rememberLazyListState(),
    content: LazyListScope.() -> Unit,
) {
    val c = Kit.colors
    val density = LocalDensity.current
    val backdrop = rememberHazeState()
    val statusBar = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val navBar = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    val barHeight: Dp = if (onBack != null || trailing != null) 52.dp else 44.dp
    var pinnedPx by remember { mutableIntStateOf(0) }
    var titlePx by remember { mutableIntStateOf(0) }
    var footerPx by remember { mutableIntStateOf(0) }
    val scrolled by remember(state) { derivedStateOf { state.firstVisibleItemIndex > 0 || state.firstVisibleItemScrollOffset > 4 } }
    val titleGone by remember(state, largeTitle) {
        derivedStateOf { !largeTitle || state.firstVisibleItemIndex > 0 || state.firstVisibleItemScrollOffset > with(density) { 34.dp.toPx() } }
    }
    // The pinned slot rides under the large title, then sticks below the bar.
    val stuck by remember(state, largeTitle) {
        derivedStateOf { !largeTitle || state.firstVisibleItemIndex > 0 || state.firstVisibleItemScrollOffset >= titlePx }
    }
    val pinnedHeight = with(density) { pinnedPx.toDp() }
    val edge by animateFloatAsState(if (scrolled) 1f else 0f, label = "scrollEdge")
    val edgeHeight by animateDpAsState(statusBar + barHeight + (if (pinned != null && stuck) pinnedHeight else 0.dp) + 20.dp, label = "edgeHeight")
    val inlineTitle by animateFloatAsState(if (titleGone) 1f else 0f, label = "inlineTitle")
    // While the keyboard is open the bar steps aside, so it never covers the field being typed in.
    @OptIn(ExperimentalLayoutApi::class)
    val keyboardOpen = WindowInsets.isImeVisible
    val showBottomBar = bottomBar != null && !keyboardOpen
    val bottom = if (showBottomBar) with(density) { footerPx.toDp() } else if (keyboardOpen) 0.dp else LocalBottomInset.current.coerceAtLeast(navBar)

    Box(Modifier.fillMaxSize().background(c.grouped).imePadding()) {
        LazyColumn(
            Modifier.fillMaxSize().hazeSource(backdrop),
            state = state,
            contentPadding = PaddingValues(
                top = statusBar + barHeight + (if (largeTitle) 0.dp else pinnedHeight),
                bottom = bottom + 28.dp,
            ),
        ) {
            if (largeTitle) {
                // Always exactly one leading item, so callers can count on their own items starting at index 1.
                item(key = "page-title") {
                    Column {
                        Text(
                            title, style = KitType.largeTitle, color = c.label,
                            modifier = Modifier.onSizeChanged { titlePx = it.height }.padding(start = Gutter + 4.dp, end = Gutter, top = 4.dp, bottom = 6.dp).semantics { heading() },
                        )
                        if (pinned != null) Spacer(Modifier.height(pinnedHeight))
                    }
                }
            }
            content()
        }

        CompositionLocalProvider(LocalBackdrop provides backdrop) {
            // Scroll edge: content blurs and fades out under the bar instead of meeting a hard line.
            Box(
                Modifier.fillMaxWidth().height(edgeHeight).hazeEffect(
                    backdrop,
                    HazeStyle(
                        backgroundColor = c.grouped, tint = HazeTint(c.grouped.copy(alpha = 0.76f)), blurRadius = 16.dp, noiseFactor = 0f,
                        fallbackTint = HazeTint(c.grouped),
                    ),
                ) {
                    alpha = edge
                    mask = Brush.verticalGradient(0f to Color.Black, 0.7f to Color.Black, 1f to Color.Transparent)
                },
            )
            Column(Modifier.fillMaxWidth().padding(top = statusBar)) {
                Box(Modifier.fillMaxWidth().height(barHeight).padding(horizontal = Gutter), contentAlignment = Alignment.Center) {
                    if (onBack != null) GlassIconButton(KitIcons.ChevronLeft, "Back", onBack, Modifier.align(Alignment.CenterStart))
                    Text(
                        title, style = KitType.headline, color = c.label, maxLines = 1, textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 64.dp).graphicsLayer { alpha = inlineTitle }.then(if (largeTitle) Modifier else Modifier.semantics { heading() }),
                    )
                    if (trailing != null) {
                        Row(Modifier.align(Alignment.CenterEnd), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically, content = trailing)
                    }
                }
                if (pinned != null) {
                    Box(
                        Modifier.fillMaxWidth().offset {
                            val rest = if (!largeTitle || state.firstVisibleItemIndex > 0) 0 else (titlePx - state.firstVisibleItemScrollOffset).coerceAtLeast(0)
                            IntOffset(0, rest)
                        }.onSizeChanged { pinnedPx = it.height },
                    ) { pinned() }
                }
            }
            if (showBottomBar && bottomBar != null) {
                val shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp)
                Column(
                    Modifier.align(Alignment.BottomCenter).fillMaxWidth().onSizeChanged { footerPx = it.height }
                        .glass(shape).padding(start = Gutter, end = Gutter, top = 14.dp, bottom = navBar + 12.dp),
                    content = bottomBar,
                )
            }
        }
    }
}

/** A glass capsule text action for the bar's trailing side. */
@Composable
fun BarAction(text: String, onClick: () -> Unit, destructive: Boolean = false) {
    val c = Kit.colors
    Box(Modifier.pressable(onClick = onClick).height(44.dp).glass().padding(horizontal = 16.dp), contentAlignment = Alignment.Center) {
        Text(text, style = KitType.body.medium, color = if (destructive) c.red else c.label, maxLines = 1)
    }
}

/** A full-width block in a page's list, with the page's side margins. */
@Composable
fun Block(modifier: Modifier = Modifier, top: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.fillMaxWidth().padding(horizontal = Gutter).padding(top = top), content = content)
}
