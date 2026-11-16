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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import com.brewnicat.connect.ui.kit.Badge
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.Group
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.Spinner
import com.brewnicat.connect.ui.kit.Text
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
    modifier: Modifier = Modifier,
) {
    val c = Kit.colors
    Group(modifier) {
        Cell {
            Column(
                Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Badge("Ad", color = c.gray)
                when (consent) {
                    null -> {
                        Text(
                            "Show an ad here? Ads help support the shop. They come from Adsterra and appear only in the games and on waiting or completed orders.",
                            style = KitType.subhead,
                            color = c.label2,
                            textAlign = TextAlign.Center,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
                            KitButton("No thanks", { onConsentChange(false) }, Modifier.weight(1f), style = ButtonStyle.Gray, size = ButtonSize.Medium)
                            KitButton("Show ads", { onConsentChange(true) }, Modifier.weight(1f), size = ButtonSize.Medium)
                        }
                    }
                    false -> KitButton("Show ads to support the shop", { onConsentChange(true) }, style = ButtonStyle.Plain, size = ButtonSize.Small)
                    true -> AdFrameContent(adKey = adKey, scriptHost = scriptHost, onTurnOff = { onConsentChange(false) })
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
    val c = Kit.colors
    var reloadNonce by remember { mutableIntStateOf(0) }
    var fillState by remember(reloadNonce) { mutableStateOf(AdFillState.LOADING) }

    LaunchedEffect(reloadNonce) {
        fillState = AdFillState.LOADING
        delay(AdConfig.AD_FILL_TIMEOUT_MS)
        if (fillState == AdFillState.LOADING) fillState = AdFillState.EMPTY
    }

    if (fillState == AdFillState.EMPTY) {
        Text("No ad to show right now.", style = KitType.subhead, color = c.label2, textAlign = TextAlign.Center)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            KitButton("Try again", { reloadNonce++ }, style = ButtonStyle.Tinted, size = ButtonSize.Small)
            KitButton("Turn off ads", onTurnOff, style = ButtonStyle.Gray, size = ButtonSize.Small)
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
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Spinner(size = 16.dp)
                Text("Loading ad…", style = KitType.footnote, color = c.label2)
            }
        }
    }
    KitButton("Turn off ads", onTurnOff, style = ButtonStyle.Plain, size = ButtonSize.Small)
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
                        // Only a tap on the ad may open a page. An ad that redirects on its own
                        // (no user gesture) is blocked instead of throwing the customer into a browser.
                        if (request.hasGesture() && (uri.scheme == "https" || uri.scheme == "http")) {
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
