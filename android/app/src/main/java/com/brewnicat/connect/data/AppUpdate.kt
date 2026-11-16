package com.brewnicat.connect.data

import java.io.File
import java.io.InputStream
import java.security.MessageDigest
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

/*
 * In-app updates from the shop's own website (FR-117, ADR-038). The site
 * publishes /android/latest.json next to the APK. The app reads it, and when
 * the version is newer it downloads the APK from the same site, checks its
 * SHA-256 against latest.json and hands it to Android's installer. Android
 * then asks the customer to confirm, and refuses the APK unless it is signed
 * with the same key as the installed app.
 */

/** One published build, as latest.json describes it. */
data class AppRelease(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val sha256: String,
    val size: Long,
    val notes: String,
)

object AppUpdate {
    const val MANIFEST_PATH = "/android/latest.json"
    /** After Later, the same version is offered again a day later. */
    const val SNOOZE_MS = 24L * 60 * 60 * 1000
    private val SHA256 = Regex("^[0-9a-f]{64}$")

    /**
     * Reads latest.json, or null when anything is off. The APK must be on the
     * same site and scheme as the app's own site and end in .apk, so a
     * changed file can't point the app at another server.
     */
    fun parse(json: String, siteUrl: String): AppRelease? = runCatching {
        val o = JSONObject(json)
        val code = o.getInt("versionCode")
        val name = o.getString("versionName").trim()
        val sha = o.getString("sha256").trim().lowercase()
        if (code <= 0 || name.isEmpty() || !SHA256.matches(sha)) return null
        val site = siteUrl.toHttpUrlOrNull() ?: return null
        val apk = site.resolve(o.getString("url").trim()) ?: return null
        if (apk.scheme != site.scheme || apk.host != site.host || apk.port != site.port) return null
        if (!apk.encodedPath.endsWith(".apk")) return null
        AppRelease(code, name, apk.toString(), sha, o.optLong("size", 0L).coerceAtLeast(0L), o.optString("notes", "").trim().take(300))
    }.getOrNull()

    fun isNewer(release: AppRelease?, installedCode: Int): Boolean = release != null && release.versionCode > installedCode

    /** Whether to show the update alert by itself, without the customer asking. */
    fun shouldPrompt(release: AppRelease?, installedCode: Int, snoozedCode: Int?, snoozedAtMs: Long, nowMs: Long): Boolean {
        if (!isNewer(release, installedCode)) return false
        if (snoozedCode == null || release!!.versionCode > snoozedCode) return true
        return nowMs - snoozedAtMs >= SNOOZE_MS
    }

    fun sha256Hex(input: InputStream): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(64 * 1024)
        while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            digest.update(buffer, 0, read)
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    /** "2.7 MB", for the alert. */
    fun sizeLabel(bytes: Long): String? = if (bytes <= 0) null else "%.1f MB".format(java.util.Locale.US, bytes / 1_000_000.0)
}

/** Fetches latest.json and the APK. Needs no Android classes, so JVM tests can run it. */
class AppUpdateClient(
    private val siteUrl: String,
    http: OkHttpClient = Api.defaultClient(),
) {
    // The download gets its own timeouts: a slow phone connection may need longer than an API call.
    private val download = http.newBuilder().callTimeout(0, TimeUnit.SECONDS).readTimeout(60, TimeUnit.SECONDS).build()
    private val http = http

    suspend fun latest(): AppRelease? = withContext(Dispatchers.IO) {
        val url = siteUrl.trimEnd('/').toHttpUrlOrNull()?.resolve(AppUpdate.MANIFEST_PATH) ?: return@withContext null
        runCatching {
            http.newCall(Request.Builder().url(url).header("Cache-Control", "no-cache").build()).execute().use { response ->
                if (!response.isSuccessful) null else AppUpdate.parse(response.body?.string().orEmpty(), siteUrl)
            }
        }.getOrNull()
    }

    /**
     * Downloads the APK into [dir] (emptied first) and returns it only when its
     * SHA-256 matches latest.json. A broken or changed download is deleted.
     */
    suspend fun download(release: AppRelease, dir: File, onProgress: (Float) -> Unit = {}): File? = withContext(Dispatchers.IO) {
        dir.mkdirs()
        dir.listFiles()?.forEach { it.delete() }
        val target = File(dir, "brew-ni-cat-connect-${release.versionCode}.apk")
        val ok = runCatching {
            download.newCall(Request.Builder().url(release.apkUrl).build()).execute().use { response ->
                val body = response.body
                if (!response.isSuccessful || body == null) return@use false
                val total = body.contentLength().takeIf { it > 0 } ?: release.size
                val digest = MessageDigest.getInstance("SHA-256")
                var done = 0L
                body.byteStream().use { input ->
                    target.outputStream().use { output ->
                        val buffer = ByteArray(64 * 1024)
                        while (true) {
                            val read = input.read(buffer)
                            if (read < 0) break
                            output.write(buffer, 0, read)
                            digest.update(buffer, 0, read)
                            done += read
                            if (total > 0) onProgress((done.toFloat() / total).coerceIn(0f, 1f))
                        }
                    }
                }
                digest.digest().joinToString("") { "%02x".format(it) } == release.sha256
            }
        }.getOrDefault(false)
        if (ok) target else { target.delete(); null }
    }
}
