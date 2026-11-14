package com.brewnicat.connect.ui.screens

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.brewnicat.connect.data.AdConfig
import com.brewnicat.connect.ui.theme.Brand
import kotlinx.coroutines.delay

private class AdBridge(private val onFilled: () -> Unit) {
    private val main = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun onAdFilled() {
        main.post { onFilled() }
    }
}

private enum class AdFillState { LOADING, FILLED, EMPTY }

/**
 * Sandboxed 300x250 Adsterra banner for waiting and completed order views
 * (FR-090 update). No WebView is instantiated until the customer agrees.
 */
@Composable
fun AdsterraAdCard(
    adKey: String,
    scriptHost: String,
    consent: Boolean?,
    onConsentChange: (Boolean) -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Column(
            Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Pill(
                text = "Ad",
                color = Brand.colors.muted,
                background = Brand.colors.warm,
            )

            when (consent) {
                null -> {
                    Text(
                        "Show an ad here? Ads help support the shop. They come from Adsterra and appear only in the games and on waiting or completed orders.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Brand.colors.ink,
                        textAlign = TextAlign.Center,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedButton(onClick = { onConsentChange(false) }) {
                            Text("No thanks", color = Brand.colors.ink)
                        }
                        PrimaryButton(
                            text = "Show ads",
                            onClick = { onConsentChange(true) },
                        )
                    }
                }
                false -> {
                    TextButton(onClick = { onConsentChange(true) }) {
                        Text("Show ads to support the shop", color = Brand.colors.accent)
                    }
                }
                true -> {
                    AdFrameContent(
                        adKey = adKey,
                        scriptHost = scriptHost,
                        onTurnOff = { onConsentChange(false) },
                    )
                }
            }
        }
    }
}

@Composable
private fun AdFrameContent(
    adKey: String,
    scriptHost: String,
    onTurnOff: () -> Unit,
) {
    var reloadNonce by remember { mutableIntStateOf(0) }
    var fillState by remember(reloadNonce) { mutableStateOf(AdFillState.LOADING) }

    LaunchedEffect(reloadNonce) {
        fillState = AdFillState.LOADING
        delay(AdConfig.AD_FILL_TIMEOUT_MS)
        if (fillState == AdFillState.LOADING) fillState = AdFillState.EMPTY
    }

    if (fillState == AdFillState.EMPTY) {
        Text(
            "No ad to show right now.",
            style = MaterialTheme.typography.bodySmall,
            color = Brand.colors.muted,
            textAlign = TextAlign.Center,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(onClick = { reloadNonce++ }) {
                Text("Try again", color = Brand.colors.accent)
            }
            TextButton(onClick = onTurnOff) {
                Text("Turn off ads", color = Brand.colors.muted)
            }
        }
        return
    }

    Box(
        Modifier.size(width = AdConfig.AD_WIDTH.dp, height = AdConfig.AD_HEIGHT.dp),
        contentAlignment = Alignment.Center,
    ) {
        AdWebView(
            adKey = adKey,
            scriptHost = scriptHost,
            reloadNonce = reloadNonce,
            onFilled = { fillState = AdFillState.FILLED },
        )
        if (fillState == AdFillState.LOADING) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = Brand.colors.accent)
                Text("Loading ad…", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
            }
        }
    }
    TextButton(onClick = onTurnOff) {
        Text("Turn off ads", color = Brand.colors.muted)
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun AdWebView(
    adKey: String,
    scriptHost: String,
    reloadNonce: Int,
    onFilled: () -> Unit,
) {
    val targetUrl = remember(adKey, scriptHost, reloadNonce) { AdConfig.adDataUrl(adKey, scriptHost) }
    val holder = remember { arrayOfNulls<WebView>(1) }

    DisposableEffect(Unit) {
        onDispose {
            holder[0]?.let { w ->
                w.stopLoading()
                w.destroy()
            }
            holder[0] = null
        }
    }

    AndroidView(
        modifier = Modifier.size(width = AdConfig.AD_WIDTH.dp, height = AdConfig.AD_HEIGHT.dp),
        factory = { context ->
            WebView(context).apply {
                holder[0] = this
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                addJavascriptInterface(AdBridge(onFilled), "BncAdBridge")
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                        val uri = request?.url ?: return false
                        if (uri.scheme == "data" || uri.scheme == "about") return false
                        if (uri.scheme == "https" || uri.scheme == "http") {
                            runCatching { CustomTabsIntent.Builder().build().launchUrl(context, uri) }
                                .onFailure { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) } }
                        }
                        return true
                    }
                }
                loadUrl(targetUrl)
                tag = reloadNonce
            }
        },
        update = { webView ->
            if (webView.tag != reloadNonce) {
                webView.tag = reloadNonce
                webView.loadUrl(targetUrl)
            }
        },
    )
}
