package com.brewnicat.connect.ui

import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.data.SitePagesParser
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.Spinner
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

/*
 * The shop's photos for About and Gallery. Only the site's own /images/ files,
 * through its resizer, at most 1.5 MB each, kept in memory for the session.
 */
object SitePhotoLoader {
    private const val MAX_BYTES = 1536 * 1024
    private val cache = LruCache<String, ImageBitmap>(40)
    private val http: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .followRedirects(false)
            .build()
    }

    fun url(path: String, width: Int): String? = SitePagesParser.imageUrl(BuildConfig.SITE_URL, path, width)

    fun cached(url: String?): ImageBitmap? = url?.let { cache.get(it) }

    suspend fun load(url: String?): ImageBitmap? {
        if (url == null) return null
        cache.get(url)?.let { return it }
        return withContext(Dispatchers.IO) {
            runCatching {
                http.newCall(Request.Builder().url(url).header("Accept", "image/webp,image/jpeg,image/*").get().build()).execute().use { response ->
                    val body = response.body ?: return@use null
                    if (!response.isSuccessful || body.contentLength() > MAX_BYTES) return@use null
                    val bytes = readCapped(body.byteStream(), MAX_BYTES) ?: return@use null
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
                }
            }.getOrNull()?.also { cache.put(url, it) }
        }
    }
}

/** A shop photo filling [modifier], with a quiet fill and spinner while it loads. */
@Composable
fun SitePhotoImage(path: String, alt: String, modifier: Modifier = Modifier, width: Int = 640) {
    val url = SitePhotoLoader.url(path, width)
    // Null while loading; a photo, or a failed marker, once the load is done.
    val photo by produceState<Result<ImageBitmap>?>(SitePhotoLoader.cached(url)?.let { Result.success(it) }, url) {
        value = SitePhotoLoader.load(url)?.let { Result.success(it) } ?: Result.failure(IllegalStateException("not loaded"))
    }
    Box(
        modifier.background(Kit.colors.fill3).semantics { if (alt.isNotBlank()) contentDescription = alt },
        contentAlignment = Alignment.Center,
    ) {
        val image = photo?.getOrNull()
        when {
            image != null -> Image(image, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            photo == null -> Spinner(size = 20.dp)
            else -> com.brewnicat.connect.ui.kit.Icon(com.brewnicat.connect.ui.kit.KitIcons.PawPrint, null, tint = Kit.colors.label3, size = 28.dp)
        }
    }
}
