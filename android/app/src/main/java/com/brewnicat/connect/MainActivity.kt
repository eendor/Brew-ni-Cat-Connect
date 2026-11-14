package com.brewnicat.connect

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.BrewApp
import com.brewnicat.connect.ui.theme.BrewTheme

class MainActivity : ComponentActivity() {
    private val vm: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (savedInstanceState == null) handleLink(intent)
        setContent { BrewTheme { BrewApp(vm) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleLink(intent)
    }

    /** https://<site>/orders/BNC-XXXXXX#token=<tracking token> */
    private fun handleLink(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme != "https" || uri.host != BuildConfig.SITE_URL.removePrefix("https://")) return
        val segments = uri.pathSegments
        if (segments.size != 2 || segments[0] != "orders") return
        val token = uri.fragment?.split("&")?.firstNotNullOfOrNull { part ->
            part.split("=", limit = 2).takeIf { it.size == 2 && it[0] == "token" }?.get(1)
        } ?: return
        vm.openOrderLink(segments[1], token)
    }
}
