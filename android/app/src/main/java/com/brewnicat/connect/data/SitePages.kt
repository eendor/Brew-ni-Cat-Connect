package com.brewnicat.connect.data

import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/*
 * The About and Gallery pages inside the app (FR-122). The words and photo
 * lists come from the same `site_content` rows the website shows, so the
 * owner edits them once. Photos are files on the website under /images/.
 */
data class SitePhoto(val path: String, val alt: String)

data class CatRule(val title: String, val text: String)

data class AboutPage(
    val heroTitle: String,
    val heroText: String,
    val intro: String,
    val storyTitle: String,
    val story: List<String>,
    val photos: List<SitePhoto>,
    val catRules: List<CatRule>,
    val menuSummary: String,
    /** "June 8, 2026", or null when the date is missing or not a date. */
    val openedOn: String?,
)

data class GalleryPage(val photos: List<SitePhoto>)

data class SitePages(val about: AboutPage?, val gallery: GalleryPage?)

object SitePagesParser {
    private val SAFE_PATH = Regex("^/images/[A-Za-z0-9_\\-/]+\\.(jpg|jpeg|png|webp)$", RegexOption.IGNORE_CASE)

    /** Only the site's own photo files: anything else is dropped. */
    fun safePath(path: String?): String? =
        path?.trim()?.takeIf { SAFE_PATH.matches(it) && !it.contains("//") }

    /** The site's resized copy of a photo (Next.js image optimizer), [width] wide. */
    fun imageUrl(siteUrl: String, path: String, width: Int = 640): String? {
        val safe = safePath(path) ?: return null
        val base = siteUrl.trimEnd('/')
        if (base.isEmpty()) return null
        return "$base/_next/image?url=${URLEncoder.encode(safe, "UTF-8")}&w=$width&q=75"
    }

    private fun photos(array: JSONArray?): List<SitePhoto> {
        if (array == null) return emptyList()
        return (0 until array.length()).mapNotNull { i ->
            val o = array.optJSONObject(i) ?: return@mapNotNull null
            val path = safePath(o.optString("src")) ?: return@mapNotNull null
            SitePhoto(path, o.optString("alt").trim())
        }
    }

    private fun strings(array: JSONArray?): List<String> =
        if (array == null) emptyList() else (0 until array.length()).mapNotNull { array.optString(it).trim().ifBlank { null } }

    fun formatOpenedOn(value: String?): String? = runCatching {
        LocalDate.parse(value!!.trim()).format(DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.US))
    }.getOrNull()

    fun parseAbout(json: JSONObject?): AboutPage? {
        if (json == null) return null
        val heroTitle = json.optString("heroTitle").trim()
        val intro = json.optString("intro").trim()
        if (heroTitle.isEmpty() && intro.isEmpty()) return null
        val rules = json.optJSONArray("catRules")?.let { a ->
            (0 until a.length()).mapNotNull { i ->
                val o = a.optJSONObject(i) ?: return@mapNotNull null
                val title = o.optString("title").trim()
                val text = o.optString("text").trim()
                if (title.isEmpty() && text.isEmpty()) null else CatRule(title, text)
            }
        }.orEmpty()
        return AboutPage(
            heroTitle = heroTitle,
            heroText = json.optString("heroText").trim(),
            intro = intro,
            storyTitle = json.optString("storyTitle").trim(),
            story = strings(json.optJSONArray("story")),
            photos = photos(json.optJSONArray("photos")),
            catRules = rules,
            menuSummary = json.optString("menuSummary").trim(),
            openedOn = formatOpenedOn(json.optString("openedOn")),
        )
    }

    fun parseGallery(json: JSONObject?): GalleryPage? {
        val list = photos(json?.optJSONArray("photos"))
        return if (list.isEmpty()) null else GalleryPage(list)
    }

    /** From the `site_content` rows for "about" and "gallery". */
    fun parse(rows: List<JSONObject>): SitePages = SitePages(
        about = parseAbout(rows.firstOrNull { it.optString("section") == "about" }?.optJSONObject("content")),
        gallery = parseGallery(rows.firstOrNull { it.optString("section") == "gallery" }?.optJSONObject("content")),
    )
}
