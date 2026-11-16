package com.brewnicat.connect.ui.kit

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.selection.LocalTextSelectionColors
import androidx.compose.foundation.text.selection.TextSelectionColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import com.brewnicat.connect.R

/*
 * The app's look follows Apple's iOS 27 UI Kit (the Sketch library): its colours,
 * text styles, Liquid Glass materials and components, drawn from scratch on
 * Compose foundation. There is no Material here. Two things stand in for parts
 * Apple does not license for Android: Inter for SF Pro and Lucide for SF Symbols.
 * The shop's green replaces system blue as the tint.
 */

@Immutable
data class KitColors(
    val dark: Boolean,
    /** Grouped background and the cells that sit on it. */
    val grouped: Color,
    val cell: Color,
    val cellInner: Color,
    val label: Color,
    val label2: Color,
    val label3: Color,
    val label4: Color,
    val fill: Color,
    val fill2: Color,
    val fill3: Color,
    val fill4: Color,
    val separator: Color,
    val gray: Color,
    val gray3: Color,
    val red: Color,
    val orange: Color,
    val yellow: Color,
    val green: Color,
    val blue: Color,
    val indigo: Color,
    val purple: Color,
    val pink: Color,
    val brown: Color,
    val teal: Color,
    /** The app tint: text and icons, and the fill behind white text. */
    val tint: Color,
    val tintFill: Color,
    val onTint: Color,
    val glass: Color,
    val glassFallback: Color,
    val glassRimTop: Color,
    val glassRimBottom: Color,
    val shadow: Color,
    val scrim: Color,
)

private val Light = KitColors(
    dark = false,
    grouped = Color(0xFFF2F2F7),
    cell = Color(0xFFFFFFFF),
    cellInner = Color(0xFFF2F2F7),
    label = Color(0xFF000000),
    label2 = Color(0x993C3C43),
    label3 = Color(0x4D3C3C43),
    label4 = Color(0x2E3C3C43),
    fill = Color(0x33787878),
    fill2 = Color(0x29787880),
    fill3 = Color(0x1F767680),
    fill4 = Color(0x14747480),
    separator = Color(0x1F000000),
    gray = Color(0xFF8E8E93),
    gray3 = Color(0xFFC7C7CC),
    red = Color(0xFFFF383C),
    orange = Color(0xFFFF8D28),
    yellow = Color(0xFFFFCC00),
    green = Color(0xFF34C759),
    blue = Color(0xFF0088FF),
    indigo = Color(0xFF6155F5),
    purple = Color(0xFFCB30E0),
    pink = Color(0xFFFF2D55),
    brown = Color(0xFFAC7F5E),
    teal = Color(0xFF00C3D0),
    tint = Color(0xFF1F6B45),
    tintFill = Color(0xFF1F6B45),
    onTint = Color.White,
    glass = Color(0x99FFFFFF),
    glassFallback = Color(0xFAF9F9FB),
    glassRimTop = Color(0xE6FFFFFF),
    glassRimBottom = Color(0x33FFFFFF),
    shadow = Color(0x24000000),
    scrim = Color(0x33000000),
)

private val Dark = KitColors(
    dark = true,
    grouped = Color(0xFF000000),
    cell = Color(0xFF1C1C1E),
    cellInner = Color(0xFF2C2C2E),
    label = Color(0xFFFFFFFF),
    label2 = Color(0x99EBEBF5),
    label3 = Color(0x4DEBEBF5),
    label4 = Color(0x29EBEBF5),
    fill = Color(0x5C787880),
    fill2 = Color(0x52787880),
    fill3 = Color(0x3D767680),
    fill4 = Color(0x2E767680),
    separator = Color(0x1FFFFFFF),
    gray = Color(0xFF8E8E93),
    gray3 = Color(0xFF48484A),
    red = Color(0xFFFF4245),
    orange = Color(0xFFFF9230),
    yellow = Color(0xFFFFD600),
    green = Color(0xFF30D158),
    blue = Color(0xFF0091FF),
    indigo = Color(0xFF6D7CFF),
    purple = Color(0xFFDB34F2),
    pink = Color(0xFFFF375F),
    brown = Color(0xFFB78A66),
    teal = Color(0xFF00D2E0),
    tint = Color(0xFF7DCFA0),
    tintFill = Color(0xFF25764B),
    onTint = Color.White,
    glass = Color(0x8C1C1C1E),
    glassFallback = Color(0xFA1C1C1E),
    glassRimTop = Color(0x38FFFFFF),
    glassRimBottom = Color(0x0FFFFFFF),
    shadow = Color(0x66000000),
    scrim = Color(0x7A000000),
)

/** The kit's elevated dark backgrounds, used inside sheets and alerts. */
internal fun KitColors.elevated(): KitColors =
    if (dark) copy(grouped = Color(0xFF1C1C1E), cell = Color(0xFF2C2C2E), cellInner = Color(0xFF3A3A3C), glassFallback = Color(0xFF3A3A3C)) else this

@OptIn(ExperimentalTextApi::class)
private fun inter(weight: Int, opticalSize: Float) = Font(
    R.font.inter,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight), FontVariation.Setting("opsz", opticalSize)),
)

private val InterText = FontFamily(listOf(400, 500, 600, 700).map { inter(it, 14f) })
private val InterDisplay = FontFamily(listOf(400, 600, 700, 800).map { inter(it, 32f) })

/**
 * The kit's text styles: its sizes, leading and weights, in points. Tracking is the
 * kit's for body sizes; the three titles are set slightly tighter than the kit's SF
 * Pro values because Inter runs wider at display sizes.
 */
object KitType {
    private fun style(size: Int, leading: Int, tracking: Double, weight: FontWeight = FontWeight.Normal, display: Boolean = false) = TextStyle(
        fontFamily = if (display) InterDisplay else InterText,
        fontSize = size.sp, lineHeight = leading.sp, letterSpacing = tracking.sp, fontWeight = weight,
    )

    val largeTitle = style(34, 41, -0.4, FontWeight.Bold, display = true)
    val title1 = style(28, 34, -0.3, FontWeight.Bold, display = true)
    val title2 = style(22, 28, -0.35, FontWeight.Bold, display = true)
    val title3 = style(20, 25, -0.45, FontWeight.SemiBold, display = true)
    val headline = style(17, 22, -0.43, FontWeight.SemiBold)
    val body = style(17, 22, -0.43)
    val callout = style(16, 21, -0.31)
    val subhead = style(15, 20, -0.23)
    val footnote = style(13, 18, -0.08)
    val caption1 = style(12, 16, 0.0)
    val caption2 = style(11, 13, 0.06)
}

val TextStyle.semibold: TextStyle get() = copy(fontWeight = FontWeight.SemiBold)
val TextStyle.medium: TextStyle get() = copy(fontWeight = FontWeight.Medium)
val TextStyle.bold: TextStyle get() = copy(fontWeight = FontWeight.Bold)

val LocalKitColors = staticCompositionLocalOf { Light }
val LocalContentColor = compositionLocalOf { Color.Black }

object Kit {
    val colors: KitColors @Composable get() = LocalKitColors.current
}

@Composable
fun KitTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (dark) Dark else Light
    CompositionLocalProvider(
        LocalKitColors provides colors,
        LocalContentColor provides colors.label,
        LocalTextSelectionColors provides TextSelectionColors(colors.tint, colors.tint.copy(alpha = 0.3f)),
        content = content,
    )
}

@Composable
fun Text(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified,
    style: TextStyle = KitType.body,
    textAlign: TextAlign? = null,
    maxLines: Int = Int.MAX_VALUE,
) {
    val resolved = if (color != Color.Unspecified) color else if (style.color != Color.Unspecified) style.color else LocalContentColor.current
    BasicText(
        text, modifier,
        style = style.merge(color = resolved, textAlign = textAlign ?: TextAlign.Unspecified),
        overflow = TextOverflow.Ellipsis, maxLines = maxLines,
    )
}

@Composable
fun Icon(icon: ImageVector, contentDescription: String?, modifier: Modifier = Modifier, tint: Color = LocalContentColor.current, size: Dp = 22.dp) {
    Image(
        rememberVectorPainter(icon), contentDescription = null,
        modifier = modifier.size(size).then(
            if (contentDescription != null) Modifier.semantics { this.contentDescription = contentDescription; role = Role.Image } else Modifier,
        ),
        contentScale = ContentScale.Fit, colorFilter = ColorFilter.tint(tint),
    )
}
