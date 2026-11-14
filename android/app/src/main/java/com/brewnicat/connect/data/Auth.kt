package com.brewnicat.connect.data

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

/*
 * Google sign-in via Supabase PKCE (ADR-030, FR-031 to FR-036, FR-067).
 * The browser finishes Google consent and returns a one-time code to
 * com.brewnicat.connect://auth/callback; only the device holding the PKCE
 * verifier can exchange it for tokens, which stay encrypted on device.
 */

data class AuthSession(
    val accessToken: String,
    val refreshToken: String,
    val expiresAtEpochSeconds: Long,
    val userId: String,
    val email: String,
    val displayName: String?,
) {
    fun isExpired(
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
        leewaySeconds: Long = 60L,
    ): Boolean = expiresAtEpochSeconds <= nowEpochSeconds + leewaySeconds

    val label: String get() = displayName?.takeIf { it.isNotBlank() } ?: email.ifBlank { "Customer" }

    fun toJson(): JSONObject = JSONObject()
        .put("accessToken", accessToken)
        .put("refreshToken", refreshToken)
        .put("expiresAtEpochSeconds", expiresAtEpochSeconds)
        .put("userId", userId)
        .put("email", email)
        .put("displayName", displayName ?: JSONObject.NULL)

    companion object {
        fun fromJson(json: JSONObject): AuthSession? = runCatching {
            val accessToken = json.optString("accessToken").trim()
            val refreshToken = json.optString("refreshToken").trim()
            val userId = json.optString("userId").trim()
            val expiresAt = json.optLong("expiresAtEpochSeconds", 0L)
            if (accessToken.isBlank() || refreshToken.isBlank() || userId.isBlank() || expiresAt <= 0L) {
                return null
            }
            val display = json.optString("displayName").takeIf { it.isNotBlank() && it != "null" }
            AuthSession(
                accessToken = accessToken,
                refreshToken = refreshToken,
                expiresAtEpochSeconds = expiresAt,
                userId = userId,
                email = json.optString("email"),
                displayName = display,
            )
        }.getOrNull()

        fun fromSupabaseTokenResponse(
            json: JSONObject,
            nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
        ): AuthSession? = runCatching {
            val accessToken = json.optString("access_token").trim()
            val refreshToken = json.optString("refresh_token").trim()
            val user = json.optJSONObject("user") ?: return null
            val userId = user.optString("id").trim()
            if (accessToken.isBlank() || refreshToken.isBlank() || userId.isBlank()) return null

            val expiresAt = json.optLong("expires_at", 0L).takeIf { it > 0L }
                ?: (nowEpochSeconds + json.optLong("expires_in", 3600L).coerceAtLeast(60L))
            val meta = user.optJSONObject("user_metadata")
            val name = listOf("full_name", "name")
                .firstNotNullOfOrNull { k -> meta?.optString(k)?.trim()?.takeIf { it.isNotBlank() } }
            AuthSession(
                accessToken = accessToken,
                refreshToken = refreshToken,
                expiresAtEpochSeconds = expiresAt,
                userId = userId,
                email = user.optString("email"),
                displayName = name,
            )
        }.getOrNull()
    }
}

sealed interface AuthCallback {
    data class Code(val code: String) : AuthCallback
    data class Error(val error: String, val message: String) : AuthCallback
    data object None : AuthCallback
}

object AuthPkce {
    const val REDIRECT_URI = "com.brewnicat.connect://auth/callback"
    private val random = SecureRandom()

    fun generateCodeVerifier(): String {
        val bytes = ByteArray(48).also(random::nextBytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun codeChallenge(verifier: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(verifier.toByteArray(StandardCharsets.US_ASCII))
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest)
    }

    fun buildGoogleAuthorizeUrl(
        supabaseUrl: String,
        codeChallenge: String,
        redirectUri: String = REDIRECT_URI,
    ): String {
        val base = supabaseUrl.trimEnd('/')
        val encRedirect = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8.name())
        val encChallenge = URLEncoder.encode(codeChallenge, StandardCharsets.UTF_8.name())
        return "$base/auth/v1/authorize?provider=google" +
            "&redirect_to=$encRedirect" +
            "&code_challenge=$encChallenge" +
            "&code_challenge_method=S256" +
            "&prompt=select_account"
    }

    fun parseCallback(uriString: String?): AuthCallback {
        if (uriString.isNullOrBlank()) return AuthCallback.None
        val uri = runCatching { URI(uriString) }.getOrNull() ?: return AuthCallback.None
        if (uri.scheme != "com.brewnicat.connect" || uri.host != "auth") return AuthCallback.None
        val path = uri.path.orEmpty()
        if (!path.startsWith("/callback")) return AuthCallback.None

        val params = LinkedHashMap<String, String>()
        parseParams(uri.rawFragment, params)
        parseParams(uri.rawQuery, params)

        val err = params["error"]?.trim()?.takeIf { it.isNotEmpty() }
        if (err != null) {
            val friendly = if (err == "access_denied") {
                "Google sign-in was cancelled. You can try again whenever you're ready."
            } else {
                "We couldn't finish signing you in with Google. Please try again."
            }
            return AuthCallback.Error(err, friendly)
        }

        val code = params["code"]?.trim()?.takeIf { it.isNotEmpty() }
        return if (code != null) AuthCallback.Code(code) else AuthCallback.Error("missing_code", "We couldn't finish signing you in with Google. Please try again.")
    }

    private fun parseParams(raw: String?, out: MutableMap<String, String>) {
        if (raw.isNullOrBlank()) return
        for (pair in raw.split('&')) {
            val eq = pair.indexOf('=')
            if (eq <= 0) continue
            val key = URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8.name())
            val value = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8.name())
            out[key] = value
        }
    }
}

/** Encrypts sensitive values stored on the device. */
interface TokenCipher {
    fun encrypt(plain: String): String?
    fun decrypt(cipherText: String): String?
}

/** Plain pass-through codec used only in JVM unit tests where AndroidKeyStore is absent. */
object PlainTokenCipher : TokenCipher {
    override fun encrypt(plain: String): String = Base64.getEncoder().encodeToString(plain.toByteArray(StandardCharsets.UTF_8))
    override fun decrypt(cipherText: String): String? = runCatching {
        String(Base64.getDecoder().decode(cipherText), StandardCharsets.UTF_8)
    }.getOrNull()
}

/** Hardware-backed AES-256-GCM encryption via AndroidKeyStore for session persistence (FR-067). */
class KeystoreTokenCipher(private val alias: String = "brew_ni_cat_auth_v1") : TokenCipher {
    override fun encrypt(plain: String): String? = runCatching {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val iv = cipher.iv
        val encrypted = cipher.doFinal(plain.toByteArray(StandardCharsets.UTF_8))
        val enc = Base64.getEncoder()
        "${enc.encodeToString(iv)}:${enc.encodeToString(encrypted)}"
    }.getOrNull()

    override fun decrypt(cipherText: String): String? = runCatching {
        val sep = cipherText.indexOf(':')
        if (sep <= 0) return null
        val dec = Base64.getDecoder()
        val iv = dec.decode(cipherText.substring(0, sep))
        val payload = dec.decode(cipherText.substring(sep + 1))
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(TAG_BITS, iv))
        String(cipher.doFinal(payload), StandardCharsets.UTF_8)
    }.getOrNull()

    private fun secretKey(): SecretKey {
        val store = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
        generator.init(
            KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }

    private companion object {
        const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val TAG_BITS = 128
    }
}
