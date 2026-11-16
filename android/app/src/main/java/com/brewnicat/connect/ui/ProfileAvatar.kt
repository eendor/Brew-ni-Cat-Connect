package com.brewnicat.connect.ui

import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import com.brewnicat.connect.data.ProfilePhoto
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.semibold
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

/*
 * Google profile photos (FR-119). A tiny loader: only Google's photo server,
 * at most 512 KB, no cookies or referrer, kept in memory for the session.
 */
object ProfilePhotoLoader {
    private const val MAX_BYTES = 512 * 1024
    private val cache = LruCache<String, ImageBitmap>(48)
    private val http: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
            .followRedirects(false)
            .build()
    }

    fun cached(url: String?): ImageBitmap? = ProfilePhoto.safe(url)?.let { cache.get(it) }

    suspend fun load(url: String?): ImageBitmap? {
        val safe = ProfilePhoto.safe(url) ?: return null
        cache.get(safe)?.let { return it }
        return withContext(Dispatchers.IO) {
            runCatching {
                http.newCall(Request.Builder().url(safe).get().build()).execute().use { response ->
                    val body = response.body ?: return@use null
                    if (!response.isSuccessful || body.contentLength() > MAX_BYTES) return@use null
                    val bytes = readCapped(body.byteStream(), MAX_BYTES) ?: return@use null
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
                }
            }.getOrNull()?.also { cache.put(safe, it) }
        }
    }
}

/** The whole stream, or null when it is longer than max bytes. */
internal fun readCapped(input: java.io.InputStream, max: Int): ByteArray? {
    val out = java.io.ByteArrayOutputStream()
    val buffer = ByteArray(8 * 1024)
    while (true) {
        val read = input.read(buffer)
        if (read < 0) break
        if (out.size() + read > max) return null
        out.write(buffer, 0, read)
    }
    return out.toByteArray()
}

/**
 * A round profile photo with an initials fallback. Decorative: the name is
 * always shown beside it, so screen readers skip it.
 */
@Composable
fun ProfileAvatar(
    name: String?,
    photoUrl: String?,
    size: Dp,
    modifier: Modifier = Modifier,
    textStyle: TextStyle = KitType.subhead.semibold,
) {
    val photo by produceState(ProfilePhotoLoader.cached(photoUrl), photoUrl) {
        value = ProfilePhotoLoader.load(photoUrl)
    }
    Box(
        modifier.size(size).clip(CircleShape)
            .background(Brush.linearGradient(listOf(Color(0xFF2A8156), Color(0xFF123F29))))
            .clearAndSetSemantics { },
        contentAlignment = Alignment.Center,
    ) {
        val image = photo
        if (image != null) {
            Image(image, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else {
            Text(ProfilePhoto.initials(name), style = textStyle, color = Color.White)
        }
    }
}
