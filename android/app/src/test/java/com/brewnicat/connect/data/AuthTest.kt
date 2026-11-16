package com.brewnicat.connect.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthTest {
    @Test
    fun pkceVerifierAndChallengeFollowRfc7636() {
        val verifier = AuthPkce.generateCodeVerifier()
        assertTrue(Regex("^[A-Za-z0-9_-]{43,128}$").matches(verifier))
        // Known S256 test vector from RFC 7636 Appendix B
        val challenge = AuthPkce.codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
        assertEquals("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", challenge)
    }

    @Test
    fun authorizeUrlCarriesProviderRedirectAndChallenge() {
        val url = AuthPkce.buildGoogleAuthorizeUrl("https://proj.supabase.co/", "CHALLENGE123")
        assertTrue(url.startsWith("https://proj.supabase.co/auth/v1/authorize?"))
        assertTrue("provider=google" in url)
        assertTrue("code_challenge=CHALLENGE123" in url)
        assertTrue("code_challenge_method=S256" in url)
        assertTrue("com.brewnicat.connect%3A%2F%2Fauth%2Fcallback" in url)
    }

    @Test
    fun parseCallbackHandlesCodeCancelAndUnrelatedLinks() {
        assertEquals(
            AuthCallback.Code("pkce-code-1"),
            AuthPkce.parseCallback("com.brewnicat.connect://auth/callback?code=pkce-code-1"),
        )
        val cancelled = AuthPkce.parseCallback("com.brewnicat.connect://auth/callback?error=access_denied")
        assertTrue(cancelled is AuthCallback.Error && cancelled.error == "access_denied" && "cancelled" in cancelled.message)

        val fragmentErr = AuthPkce.parseCallback("com.brewnicat.connect://auth/callback#error=server_error&error_description=boom")
        assertTrue(fragmentErr is AuthCallback.Error && fragmentErr.error == "server_error")

        assertEquals(AuthCallback.None, AuthPkce.parseCallback("https://brew-ni-cat-connect.vercel.app/orders/BNC-234567"))
        assertEquals(AuthCallback.None, AuthPkce.parseCallback(null))
    }

    @Test
    fun sessionParsesSupabaseResponseAndRoundTripsJson() {
        val raw = JSONObject(
            """
            {
              "access_token": "jwt-access",
              "refresh_token": "refresh-tok",
              "expires_in": 3600,
              "expires_at": 1800000000,
              "user": {
                "id": "user-uuid-1",
                "email": "catlover@gmail.com",
                "user_metadata": { "full_name": "Mia Santos" }
              }
            }
            """.trimIndent(),
        )
        val session = AuthSession.fromSupabaseTokenResponse(raw, nowEpochSeconds = 1799996400)
        assertNotNull(session)
        assertEquals("Mia Santos", session!!.label)
        assertFalse(session.isExpired(nowEpochSeconds = 1799999900, leewaySeconds = 60))
        assertTrue(session.isExpired(nowEpochSeconds = 1799999950, leewaySeconds = 60))

        val restored = AuthSession.fromJson(session.toJson())
        assertEquals(session, restored)

        val cipher = PlainTokenCipher.encrypt(session.toJson().toString())
        val decrypted = PlainTokenCipher.decrypt(cipher)
        assertEquals(session, AuthSession.fromJson(JSONObject(decrypted!!)))
        assertNull(AuthSession.fromJson(JSONObject()))
    }
}
