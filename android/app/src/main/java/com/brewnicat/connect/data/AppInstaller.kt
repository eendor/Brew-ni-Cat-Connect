package com.brewnicat.connect.data

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import java.io.File

/**
 * Hands a checked APK to Android's package installer (FR-117). Android shows
 * its own confirmation, and installs only an APK signed with the same key.
 */
class AppInstaller(private val context: Context) {
    val downloadDir: File get() = File(context.cacheDir, "updates")

    /** Whether the customer has allowed this app to install updates. */
    fun canInstall(): Boolean = context.packageManager.canRequestPackageInstalls()

    /** Opens the "Install unknown apps" switch for this app. */
    fun openInstallSetting() {
        runCatching {
            context.startActivity(
                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, "package:${context.packageName}".toUri())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
    }

    fun install(apk: File): Boolean = runCatching {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", apk)
        context.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
        )
        true
    }.getOrDefault(false)
}
