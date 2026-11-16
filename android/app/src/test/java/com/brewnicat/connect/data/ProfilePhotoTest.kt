package com.brewnicat.connect.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProfilePhotoTest {
    private val photo = "https://lh3.googleusercontent.com/a/ACg8ocTest=s96-c"

    @Test
    fun onlyGooglePhotoAddressesAreKept() {
        assertEquals(photo, ProfilePhoto.safe(" $photo "))
        listOf(
            "http://lh3.googleusercontent.com/a/x",
            "https://lh3.googleusercontent.com.evil.example/a/x",
            "https://evil.example/lh3.googleusercontent.com/a/x",
            "https://lh3.googleusercontent.com/a/x?y=1",
            "",
            null,
        ).forEach { assertNull(it, ProfilePhoto.safe(it)) }
        assertEquals(photo, ProfilePhoto.fromMetadata(JSONObject().put("picture", photo)))
        assertNull(ProfilePhoto.fromMetadata(JSONObject().put("avatar_url", "https://evil.example/p.png")))
        assertEquals("MC", ProfilePhoto.initials("maria clara santos"))
        assertEquals("?", ProfilePhoto.initials(" "))
    }

    @Test
    fun signInKeepsThePhotoAndReviewsReadIt() {
        val token = JSONObject()
            .put("access_token", "a").put("refresh_token", "r").put("expires_in", 3600)
            .put("user", JSONObject().put("id", "u1").put("email", "c@example.com")
                .put("user_metadata", JSONObject().put("full_name", "Maria Clara").put("avatar_url", photo)))
        val session = AuthSession.fromSupabaseTokenResponse(token, nowEpochSeconds = 1_000L)!!
        assertEquals(photo, session.photoUrl)
        assertEquals(photo, AuthSession.fromJson(session.toJson())!!.photoUrl)

        val review = AccountParsers.parseReview(
            JSONObject().put("id", "r1").put("display_name", "Maria").put("rating", 5)
                .put("body", "Lovely").put("avatar_url", photo),
        )!!
        assertEquals(photo, review.avatarUrl)
        val noPhoto = AccountParsers.parseReview(
            JSONObject().put("id", "r2").put("display_name", "Guest").put("rating", 4)
                .put("body", "Nice").put("avatar_url", JSONObject.NULL),
        )!!
        assertNull(noPhoto.avatarUrl)
    }
}
