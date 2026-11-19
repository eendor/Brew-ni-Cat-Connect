package com.brewnicat.connect.ui.kit

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/*
 * 2D picture icons for menu items with no photo yet. From open icon sets: Tabler Icons
 * (https://tabler.io/icons, MIT, Copyright (c) 2020-2026 Paweł Kuna), Lucide
 * (https://lucide.dev, ISC) and Material Design Icons
 * (https://pictogrammers.com, Apache-2.0). Path data copied unchanged through
 * the Iconify API; see android/THIRD_PARTY_NOTICES.md. Do not edit by hand.
 */

private fun icon(name: String, filled: Boolean, vararg paths: String): ImageVector =
    ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
        paths.forEach {
            addPath(
                pathData = addPathNodes(it),
                fill = if (filled) SolidColor(Color.Black) else null,
                stroke = if (filled) null else SolidColor(Color.Black),
                strokeLineWidth = if (filled) 0f else 2f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            )
        }
    }.build()

object PictureIcons {
    /** Tabler Icons (MIT): bowl-chopsticks */
    val Noodles: ImageVector by lazy { icon("Noodles", false, "M4 11h16a1 1 0 0 1 1 1v.5c0 1.5-2.517 5.573-4 6.5v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1c-1.687-1.054-4-5-4-6.5V12a1 1 0 0 1 1-1m15-4L5 8m14-6L5 5") }
    /** Tabler Icons (MIT): bottle */
    val Bottle: ImageVector by lazy { icon("Bottle", false, "M10 5h4V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1z", "M14 3.5c0 1.626.507 3.212 1.45 4.537l.05.07a8.1 8.1 0 0 1 1.5 4.694V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6.2c0-1.682.524-3.322 1.5-4.693l.05-.07A7.82 7.82 0 0 0 10 3.5", "M7 14.803A2.4 2.4 0 0 0 8 14a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 1-.805") }
    /** Tabler Icons (MIT): bubble-tea */
    val BubbleTea: ImageVector by lazy { icon("BubbleTea", false, "m17.95 9l-1.478 8.69c-.25 1.463-.374 2.195-.936 2.631c-1.2.931-6.039.88-7.172 0c-.562-.436-.687-1.168-.936-2.632L5.95 9M6 9l.514-1.286a5.908 5.908 0 0 1 10.972 0L18 9M5 9h14m-7 0l4-7m-5.99 12h.01m1 4h.01m1.99-2h.01") }
    /** Tabler Icons (MIT): cheese */
    val Nachos: ImageVector by lazy { icon("Nachos", false, "M4.519 20.008L21 20v-3.5a2 2 0 1 1 0-4V9H4.278", "m21 9l-9.385-4.992c-2.512.12-4.758 1.42-6.327 3.425C3.865 9.253 3 11.654 3 14.287c0 2.117.56 4.085 1.519 5.721M15 13v.01M8 13v.01M11 16v.01") }
    /** Tabler Icons (MIT): paw */
    val Paw: ImageVector by lazy { icon("Paw", false, "M14.7 13.5c-1.1-2-1.441-2.5-2.7-2.5s-1.736.755-2.836 2.747c-.942 1.703-2.846 1.845-3.321 3.291c-.097.265-.145.677-.143.962c0 1.176.787 2 1.8 2c1.259 0 3-1 4.5-1s3.241 1 4.5 1c1.013 0 1.8-.823 1.8-2c0-.285-.049-.697-.146-.962c-.475-1.451-2.512-1.835-3.454-3.538m5.488-5.418A1 1 0 0 0 19.782 8h-.015c-.735.012-1.56.75-1.993 1.866c-.519 1.335-.28 2.7.538 3.052q.196.082.406.082c.739 0 1.575-.742 2.011-1.866c.516-1.335.273-2.7-.54-3.052zM9.474 9c.055 0 .109 0 .163-.011c.944-.128 1.533-1.346 1.32-2.722C10.754 4.97 9.91 4 9.025 4c-.055 0-.109 0-.163.011c-.944.128-1.533 1.346-1.32 2.722C7.746 8.026 8.59 9 9.475 9m6.981-2.267c.214-1.376-.375-2.594-1.32-2.722A1 1 0 0 0 14.974 4c-.885 0-1.728.97-1.93 2.267c-.214 1.376.375 2.594 1.32 2.722q.081.01.162.011c.885 0 1.73-.974 1.93-2.267M5.69 12.918c.816-.352 1.054-1.719.536-3.052C5.79 8.742 4.955 8 4.217 8q-.211 0-.407.082c-.816.352-1.054 1.719-.536 3.052C3.71 12.258 4.545 13 5.283 13q.211 0 .407-.082") }
    /** Tabler Icons (MIT): basket */
    val Combo: ImageVector by lazy { icon("Combo", false, "M10 14a2 2 0 1 0 4 0a2 2 0 0 0-4 0", "M5.001 8H19a2 2 0 0 1 1.977 2.304l-1.255 7.152A3 3 0 0 1 16.756 20H7.244a3 3 0 0 1-2.965-2.544l-1.255-7.152A2 2 0 0 1 5.001 8M17 10l-2-6m-8 6l2-6") }
    /** Tabler Icons (MIT): package */
    val TakeOut: ImageVector by lazy { icon("TakeOut", false, "m12 3l8 4.5v9L12 21l-8-4.5v-9zm0 9l8-4.5M12 12v9m0-9L4 7.5m12-2.25l-8 4.5") }
    /** Tabler Icons (MIT): coffee */
    val Coffee: ImageVector by lazy { icon("Coffee", false, "M3 14c.83.642 2.077 1.017 3.5 1c1.423.017 2.67-.358 3.5-1s2.077-1.017 3.5-1c1.423-.017 2.67.358 3.5 1M8 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2m4-4a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2", "M3 10h14v5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z", "M16.746 16.726a3 3 0 1 0 .252-5.555") }
    /** Lucide (ISC): cup-soda */
    val Soda: ImageVector by lazy { icon("Soda", false, "m6 8l1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8M5 8h14", "M7 15a6.47 6.47 0 0 1 5 0a6.47 6.47 0 0 0 5 0m-5-7l1-6h2") }
    /** Lucide (ISC): utensils */
    val Utensils: ImageVector by lazy { icon("Utensils", false, "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20m14-7V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2zm0 0v7") }
    /** Material Design Icons by Pictogrammers (Apache-2.0): french-fries */
    val Fries: ImageVector by lazy { icon("Fries", true, "M18 11V6h-3V4h-3V2H8v3H6v6H5l2 11h10l2-11zm-2.14 0c-.16.61-.46 1.16-.86 1.62v-4l2 1V11zM17 7v1.5l-2-1V7zm-5-2h2v3.5l-2 1zm0 5.62l2-1v3.83c-.59.35-1.27.55-2 .55zm-1 3.24c-.79-.21-1.5-.64-2-1.24v-3l2-1zM9 3h2v4.5L10 8V5H9zM7 6h2v2.5L8 9v2H7z") }
}
