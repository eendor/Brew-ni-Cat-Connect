package com.brewnicat.connect.ui.games

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.R
import com.brewnicat.connect.ui.kit.Kit
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * The games' pixel art, drawn in Aseprite by scripts/aseprite/game-sprites.lua
 * (ADR-032; `npm run games:sprites` redraws it). Each frame is its own PNG in
 * res/drawable-nodpi, the same pixels as the website's sheets, and is drawn
 * unfiltered so the pixels stay crisp at any size.
 */
object GameSprites {
    /** The 16 x 16 icons by name, the names the website uses. */
    val ICONS: Map<String, Int> = mapOf(
        "fish" to R.drawable.game_fish,
        "tea" to R.drawable.game_tea,
        "chili" to R.drawable.game_chili,
        "mouse" to R.drawable.game_mouse,
        "mouse-gold" to R.drawable.game_mouse_gold,
        "cup" to R.drawable.game_cup,
        "paw" to R.drawable.game_paw,
        "card" to R.drawable.game_card,
        "cat" to R.drawable.game_cat,
        "fries" to R.drawable.game_fries,
        "milk" to R.drawable.game_milk,
        "ramen" to R.drawable.game_ramen,
        "coffee" to R.drawable.game_coffee,
        "heart" to R.drawable.game_heart,
        "heart-empty" to R.drawable.game_heart_empty,
        "trophy" to R.drawable.game_trophy,
        "flame" to R.drawable.game_flame,
        "sparkle" to R.drawable.game_sparkle,
        "clock" to R.drawable.game_clock,
        "paw-white" to R.drawable.game_paw_white,
    )

    /** Cup Stack's 9-slice block (16 x 12, 4 px corners). */
    const val BLOCK_SLICE = 4

    @DrawableRes
    fun icon(name: String): Int = ICONS[name] ?: R.drawable.game_paw
}

/**
 * A whole pixel-art drawable, unfiltered and centred in [width] by [height] at
 * the nearest whole number of screen pixels per art pixel, so every pixel is
 * the same size.
 */
@Composable
fun PixelImage(@DrawableRes res: Int, width: Dp, height: Dp, modifier: Modifier = Modifier, alpha: Float = 1f) {
    val image = ImageBitmap.imageResource(res)
    Canvas(modifier.size(width, height)) {
        val k = wholeScale(min(size.width / image.width, size.height / image.height))
        val box = IntSize(image.width * k, image.height * k)
        val at = IntOffset(((size.width - box.width) / 2f).roundToInt(), ((size.height - box.height) / 2f).roundToInt())
        drawPixels(image, at, box, alpha)
    }
}

/** The nearest whole scale to [scale], at least 1. */
fun wholeScale(scale: Float): Int = scale.roundToInt().coerceAtLeast(1)

/** One of the games' 16 x 16 icons by name. */
@Composable
fun PixelIcon(name: String, size: Dp, modifier: Modifier = Modifier, alpha: Float = 1f) {
    PixelImage(GameSprites.icon(name), size, size, modifier, alpha)
}

/** Draws all of [image], unfiltered, into the box at [at] of [box]. */
fun DrawScope.drawPixels(image: ImageBitmap, at: IntOffset, box: IntSize, alpha: Float = 1f) {
    drawImage(
        image = image,
        srcOffset = IntOffset.Zero,
        srcSize = IntSize(image.width, image.height),
        dstOffset = at,
        dstSize = box,
        alpha = alpha,
        filterQuality = FilterQuality.None,
    )
}

/**
 * Draws [image] as a 9-slice into the box at [x], [y] of [w] by [h]: the
 * [slice] px corners scaled by [scale] stay crisp and the middle stretches.
 */
fun DrawScope.drawNineSlice(image: ImageBitmap, x: Float, y: Float, w: Float, h: Float, slice: Int, scale: Float) {
    val edge = min(slice * scale, min(w, h) / 2f)
    val xs = floatArrayOf(x, x + edge, x + w - edge, x + w)
    val ys = floatArrayOf(y, y + edge, y + h - edge, y + h)
    val sx = intArrayOf(0, slice, image.width - slice, image.width)
    val sy = intArrayOf(0, slice, image.height - slice, image.height)
    for (r in 0..2) {
        for (c in 0..2) {
            val left = xs[c].roundToInt()
            val top = ys[r].roundToInt()
            val width = xs[c + 1].roundToInt() - left
            val height = ys[r + 1].roundToInt() - top
            if (width <= 0 || height <= 0) continue
            drawImage(
                image = image,
                srcOffset = IntOffset(sx[c], sy[r]),
                srcSize = IntSize(sx[c + 1] - sx[c], sy[r + 1] - sy[r]),
                dstOffset = IntOffset(left, top),
                dstSize = IntSize(width, height),
                filterQuality = FilterQuality.None,
            )
        }
    }
}

/** Three hearts for a game's lives, the lost ones empty. */
@Composable
fun LivesChip(lives: Int) {
    val left = lives.coerceIn(0, 3)
    Row(
        Modifier.clip(CircleShape).background(Kit.colors.cell).padding(horizontal = 12.dp, vertical = 8.dp)
            .semantics(mergeDescendants = true) { contentDescription = "$left ${if (left == 1) "life" else "lives"} left" },
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(3) { PixelIcon(if (it < left) "heart" else "heart-empty", 20.dp) }
    }
}
