package com.brewnicat.connect.ui.kit

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

enum class ButtonStyle { Prominent, Tinted, Gray, Plain, Destructive }
enum class ButtonSize(val height: Dp, val pad: Dp) { Large(52.dp, 22.dp), Medium(40.dp, 18.dp), Small(32.dp, 14.dp) }

/** The kit's capsule button: a tinted fill, a grey fill with tinted or plain text, or text only. */
@Composable
fun KitButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: ButtonStyle = ButtonStyle.Prominent,
    size: ButtonSize = ButtonSize.Large,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    busy: Boolean = false,
) {
    val c = Kit.colors
    val (background, content) = when (style) {
        ButtonStyle.Prominent -> c.tintFill to c.onTint
        ButtonStyle.Tinted -> c.fill3 to c.tint
        ButtonStyle.Gray -> c.fill3 to c.label
        ButtonStyle.Plain -> Color.Transparent to c.tint
        ButtonStyle.Destructive -> c.fill3 to c.red
    }
    val active = enabled && !busy
    Row(
        modifier.pressable(enabled = active, onClick = onClick)
            .defaultMinSize(minHeight = size.height).alpha(if (enabled) 1f else 0.42f)
            .clip(CircleShape).background(background)
            .padding(horizontal = if (style == ButtonStyle.Plain) 8.dp else size.pad, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (busy) Spinner(size = 18.dp, color = content)
        else if (icon != null) Icon(icon, null, tint = content, size = if (size == ButtonSize.Small) 16.dp else 19.dp)
        Text(
            text, color = content, textAlign = TextAlign.Center, maxLines = 2,
            style = when (size) {
                ButtonSize.Large -> KitType.headline
                ButtonSize.Medium -> KitType.subhead.semibold
                ButtonSize.Small -> KitType.subhead.semibold
            },
        )
    }
}

/** The 44 pt Liquid Glass circle the kit uses for bar buttons (back, close). */
@Composable
fun GlassIconButton(icon: ImageVector, contentDescription: String, onClick: () -> Unit, modifier: Modifier = Modifier, tint: Color = Kit.colors.label, prominent: Boolean = false) {
    val c = Kit.colors
    Box(
        modifier.pressable(scale = 0.9f, onClick = onClick).semantics { this.contentDescription = contentDescription }
            .size(44.dp).glass(CircleShape, tint = if (prominent) c.tintFill else null),
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = if (prominent) c.onTint else tint, size = 22.dp) }
}

/** A plain circular icon button for use inside cells. */
@Composable
fun IconButton(icon: ImageVector, contentDescription: String, onClick: () -> Unit, modifier: Modifier = Modifier, tint: Color = Kit.colors.label2, size: Dp = 22.dp) {
    Box(
        modifier.size(44.dp).pressable(scale = 0.85f, onClick = onClick).semantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = tint, size = size) }
}

/** The kit's switch: a 64 x 28 capsule, green when on, with a wide white knob. */
@Composable
fun Toggle(checked: Boolean, onCheckedChange: ((Boolean) -> Unit)?, modifier: Modifier = Modifier) {
    val c = Kit.colors
    val track by animateColorAsState(if (checked) c.green else c.fill, label = "toggleTrack")
    val x by animateDpAsState(if (checked) 23.dp else 2.dp, spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow), label = "toggleKnob")
    Box(
        modifier.size(64.dp, 28.dp).clip(CircleShape).background(track).then(
            // Without a handler the switch only shows the state; the row that holds it does the toggling.
            if (onCheckedChange != null) Modifier.toggleable(checked, role = Role.Switch, onValueChange = onCheckedChange, interactionSource = null, indication = null) else Modifier,
        ),
    ) {
        Box(Modifier.offset { IntOffset(x.roundToPx(), 2.dp.roundToPx()) }.size(39.dp, 24.dp).softShadow(CircleShape, Color(0x29000000), 6.dp, 2.dp).clip(CircleShape).background(Color.White))
    }
}

/** The kit's segmented control: a grey capsule track with a sliding capsule for the selection. */
@Composable
fun Segmented(options: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier, height: Dp = 40.dp) {
    val c = Kit.colors
    BoxWithConstraints(modifier.fillMaxWidth().height(height).clip(CircleShape).background(c.fill3).padding(3.dp).selectableGroup()) {
        val segment = maxWidth / options.size
        val x by animateDpAsState(segment * selected.coerceAtLeast(0), spring(dampingRatio = 0.78f, stiffness = Spring.StiffnessMediumLow), label = "segment")
        if (selected >= 0) {
            Box(
                Modifier.offset { IntOffset(x.roundToPx(), 0) }.width(segment).fillMaxHeight().softShadow(CircleShape, Color(0x1F000000), 8.dp, 2.dp)
                    .clip(CircleShape).background(if (c.dark) Color(0xFF636366) else Color.White),
            )
        }
        Row(Modifier.fillMaxWidth().fillMaxHeight()) {
            options.forEachIndexed { index, option ->
                Box(
                    Modifier.weight(1f).fillMaxHeight().clip(CircleShape)
                        .pressable(role = Role.Tab, scale = 0.97f) { onSelect(index) }
                        .semantics { this.selected = index == selected },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(option, style = if (index == selected) KitType.subhead.semibold else KitType.subhead.medium, color = c.label, maxLines = 1)
                }
            }
        }
    }
}

/** The kit's stepper: a joined grey capsule with minus and plus, the count beside it. */
@Composable
fun Stepper(quantity: Int, onChange: (Int) -> Unit, label: String, min: Int = 0, max: Int = 99) {
    val c = Kit.colors
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("$quantity", style = KitType.body.semibold, color = c.label, textAlign = TextAlign.Center, modifier = Modifier.width(34.dp))
        Row(Modifier.size(92.dp, 34.dp).clip(CircleShape).background(c.fill3), verticalAlignment = Alignment.CenterVertically) {
            StepperHalf(KitIcons.Minus, "One less $label", quantity > min) { onChange(quantity - 1) }
            Box(Modifier.size(1.dp, 18.dp).background(c.label4))
            StepperHalf(KitIcons.Plus, "One more $label", quantity < max) { onChange(quantity + 1) }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.StepperHalf(icon: ImageVector, description: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.weight(1f).fillMaxHeight().pressable(enabled = enabled, scale = 0.86f, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = Kit.colors.label.copy(alpha = if (enabled) 1f else 0.3f), size = 18.dp) }
}

/** The iOS activity indicator: eight spokes that fade around the circle. */
@Composable
fun Spinner(modifier: Modifier = Modifier, size: Dp = 22.dp, color: Color = Kit.colors.gray) {
    var step by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) { delay(100); step = (step + 1) % 8 }
    }
    Canvas(modifier.size(size).semantics { contentDescription = "Loading" }) {
        val r = this.size.minDimension / 2
        for (i in 0 until 8) {
            val age = (step - i + 8) % 8
            rotate(i * 45f) {
                drawLine(
                    color.copy(alpha = color.alpha * (1f - age * 0.105f)),
                    Offset(center.x, center.y - r * 0.48f), Offset(center.x, center.y - r * 0.92f),
                    strokeWidth = r * 0.24f, cap = StrokeCap.Round,
                )
            }
        }
    }
}

/** A small capsule label: tinted text on a wash of the same colour. */
@Composable
fun Badge(text: String, modifier: Modifier = Modifier, color: Color = Kit.colors.tint, solid: Boolean = false) {
    Text(
        text, style = KitType.caption1.semibold, color = if (solid) Color.White else color, maxLines = 1,
        modifier = modifier.clip(CircleShape).background(if (solid) color else color.copy(alpha = 0.15f)).padding(horizontal = 9.dp, vertical = 4.dp),
    )
}

/** A coloured rounded tile with a white glyph, as in the Settings app. */
@Composable
fun IconTile(icon: ImageVector, color: Color, modifier: Modifier = Modifier, size: Dp = 30.dp) {
    Box(modifier.size(size).clip(androidx.compose.foundation.shape.RoundedCornerShape(size * 0.27f)).background(color), contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = Color.White, size = size * 0.6f)
    }
}

/** A tinted circle with a glyph, the kit's empty-state mark. */
@Composable
fun IconCircle(icon: ImageVector, color: Color = Kit.colors.tint, size: Dp = 60.dp) {
    Box(Modifier.size(size).clip(CircleShape).background(color.copy(alpha = 0.16f)), contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = color, size = size * 0.5f)
    }
}

@Composable
fun StarRow(rating: Int, modifier: Modifier = Modifier, size: Dp = 16.dp, onSelect: ((Int) -> Unit)? = null) {
    val c = Kit.colors
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        for (star in 1..5) {
            val filled = star <= rating
            val icon = if (filled) KitIcons.StarFill else KitIcons.Star
            val tint = if (filled) c.yellow else c.gray3
            if (onSelect != null) {
                IconButton(icon, "$star star${if (star == 1) "" else "s"}", { onSelect(star) }, tint = tint, size = size)
            } else {
                Icon(icon, null, tint = tint, size = size)
                if (star < 5) Spacer(Modifier.width(2.dp))
            }
        }
    }
}

@Composable
fun FavoriteHeartButton(isFavorite: Boolean, itemName: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    IconButton(
        if (isFavorite) KitIcons.HeartFill else KitIcons.Heart,
        if (isFavorite) "Remove $itemName from favorites" else "Save $itemName to favorites",
        onClick, modifier, tint = if (isFavorite) Kit.colors.pink else Kit.colors.gray,
    )
}

/** Runs [content] with the given content colour. */
@Composable
fun ContentColor(color: Color, content: @Composable () -> Unit) = CompositionLocalProvider(LocalContentColor provides color, content = content)
