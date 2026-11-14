package com.brewnicat.connect.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
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
    Row(modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Logo(48.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Brew ni Cat", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
            Text("Coffee Shop", style = MaterialTheme.typography.labelMedium, color = Brand.colors.accent)
        }
        trailing()
    }
}

@Composable
fun Logo(size: Dp) {
    Image(
        painterResource(R.drawable.brand_logo), contentDescription = "Brew ni Cat logo",
        modifier = Modifier.size(size).clip(CircleShape).background(Color.White).border(2.dp, Color.White, CircleShape),
        contentScale = ContentScale.Crop,
    )
}

@Composable
fun TopBar(title: String, onBack: () -> Unit, trailing: @Composable () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = Brand.colors.ink) }
        Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f).semantics { heading() }, color = Brand.colors.ink)
        trailing()
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.headlineSmall, color = Brand.colors.ink, modifier = modifier.semantics { heading() })
}

@Composable
fun Card(modifier: Modifier = Modifier, padding: PaddingValues = PaddingValues(16.dp), content: @Composable () -> Unit) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.large,
        color = Brand.colors.card,
        border = androidx.compose.foundation.BorderStroke(1.dp, Brand.colors.border),
        shadowElevation = 1.dp,
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
    Button(
        onClick = onClick, enabled = enabled && !busy, modifier = modifier.height(54.dp),
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = Brand.colors.accentFill, contentColor = Brand.colors.onAccentFill),
    ) {
        if (busy) {
            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Brand.colors.onAccentFill)
            Spacer(Modifier.width(10.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun Stepper(quantity: Int, onChange: (Int) -> Unit, label: String, min: Int = 0, max: Int = 99) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        val colors = IconButtonDefaults.filledTonalIconButtonColors(containerColor = Brand.colors.warm, contentColor = Brand.colors.ink)
        FilledTonalIconButton(onClick = { onChange(quantity - 1) }, enabled = quantity > min, colors = colors, modifier = Modifier.size(38.dp)) {
            Icon(Icons.Rounded.Remove, contentDescription = "One less $label")
        }
        Text("$quantity", style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center, modifier = Modifier.width(36.dp), color = Brand.colors.ink)
        FilledTonalIconButton(onClick = { onChange(quantity + 1) }, enabled = quantity < max, colors = colors, modifier = Modifier.size(38.dp)) {
            Icon(Icons.Rounded.Add, contentDescription = "One more $label")
        }
    }
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
