package com.brewnicat.connect.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.composed
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R
import com.brewnicat.connect.ui.theme.Brand

@Composable
fun BrandHeader(modifier: Modifier = Modifier, trailing: @Composable () -> Unit = {}) {
    Row(modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 20.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Logo(44.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Brew ni Cat", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
            Text("Coffee Shop", style = MaterialTheme.typography.labelMedium, color = Brand.colors.accent)
        }
        trailing()
    }
}

/** iOS-style large title that sits under the status bar on the main tabs. */
@Composable
fun LargeTitle(title: String, modifier: Modifier = Modifier, subtitle: String? = null, trailing: @Composable () -> Unit = {}) {
    Row(modifier.fillMaxWidth().statusBarsPadding().padding(start = 22.dp, end = 16.dp, top = 14.dp, bottom = 8.dp), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f)) {
            if (subtitle != null) Text(subtitle.uppercase(), style = MaterialTheme.typography.labelMedium, color = Brand.colors.accent, letterSpacing = 1.sp)
            Text(title, style = MaterialTheme.typography.displaySmall, color = Brand.colors.ink, modifier = Modifier.semantics { heading() })
        }
        trailing()
    }
}

@Composable
fun Logo(size: Dp) {
    Image(
        painterResource(R.drawable.brand_logo), contentDescription = "Brew ni Cat logo",
        modifier = Modifier.size(size).shadow(8.dp, CircleShape, spotColor = Brand.colors.shadow.copy(alpha = 0.25f)).clip(CircleShape).background(Color.White).border(2.dp, Color.White, CircleShape),
        contentScale = ContentScale.Crop,
    )
}

/** Springy press feedback (iOS-like): shrinks slightly while held. */
fun Modifier.pressable(enabled: Boolean = true, onClick: () -> Unit): Modifier = composed {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.96f else 1f, spring(dampingRatio = 0.55f, stiffness = 500f), label = "press")
    this.graphicsLayer { scaleX = scale; scaleY = scale }
        .clickable(interactionSource = source, indication = null, enabled = enabled, onClick = onClick)
}

@Composable
fun TopBar(title: String, onBack: () -> Unit, trailing: @Composable () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(42.dp).shadow(6.dp, CircleShape, spotColor = Brand.colors.shadow.copy(alpha = 0.18f)).clip(CircleShape)
                .background(Brand.colors.glass).border(0.8.dp, Brand.colors.rim, CircleShape).pressable(onClick = onBack)
                .semantics { contentDescription = "Back" },
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null, tint = Brand.colors.ink, modifier = Modifier.size(22.dp)) }
        Spacer(Modifier.width(14.dp))
        Text(title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f).semantics { heading() }, color = Brand.colors.ink, maxLines = 1)
        trailing()
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.headlineSmall, color = Brand.colors.ink, modifier = modifier.semantics { heading() })
}

@Composable
fun Card(modifier: Modifier = Modifier, padding: PaddingValues = PaddingValues(18.dp), content: @Composable () -> Unit) {
    val shape = MaterialTheme.shapes.large
    Box(
        modifier.shadow(14.dp, shape, ambientColor = Brand.colors.shadow.copy(alpha = 0.10f), spotColor = Brand.colors.shadow.copy(alpha = 0.16f))
            .clip(shape).background(Brand.colors.card).border(0.8.dp, Brand.colors.rim, shape),
    ) { Box(Modifier.padding(padding)) { content() } }
}

@Composable
fun Photo(@DrawableRes res: Int?, contentDescription: String?, modifier: Modifier = Modifier) {
    if (res != null) {
        Image(painterResource(res), contentDescription, modifier = modifier, contentScale = ContentScale.Crop)
    } else {
        // No photo yet: the shop's logo, faded, on the brand green.
        Box(modifier.background(Brand.colors.accentSurface), contentAlignment = Alignment.Center) {
            Image(
                painterResource(R.drawable.brand_logo), contentDescription,
                modifier = Modifier.fillMaxSize(0.62f).clip(CircleShape).alpha(0.85f),
                contentScale = ContentScale.Crop,
            )
        }
    }
}

@Composable
fun Pill(text: String, color: Color, background: Color, modifier: Modifier = Modifier) {
    Text(
        text, style = MaterialTheme.typography.labelMedium, color = color,
        modifier = modifier.clip(RoundedCornerShape(50)).background(background).padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, busy: Boolean = false) {
    val c = Brand.colors
    val on = enabled && !busy
    Row(
        modifier.height(56.dp).shadow(if (on) 14.dp else 0.dp, RoundedCornerShape(50), spotColor = c.accentFill.copy(alpha = 0.5f))
            .clip(RoundedCornerShape(50))
            .background(Brush.verticalGradient(listOf(c.accentFill.copy(alpha = if (on) 0.92f else 0.35f), c.accentFill.copy(alpha = if (on) 1f else 0.35f))))
            .border(0.8.dp, Color.White.copy(alpha = 0.28f), RoundedCornerShape(50))
            .pressable(enabled = on, onClick = onClick).padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        if (busy) {
            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = c.onAccentFill)
            Spacer(Modifier.width(10.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge, color = c.onAccentFill)
    }
}

@Composable
fun Stepper(quantity: Int, onChange: (Int) -> Unit, label: String, min: Int = 0, max: Int = 99) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(Brand.colors.warm).padding(3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        StepperButton(Icons.Rounded.Remove, "One less $label", quantity > min) { onChange(quantity - 1) }
        Text("$quantity", style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center, modifier = Modifier.width(34.dp), color = Brand.colors.ink)
        StepperButton(Icons.Rounded.Add, "One more $label", quantity < max) { onChange(quantity + 1) }
    }
}

@Composable
private fun StepperButton(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(36.dp).clip(CircleShape).background(Brand.colors.card.copy(alpha = if (enabled) 1f else 0.4f))
            .pressable(enabled = enabled, onClick = onClick).semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, contentDescription = null, tint = Brand.colors.ink.copy(alpha = if (enabled) 1f else 0.35f), modifier = Modifier.size(18.dp)) }
}

@Composable
fun MessageState(emoji: String, title: String, body: String, modifier: Modifier = Modifier, action: String? = null, onAction: () -> Unit = {}) {
    Column(modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(emoji, style = MaterialTheme.typography.displaySmall)
        Text(title, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center, color = Brand.colors.ink)
        Text(body, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center, color = Brand.colors.muted)
        if (action != null) TextButton(onClick = onAction) { Text(action, color = Brand.colors.accent) }
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(48.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Brand.colors.accent)
    }
}

@Composable
fun Notice(text: String, modifier: Modifier = Modifier, warning: Boolean = true) {
    Text(
        text, style = MaterialTheme.typography.bodyMedium,
        color = if (warning) Brand.colors.strong else Brand.colors.accent,
        modifier = modifier.fillMaxWidth().clip(MaterialTheme.shapes.medium)
            .background(if (warning) Brand.colors.warm else Brand.colors.accentSurface).padding(14.dp),
    )
}

@Composable
fun FavoriteHeartButton(
    isFavorite: Boolean,
    itemName: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    IconButton(onClick = onClick, modifier = modifier) {
        Icon(
            imageVector = if (isFavorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
            contentDescription = if (isFavorite) "Remove $itemName from favorites" else "Save $itemName to favorites",
            tint = if (isFavorite) Color(0xFFD64545) else Brand.colors.muted,
        )
    }
}

@Composable
fun StarRow(
    rating: Int,
    modifier: Modifier = Modifier,
    size: Dp = 18.dp,
    onSelect: ((Int) -> Unit)? = null,
) {
    val activeColor = Color(0xFFE09F3E)
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        for (star in 1..5) {
            val filled = star <= rating
            if (onSelect != null) {
                IconButton(onClick = { onSelect(star) }, modifier = Modifier.size(40.dp)) {
                    Icon(
                        imageVector = if (filled) Icons.Rounded.Star else Icons.Rounded.StarOutline,
                        contentDescription = "$star star${if (star == 1) "" else "s"}",
                        tint = if (filled) activeColor else Brand.colors.muted,
                        modifier = Modifier.size(size),
                    )
                }
            } else {
                Icon(
                    imageVector = if (filled) Icons.Rounded.Star else Icons.Rounded.StarOutline,
                    contentDescription = null,
                    tint = if (filled) activeColor else Brand.colors.muted,
                    modifier = Modifier.size(size),
                )
            }
        }
    }
}
