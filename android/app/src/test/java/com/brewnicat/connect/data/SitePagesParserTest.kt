package com.brewnicat.connect.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SitePagesParserTest {
    @Test
    fun keepsOnlyTheSitesOwnPhotoPaths() {
        assertEquals("/images/shop/photo_148.jpg", SitePagesParser.safePath(" /images/shop/photo_148.jpg "))
        assertNull(SitePagesParser.safePath("https://example.com/a.jpg"))
        assertNull(SitePagesParser.safePath("/images/../secret.jpg"))
        assertNull(SitePagesParser.safePath("/images//shop/a.jpg"))
        assertNull(SitePagesParser.safePath("/images/shop/a.svg"))
        assertNull(SitePagesParser.safePath("/other/a.jpg"))
        assertNull(SitePagesParser.safePath(null))
    }

    @Test
    fun buildsTheResizedPhotoUrl() {
        assertEquals(
            "https://shop.example/_next/image?url=%2Fimages%2Fshop%2Fphoto_148.jpg&w=640&q=75",
            SitePagesParser.imageUrl("https://shop.example/", "/images/shop/photo_148.jpg"),
        )
        assertNull(SitePagesParser.imageUrl("", "/images/shop/photo_148.jpg"))
        assertNull(SitePagesParser.imageUrl("https://shop.example", "javascript:alert(1)"))
    }

    @Test
    fun formatsTheOpeningDate() {
        assertEquals("March 5, 2024", SitePagesParser.formatOpenedOn("2024-03-05"))
        assertNull(SitePagesParser.formatOpenedOn("soon"))
        assertNull(SitePagesParser.formatOpenedOn(null))
    }

    @Test
    fun parsesAboutAndGalleryRows() {
        val about = JSONObject(
            """{"section":"about","content":{"heroTitle":"Hello","intro":"Intro","story":["One"," ",""],
            "photos":[{"src":"/images/shop/a.jpg","alt":"A"},{"src":"http://x/b.jpg","alt":"B"}],
            "catRules":[{"title":"Be gentle","text":"Pet softly."},{"title":"","text":""}],"openedOn":"2024-03-05"}}""",
        )
        val gallery = JSONObject("""{"section":"gallery","content":{"photos":[{"src":"/images/shop/c.webp","alt":"C"}]}}""")
        val pages = SitePagesParser.parse(listOf(about, gallery))
        val a = pages.about!!
        assertEquals("Hello", a.heroTitle)
        assertEquals(listOf("One"), a.story)
        assertEquals(listOf(SitePhoto("/images/shop/a.jpg", "A")), a.photos)
        assertEquals(listOf(CatRule("Be gentle", "Pet softly.")), a.catRules)
        assertEquals("March 5, 2024", a.openedOn)
        assertEquals(listOf(SitePhoto("/images/shop/c.webp", "C")), pages.gallery!!.photos)
    }

    @Test
    fun emptyContentGivesNoPage() {
        val pages = SitePagesParser.parse(
            listOf(JSONObject("""{"section":"about","content":{}}"""), JSONObject("""{"section":"gallery","content":{"photos":[]}}""")),
        )
        assertNull(pages.about)
        assertNull(pages.gallery)
    }
}
