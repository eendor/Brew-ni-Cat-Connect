package com.brewnicat.connect.ui.kit

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R

/** Side margin of grouped content, and the corner radius of a group (both from the kit). */
val Gutter = 16.dp
val GroupShape = RoundedCornerShape(26.dp)

/**
 * A grouped-list section: an optional header, a rounded group of cells with
 * hairlines between them, and an optional footnote.
 */
@Composable
fun Section(
    modifier: Modifier = Modifier,
    header: String? = null,
    footer: String? = null,
    footerColor: Color = Kit.colors.label2,
    prominentHeader: Boolean = false,
    headerAction: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Column(modifier.fillMaxWidth().padding(horizontal = Gutter).padding(top = if (header != null) 24.dp else 16.dp)) {
        if (header != null) SectionHeader(header, prominentHeader, headerAction)
        Group(content = content)
        if (footer != null) Text(footer, style = KitType.footnote, color = footerColor, modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp))
    }
}

@Composable
fun SectionHeader(text: String, prominent: Boolean = false, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, bottom = if (prominent) 10.dp else 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text, style = if (prominent) KitType.title2 else KitType.headline,
            color = if (prominent) Kit.colors.label else Kit.colors.label2,
            modifier = Modifier.weight(1f).semantics { heading() },
        )
        action?.invoke()
    }
}

/** The rounded container of a section. Draws the inset hairlines between its children. */
@Composable
fun Group(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val c = Kit.colors
    var breaks by remember { mutableStateOf(IntArray(0)) }
    Layout(
        content,
        modifier.fillMaxWidth().clip(GroupShape).background(c.cell).drawWithContent {
            drawContent()
            val inset = 16.dp.toPx()
            val thickness = 0.6.dp.toPx().coerceAtLeast(1f)
            breaks.forEach { y -> drawRect(c.separator, Offset(inset, y - thickness / 2), Size(size.width - inset * 2, thickness)) }
        },
    ) { measurables, constraints ->
        val placeables = measurables.map { it.measure(constraints.copy(minHeight = 0)) }
        val ys = ArrayList<Int>()
        var total = 0
        placeables.forEach { p ->
            if (p.height > 0 && total > 0) ys += total
            total += p.height
        }
        val next = ys.toIntArray()
        if (!next.contentEquals(breaks)) breaks = next
        layout(constraints.maxWidth, total) {
            var y = 0
            placeables.forEach { p -> p.placeRelative(0, y); y += p.height }
        }
    }
}

/** A long group whose cells are composed lazily. The first and last cells carry the rounded corners. */
fun <T> LazyListScope.groupItems(items: List<T>, key: (T) -> Any, content: @Composable (T) -> Unit) {
    itemsIndexed(items, key = { _, item -> key(item) }) { index, item ->
        val c = Kit.colors
        val first = index == 0
        val last = index == items.lastIndex
        val shape = RoundedCornerShape(
            topStart = if (first) 26.dp else 0.dp, topEnd = if (first) 26.dp else 0.dp,
            bottomStart = if (last) 26.dp else 0.dp, bottomEnd = if (last) 26.dp else 0.dp,
        )
        Box(
            Modifier.fillMaxWidth().padding(horizontal = Gutter).clip(shape).background(c.cell).drawWithContent {
                drawContent()
                if (!last) {
                    val inset = 16.dp.toPx()
                    val thickness = 0.6.dp.toPx().coerceAtLeast(1f)
                    drawRect(c.separator, Offset(inset, size.height - thickness), Size(size.width - inset * 2, thickness))
                }
            },
        ) { content(item) }
    }
}

/** A list cell: title, optional subtitle, a trailing detail and chevron. */
@Composable
fun ListRow(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    detail: String? = null,
    leading: (@Composable () -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
    chevron: Boolean = false,
    titleColor: Color = Kit.colors.label,
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
) {
    val c = Kit.colors
    Row(
        modifier.fillMaxWidth()
            .then(if (onClick != null) Modifier.rowPress(enabled, onClick = onClick) else Modifier)
            .heightIn(min = 52.dp).alpha(if (enabled) 1f else 0.5f)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leading != null) {
            leading()
            Spacer(Modifier.width(12.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, style = KitType.body, color = titleColor)
            if (subtitle != null) Text(subtitle, style = KitType.subhead, color = c.label2, modifier = Modifier.padding(top = 1.dp))
        }
        if (detail != null) Text(detail, style = KitType.body, color = c.label2, textAlign = TextAlign.End, modifier = Modifier.padding(start = 12.dp))
        if (trailing != null) {
            Spacer(Modifier.width(10.dp))
            trailing()
        }
        if (chevron) Icon(KitIcons.ChevronRight, null, tint = c.label3, size = 18.dp, modifier = Modifier.padding(start = 6.dp))
    }
}

/** A cell that is a text button: tinted, or red when destructive. */
@Composable
fun ButtonRow(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, destructive: Boolean = false, centered: Boolean = false, enabled: Boolean = true) {
    val c = Kit.colors
    Box(
        modifier.fillMaxWidth().rowPress(enabled, onClick = onClick).heightIn(min = 52.dp).alpha(if (enabled) 1f else 0.4f).padding(horizontal = 16.dp, vertical = 10.dp),
        contentAlignment = if (centered) Alignment.Center else Alignment.CenterStart,
    ) { Text(text, style = KitType.body, color = if (destructive) c.red else c.tint) }
}

/** A cell that is one choice of several; the chosen one carries a tinted checkmark. */
@Composable
fun CheckRow(title: String, checked: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, detail: String? = null, role: Role = Role.RadioButton) {
    val c = Kit.colors
    Row(
        modifier.fillMaxWidth().rowPress(role = role, onClick = onClick).semantics { selected = checked }
            .heightIn(min = 52.dp).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = KitType.body, color = c.label, modifier = Modifier.weight(1f))
        if (detail != null) Text(detail, style = KitType.body, color = c.label2, modifier = Modifier.padding(start = 12.dp))
        Box(Modifier.padding(start = 10.dp).size(22.dp), contentAlignment = Alignment.Center) {
            if (checked) Icon(KitIcons.Check, null, tint = c.tint, size = 20.dp)
        }
    }
}

/** A text field cell: a small label over the input, a tinted cursor, and a clear button. */
@Composable
fun FieldRow(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true,
    minLines: Int = 1,
    error: String? = null,
) {
    val c = Kit.colors
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    Row(modifier.fillMaxWidth().heightIn(min = 60.dp).padding(start = 16.dp, end = 6.dp, top = 9.dp, bottom = 9.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = KitType.footnote, color = if (error != null) c.redText else if (focused) c.tint else c.label2)
            BasicTextField(
                value, onValueChange,
                modifier = Modifier.fillMaxWidth().padding(top = 2.dp).semantics {
                    contentDescription = label
                    if (error != null) error(error)
                },
                textStyle = KitType.body.copy(color = c.label),
                keyboardOptions = keyboardOptions,
                singleLine = singleLine,
                minLines = if (singleLine) 1 else minLines,
                interactionSource = source,
                cursorBrush = SolidColor(c.tint),
                decorationBox = { inner ->
                    Box {
                        if (value.isEmpty()) Text(placeholder, style = KitType.body, color = c.label3)
                        inner()
                    }
                },
            )
            if (error != null) Text(error, style = KitType.footnote, color = c.redText, modifier = Modifier.padding(top = 3.dp, end = 10.dp))
        }
        if (focused && value.isNotEmpty() && singleLine) {
            Box(Modifier.size(40.dp).pressable(scale = 0.85f) { onValueChange("") }.semantics { contentDescription = "Clear $label" }, contentAlignment = Alignment.Center) {
                Box(Modifier.size(18.dp).clip(CircleShape).background(c.gray3), contentAlignment = Alignment.Center) {
                    Icon(KitIcons.X, null, tint = c.cell, size = 11.dp)
                }
            }
        } else {
            Spacer(Modifier.width(10.dp))
        }
    }
}

/** A cell with a switch. The whole row toggles, so it is one stop for a screen reader. */
@Composable
fun ToggleRow(title: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit, modifier: Modifier = Modifier, subtitle: String? = null) {
    val c = Kit.colors
    Row(
        modifier.fillMaxWidth()
            .toggleable(checked, interactionSource = null, indication = null, role = Role.Switch, onValueChange = onCheckedChange)
            .heightIn(min = 52.dp).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = KitType.body, color = c.label)
            if (subtitle != null) Text(subtitle, style = KitType.subhead, color = c.label2, modifier = Modifier.padding(top = 1.dp))
        }
        Toggle(checked, null, Modifier.padding(start = 12.dp))
    }
}

/** Free-form content inside a group, with the cell's padding. */
@Composable
fun Cell(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), content = content)
}

/** A short message in its own rounded cell: plain information, or a warning. */
@Composable
fun Notice(text: String, modifier: Modifier = Modifier, warning: Boolean = false) {
    val c = Kit.colors
    val color = if (warning) c.orange else c.tint
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(color.copy(alpha = if (c.dark) 0.2f else 0.13f)).padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(if (warning) KitIcons.CircleAlert else KitIcons.Info, null, tint = if (warning && !c.dark) Color(0xFFC25E00) else color, size = 20.dp, modifier = Modifier.padding(top = 1.dp))
        Text(text, style = KitType.subhead, color = c.label, modifier = Modifier.weight(1f))
    }
}

/** The kit's empty state: a tinted circle, a bold title, a grey line, and one button. */
@Composable
fun EmptyState(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    warning: Boolean = false,
) {
    val c = Kit.colors
    Column(modifier.fillMaxWidth().padding(horizontal = 40.dp, vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        IconCircle(icon, if (warning) c.orange else c.tint)
        Text(title, style = KitType.title2, color = c.label, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 16.dp))
        Text(body, style = KitType.subhead, color = c.label2, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp))
        if (actionLabel != null && onAction != null) {
            KitButton(actionLabel, onAction, Modifier.padding(top = 22.dp), size = ButtonSize.Medium, style = if (warning) ButtonStyle.Tinted else ButtonStyle.Prominent)
        }
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier, text: String? = null) {
    Column(modifier.fillMaxWidth().padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Spinner(size = 28.dp)
        if (text != null) Text(text, style = KitType.subhead, color = Kit.colors.label2, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable
fun Logo(size: Dp, modifier: Modifier = Modifier) {
    Image(
        painterResource(R.drawable.brand_logo), contentDescription = "Brew ni Cat logo",
        modifier = modifier.size(size).softShadow(CircleShape, Kit.colors.shadow, 12.dp, 4.dp).clip(CircleShape).background(Color.White),
        contentScale = ContentScale.Crop,
    )
}

/** A menu photo, or the shop's logo on a quiet fill when the item has none yet. */
@Composable
fun Photo(@DrawableRes res: Int?, contentDescription: String?, modifier: Modifier = Modifier) {
    if (res != null) {
        Image(painterResource(res), contentDescription, modifier = modifier, contentScale = ContentScale.Crop)
    } else {
        Box(modifier.background(Kit.colors.fill3), contentAlignment = Alignment.Center) {
            Image(
                painterResource(R.drawable.brand_logo), contentDescription,
                modifier = Modifier.fillMaxSize(0.62f).clip(CircleShape).alpha(0.9f),
                contentScale = ContentScale.Crop,
            )
        }
    }
}
