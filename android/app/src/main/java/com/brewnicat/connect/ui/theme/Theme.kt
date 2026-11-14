package com.brewnicat.connect.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/* The website's colours (src/app/globals.css), light and dark. */

@Immutable
data class BrandColors(
    val canvas: Color,
    val warm: Color,
    val card: Color,
    val accentSurface: Color,
    val accent: Color,
    val accentFill: Color,
    val onAccentFill: Color,
    val strong: Color,
    val ink: Color,
    val muted: Color,
    val border: Color,
    val success: Color,
    val danger: Color,
)

private val Light = BrandColors(
    canvas = Color(0xFFF6EEE1),
    warm = Color(0xFFECDFCB),
    card = Color(0xFFFFFBF5),
    accentSurface = Color(0xFFE3ECE2),
    accent = Color(0xFF1F6B45),
    accentFill = Color(0xFF1F6B45),
    onAccentFill = Color.White,
    strong = Color(0xFF9E451E),
    ink = Color(0xFF1D2A21),
    muted = Color(0xFF5C665E),
    border = Color(0x1A1D2A21),
    success = Color(0xFF1F6B45),
    danger = Color(0xFFB3261E),
)

private val Dark = BrandColors(
    canvas = Color(0xFF14120F),
    warm = Color(0xFF221E19),
    card = Color(0xFF1F1C18),
    accentSurface = Color(0xFF172A20),
    accent = Color(0xFF7DCFA0),
    accentFill = Color(0xFF25764B),
    onAccentFill = Color.White,
    strong = Color(0xFFF0A77C),
    ink = Color(0xFFF6EEE1),
    muted = Color(0xFFB9B0A3),
    border = Color(0x1AF6EEE1),
    success = Color(0xFF7DCFA0),
    danger = Color(0xFFF2B8B5),
)

val LocalBrand = staticCompositionLocalOf { Light }

private fun scheme(c: BrandColors, dark: Boolean): ColorScheme {
    val base = if (dark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = c.accentFill, onPrimary = c.onAccentFill,
        primaryContainer = c.accentSurface, onPrimaryContainer = c.accent,
        secondary = c.strong, onSecondary = Color.White,
        secondaryContainer = c.warm, onSecondaryContainer = c.ink,
        background = c.canvas, onBackground = c.ink,
        surface = c.canvas, onSurface = c.ink,
        surfaceVariant = c.warm, onSurfaceVariant = c.muted,
        surfaceContainerLowest = c.card, surfaceContainerLow = c.card,
        surfaceContainer = c.card, surfaceContainerHigh = c.card, surfaceContainerHighest = c.warm,
        outline = c.border, outlineVariant = c.border,
        error = c.danger,
    )
}

private val type = Typography(
    displaySmall = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 34.sp, lineHeight = 38.sp, letterSpacing = (-0.8).sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, lineHeight = 31.sp, letterSpacing = (-0.4).sp),
    headlineSmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 27.sp, letterSpacing = (-0.2).sp),
    titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 19.sp, lineHeight = 24.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 21.sp),
    titleSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 19.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 23.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 16.sp),
)

private val shapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(26.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

@Composable
fun BrewTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (dark) Dark else Light
    androidx.compose.runtime.CompositionLocalProvider(LocalBrand provides colors) {
        MaterialTheme(colorScheme = scheme(colors, dark), typography = type, shapes = shapes, content = content)
    }
}

object Brand {
    val colors: BrandColors @Composable get() = LocalBrand.current
}
