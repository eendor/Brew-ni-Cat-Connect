package com.brewnicat.connect.data

import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okio.Buffer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** TC-P9-070, TC-P9-071: reading latest.json and checking the downloaded APK (FR-117). */
class AppUpdateTest {
    private lateinit var server: MockWebServer
    private lateinit var site: String
    private val apkBytes = ByteArray(200_000) { (it % 251).toByte() }
    private val apkSha = AppUpdate.sha256Hex(apkBytes.inputStream())

    @Before fun start() {
        server = MockWebServer()
        server.start()
        site = server.url("/").toString().trimEnd('/')
    }

    @After fun stop() = server.shutdown()

    private fun manifest(url: String = "/android/brew-ni-cat-connect-1.0.1.apk", sha: String = apkSha, code: Int = 4) =
        """{"versionCode":$code,"versionName":"1.0.1","url":"$url","sha256":"$sha","size":${apkBytes.size},"notes":"Faster menu."}"""

    @Test fun parsesARelativeApkOnTheSameSite() {
        val release = AppUpdate.parse(manifest(), "https://brew.example")
        assertEquals(4, release?.versionCode)
        assertEquals("https://brew.example/android/brew-ni-cat-connect-1.0.1.apk", release?.apkUrl)
        assertEquals("Faster menu.", release?.notes)
        assertEquals("0.2 MB", AppUpdate.sizeLabel(release!!.size))
    }

    @Test fun refusesAnotherHostABadHashOrNotAnApk() {
        assertNull(AppUpdate.parse(manifest(url = "https://evil.example/a.apk"), "https://brew.example"))
        assertNull(AppUpdate.parse(manifest(url = "http://brew.example/a.apk"), "https://brew.example"))
        assertNull(AppUpdate.parse(manifest(url = "/android/latest.json"), "https://brew.example"))
        assertNull(AppUpdate.parse(manifest(sha = "abc"), "https://brew.example"))
        assertNull(AppUpdate.parse(manifest(code = 0), "https://brew.example"))
        assertNull(AppUpdate.parse("<html>", "https://brew.example"))
    }

    @Test fun promptsForANewerVersionAndWaitsADayAfterLater() {
        val release = AppUpdate.parse(manifest(), "https://brew.example")
        val now = 10L * AppUpdate.SNOOZE_MS
        assertFalse(AppUpdate.shouldPrompt(release, installedCode = 4, snoozedCode = null, snoozedAtMs = 0, nowMs = now))
        assertTrue(AppUpdate.shouldPrompt(release, 3, null, 0, now))
        assertFalse(AppUpdate.shouldPrompt(release, 3, snoozedCode = 4, snoozedAtMs = now - 1000, nowMs = now))
        assertTrue(AppUpdate.shouldPrompt(release, 3, snoozedCode = 4, snoozedAtMs = now - AppUpdate.SNOOZE_MS, nowMs = now))
        assertTrue("a newer build than the one put off asks at once", AppUpdate.shouldPrompt(release, 3, snoozedCode = 3, snoozedAtMs = now, nowMs = now))
        assertFalse(AppUpdate.shouldPrompt(null, 3, null, 0, now))
    }

    @Test fun fetchesLatestJsonFromTheSite() = runTest {
        server.enqueue(MockResponse().setBody(manifest()))
        val release = AppUpdateClient(site).latest()
        assertEquals("/android/latest.json", server.takeRequest().path)
        assertEquals("$site/android/brew-ni-cat-connect-1.0.1.apk", release?.apkUrl)
        server.enqueue(MockResponse().setResponseCode(404))
        assertNull(AppUpdateClient(site).latest())
    }

    @Test fun keepsTheApkOnlyWhenItsHashMatches() = runTest {
        val dir = Files.createTempDirectory("updates").toFile()
        File(dir, "old.apk").writeText("left over")
        val release = AppUpdate.parse(manifest(), site)!!
        server.enqueue(MockResponse().setBody(Buffer().write(apkBytes)))
        var last = 0f
        val apk = AppUpdateClient(site).download(release, dir) { last = it }
        assertNotNull(apk)
        assertEquals(1f, last)
        assertEquals(listOf(apk!!.name), dir.list()!!.toList())

        val changed = apkBytes.copyOf().also { it[0] = 99 }
        server.enqueue(MockResponse().setBody(Buffer().write(changed)))
        assertNull(AppUpdateClient(site).download(release, dir))
        assertEquals("a changed APK is deleted", 0, dir.list()!!.size)

        server.enqueue(MockResponse().setResponseCode(500))
        assertNull(AppUpdateClient(site).download(release, dir))
        dir.deleteRecursively()
    }
}
