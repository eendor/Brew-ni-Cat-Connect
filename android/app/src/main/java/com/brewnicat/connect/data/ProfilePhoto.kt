package com.brewnicat.connect.data

import org.json.JSONObject

/*
 * Google profile photos (FR-119). Google sign-in gives Supabase Auth the
 * address of the customer's photo; only addresses on Google's photo server
 * are used, the same rule as src/lib/account/avatar.ts and the database.
 */
object ProfilePhoto {
    private val GOOGLE_PHOTO = Regex("^https://lh3\\.googleusercontent\\.com/[A-Za-z0-9/_=.-]+$")
    private const val MAX_LENGTH = 600

    fun safe(value: String?): String? {
        val url = value?.trim() ?: return null
        return url.takeIf { it.length <= MAX_LENGTH && GOOGLE_PHOTO.matches(it) }
    }

    fun fromMetadata(meta: JSONObject?): String? =
        listOf("avatar_url", "picture").firstNotNullOfOrNull { key ->
            safe(meta?.optString(key)?.takeIf { it.isNotBlank() && it != "null" })
        }

    fun initials(name: String?): String =
        name.orEmpty().trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2)
            .joinToString("") { it.substring(0, it.offsetByCodePoints(0, 1)) }
            .uppercase()
            .ifEmpty { "?" }
}
