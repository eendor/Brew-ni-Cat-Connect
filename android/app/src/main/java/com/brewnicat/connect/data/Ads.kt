package com.brewnicat.connect.data

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.Locale
import org.json.JSONObject

/*
 * Sandboxed Adsterra 300x250 banner helpers for waiting & completed order screens
 * (FR-090 update, ADR-036 update). Ads never appear on menu, cart, checkout,
 * account, ready, rejected, or cancelled screens, and never load before consent.
 */

object AdConfig {
    const val AD_WIDTH = 300
    const val AD_HEIGHT = 250
    const val AD_FILL_TIMEOUT_MS = 8_000L
    const val AD_SCRIPT_HOST = "https://bauval.org/22/"

    val VALID_ORDER_STATUSES = setOf("pending", "accepted", "preparing", "completed")
    private val KEY_PATTERN = Regex("^[a-f0-9]{32}$")

    private const val FILL_REPORTER =
        "(function(){var sent=false;" +
            "function sized(el){var r=el.getBoundingClientRect();return r.width>=100&&r.height>=50}" +
            "function has(doc,depth){var els=doc.querySelectorAll(\"img,canvas,video,iframe\");" +
            "for(var i=0;i<els.length;i++){var el=els[i];if(!sized(el))continue;" +
            "if(el.tagName!==\"IFRAME\")return true;" +
            "if(/^https?:/.test(el.getAttribute(\"src\")||\"\"))return true;" +
            "if(depth<2){try{var d=el.contentDocument;if(d&&has(d,depth+1))return true}catch(e){}}}return false}" +
            "function check(){if(sent)return;if(has(document,0)){sent=true;" +
            "if(window.BncAdBridge&&window.BncAdBridge.onAdFilled){window.BncAdBridge.onAdFilled();}}}" +
            "new MutationObserver(check).observe(document.documentElement,{childList:true,subtree:true,attributes:true});" +
            "setInterval(check,1000)})();"

    fun adKey(raw: String?): String? {
        val normalized = raw?.trim()?.lowercase(Locale.ROOT) ?: return null
        return if (KEY_PATTERN.matches(normalized)) normalized else null
    }

    fun shouldShowOrderAd(orderStatus: String?, key: String?): Boolean =
        adKey(key) != null && orderStatus in VALID_ORDER_STATUSES

    fun adDocument(key: String, scriptHost: String = AD_SCRIPT_HOST): String {
        val options = JSONObject()
            .put("key", key)
            .put("format", "iframe")
            .put("height", AD_HEIGHT)
            .put("width", AD_WIDTH)
            .put("params", JSONObject())
            .toString()
        val cleanHost = if (scriptHost.endsWith("/")) scriptHost else "$scriptHost/"
        return "<!doctype html><html><head><meta charset=\"utf-8\">" +
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
            "<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;display:flex;justify-content:center;align-items:center}</style>" +
            "</head><body>" +
            "<script>$FILL_REPORTER</script>" +
            "<script>atOptions = $options;</script>" +
            "<script src=\"${cleanHost}${key}\"></script>" +
            "</body></html>"
    }

    /** Isolated opaque-origin data URL so ad scripts never run under the shop domain. */
    fun adDataUrl(key: String, scriptHost: String = AD_SCRIPT_HOST): String =
        "data:text/html;charset=utf-8," +
            URLEncoder.encode(adDocument(key, scriptHost), StandardCharsets.UTF_8.name()).replace("+", "%20")
}
