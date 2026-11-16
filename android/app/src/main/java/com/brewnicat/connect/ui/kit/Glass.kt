package com.brewnicat.connect.ui.kit

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.ClipOp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeEffect

/** What the nearest glass surface blurs: the content scrolling under it. */
val LocalBackdrop = compositionLocalOf<HazeState?> { null }

/** A soft shadow drawn only outside the shape, so it never darkens translucent glass. */
fun Modifier.softShadow(shape: Shape, color: Color, blur: Dp = 24.dp, offsetY: Dp = 8.dp): Modifier = drawBehind {
    val path = Path().apply { addOutline(shape.createOutline(size, layoutDirection, this@drawBehind)) }
    drawIntoCanvas { canvas ->
        val paint = Paint().apply {
            asFrameworkPaint().apply {
                isAntiAlias = true
                this.color = android.graphics.Color.BLACK
                setShadowLayer(blur.toPx(), 0f, offsetY.toPx(), color.toArgb())
            }
        }
        canvas.save()
        canvas.clipPath(path, ClipOp.Difference)
        canvas.drawPath(path, paint)
        canvas.restore()
    }
}

/**
 * Liquid Glass: the backdrop blurred behind a translucent fill, a bright rim that
 * catches light at the top, and a soft shadow. [tint] makes the prominent, coloured
 * variant. Blur needs Android 12; older phones get a near-opaque fill instead.
 */
fun Modifier.glass(shape: Shape = CircleShape, tint: Color? = null, tintAlpha: Float = 0.86f, shadow: Boolean = true): Modifier = composed {
    val c = Kit.colors
    val backdrop = LocalBackdrop.current
    val fill = tint?.copy(alpha = tintAlpha) ?: c.glass
    val fallback = tint ?: c.glassFallback
    val base = if (shadow) softShadow(shape, c.shadow) else this
    val blurred = if (backdrop != null) {
        base.clip(shape).hazeEffect(
            backdrop,
            HazeStyle(backgroundColor = c.grouped, tint = HazeTint(fill), blurRadius = 22.dp, noiseFactor = 0f, fallbackTint = HazeTint(fallback)),
        )
    } else {
        base.clip(shape).background(fallback)
    }
    blurred
        .drawWithContent {
            // A faint sheen across the top, like light on curved glass.
            drawRect(Brush.verticalGradient(listOf(Color.White.copy(alpha = if (c.dark) 0.05f else 0.16f), Color.Transparent), endY = size.height * 0.6f))
            drawContent()
        }
        .border(0.8.dp, Brush.verticalGradient(listOf(c.glassRimTop, c.glassRimBottom)), shape)
}

/** iOS press feedback: the control dips and dims, then springs back. No ripple. */
fun Modifier.pressable(
    enabled: Boolean = true,
    role: Role? = Role.Button,
    scale: Float = 0.96f,
    dim: Float = 0.72f,
    onClickLabel: String? = null,
    onClick: () -> Unit,
): Modifier = composed {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) scale else 1f, spring(dampingRatio = 0.6f, stiffness = Spring.StiffnessMedium), label = "pressScale")
    val a by animateFloatAsState(if (pressed) dim else 1f, label = "pressDim")
    this.graphicsLayer { scaleX = s; scaleY = s; alpha = a }
        .clickable(source, indication = null, enabled = enabled, onClickLabel = onClickLabel, role = role, onClick = onClick)
}

/** A list cell's press feedback: the row greys while held. */
fun Modifier.rowPress(enabled: Boolean = true, role: Role? = Role.Button, onClick: () -> Unit): Modifier = composed {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val highlight = Kit.colors.fill3
    val a by animateFloatAsState(if (pressed) 1f else 0f, label = "rowPress")
    this.drawBehind { if (a > 0f) drawRect(highlight, alpha = a) }
        .clickable(source, indication = null, enabled = enabled, role = role, onClick = onClick)
}
