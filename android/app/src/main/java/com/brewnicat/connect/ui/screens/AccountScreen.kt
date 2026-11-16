package com.brewnicat.connect.ui.screens

import android.content.Context
import android.content.Intent
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.kit.ButtonRow
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Icon
import com.brewnicat.connect.ui.kit.IconCircle
import com.brewnicat.connect.ui.kit.IconTile
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.Spinner
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.bold
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.semibold

@Composable
fun AccountScreen(vm: AppViewModel) {
    val context = LocalContext.current
    val c = Kit.colors
    val session = vm.session

    LaunchedEffect(session?.userId) {
        if (session != null) vm.loadAccountSummary()
    }

    Page("Account") {
        if (vm.authBusy) {
            item(key = "busy") {
                Section {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Spinner()
                        Text("Finishing sign-in with Google…", style = KitType.body, color = c.label)
                    }
                }
            }
        }
        vm.authError?.let { e -> item(key = "error") { Notice(e, Modifier.padding(horizontal = Gutter).padding(top = 12.dp), warning = true) } }

        if (session == null) {
            item(key = "signin") {
                Section(footer = "We receive only your name and email address from Google.") {
                    Cell {
                        Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            IconCircle(KitIcons.UserRound, size = 64.dp)
                            Text("Customer account", style = KitType.footnote.semibold, color = c.label2, modifier = Modifier.padding(top = 14.dp))
                            Text("Sign in with Google", style = KitType.title2.bold, color = c.label, modifier = Modifier.padding(top = 2.dp).semantics { heading() })
                            Text(
                                "Sign in to earn loyalty points on every completed order, redeem café rewards, save favorite drinks and food, view past orders, and prefill checkout.",
                                style = KitType.subhead, color = c.label2, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp),
                            )
                            KitButton(
                                "Continue with Google",
                                { launchCustomTab(context, vm.startGoogleSignIn()) },
                                Modifier.fillMaxWidth().padding(top = 18.dp),
                                enabled = !vm.authBusy && vm.api.isConfigured,
                            )
                        }
                    }
                }
            }
            item(key = "links") {
                Section {
                    ListRow(
                        "Shop reviews", subtitle = "Read customer ratings or post a review as a guest.",
                        leading = { IconTile(KitIcons.MessageSquareText, c.indigo) }, chevron = true,
                        onClick = { vm.open(Screen.Reviews) },
                    )
                }
            }
        } else {
            val greetingName = vm.profile?.fullName?.takeIf { it.isNotBlank() } ?: session.label
            item(key = "me") {
                Section {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(60.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF2A8156), Color(0xFF123F29)))),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(greetingName.trim().take(1).uppercase(), style = KitType.title2.semibold, color = Color.White)
                        }
                        Column(Modifier.weight(1f).padding(start = 14.dp)) {
                            Text("Hi, $greetingName", style = KitType.title3.semibold, color = c.label, maxLines = 2)
                            if (session.email.isNotBlank()) Text(session.email, style = KitType.subhead, color = c.label2, maxLines = 1)
                        }
                    }
                }
            }
            item(key = "points") {
                Section {
                    Row(
                        Modifier.fillMaxWidth().pressable(onClickLabel = "Browse rewards") { vm.open(Screen.Rewards) }
                            .background(Brush.linearGradient(listOf(Color(0xFF2A8156), Color(0xFF123F29))))
                            .padding(horizontal = 18.dp, vertical = 18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("Loyalty balance", style = KitType.footnote.semibold, color = Color.White.copy(alpha = 0.78f))
                            Text("${vm.loyaltyBalance ?: 0} pts", style = KitType.largeTitle, color = Color.White, modifier = Modifier.padding(top = 2.dp))
                            Text("Tap to browse rewards & points history", style = KitType.footnote, color = Color.White.copy(alpha = 0.78f))
                        }
                        Icon(KitIcons.ChevronRight, null, tint = Color.White.copy(alpha = 0.8f), size = 20.dp)
                    }
                }
            }
            item(key = "links") {
                Section {
                    ListRow(
                        "Rewards & points", subtitle = "Redeem points for café favorites and view point history.",
                        leading = { IconTile(KitIcons.Gift, c.orange) }, chevron = true, onClick = { vm.open(Screen.Rewards) },
                    )
                    ListRow(
                        "Order history", subtitle = "See past pickup orders, track progress, or reorder.",
                        leading = { IconTile(KitIcons.History, c.blue) }, chevron = true, onClick = { vm.open(Screen.OrderHistory) },
                    )
                    ListRow(
                        "Favorites", subtitle = "Menu items you saved (${vm.favoriteIds.size}).",
                        leading = { IconTile(KitIcons.Heart, c.pink) }, chevron = true, onClick = { vm.open(Screen.Favorites) },
                    )
                }
            }
            item(key = "links2") {
                Section {
                    ListRow(
                        "Profile", subtitle = vm.profile?.phone?.let { "Saved number: $it" } ?: "Add your name & mobile number to prefill checkout.",
                        leading = { IconTile(KitIcons.UserRound, c.gray) }, chevron = true, onClick = { vm.open(Screen.Profile) },
                    )
                    ListRow(
                        "Shop reviews", subtitle = "Read customer ratings and share or edit your review.",
                        leading = { IconTile(KitIcons.MessageSquareText, c.indigo) }, chevron = true, onClick = { vm.open(Screen.Reviews) },
                    )
                    ListRow(
                        "Data requests", subtitle = "Request a correction or deletion of your account data.",
                        leading = { IconTile(KitIcons.ShieldCheck, c.green) }, chevron = true, onClick = { vm.open(Screen.DataRequests) },
                    )
                }
            }
        }

        item(key = "privacy") {
            Section {
                ListRow(
                    "Read Privacy Policy",
                    leading = { IconTile(KitIcons.Lock, c.teal) },
                    trailing = { Icon(KitIcons.ArrowUpRight, null, tint = c.label3, size = 18.dp) },
                    onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, (BuildConfig.SITE_URL + "/privacy").toUri())) } },
                )
                val update = vm.availableUpdate
                val progress = vm.updateProgress
                ListRow(
                    "App version ${BuildConfig.VERSION_NAME}",
                    subtitle = when {
                        progress != null -> "Downloading the update… ${(progress * 100).toInt()}%"
                        vm.updateChecking -> "Checking for updates…"
                        update != null -> "Version ${update.versionName} is ready. Tap to update."
                        else -> "Tap to check for updates."
                    },
                    leading = { IconTile(KitIcons.RefreshCw, c.orange) },
                    onClick = { if (update != null) vm.startUpdate() else vm.checkForUpdate(manual = true) },
                )
            }
        }
        if (session != null) {
            item(key = "signout") {
                Section { ButtonRow("Sign out", vm::signOut, destructive = true, centered = true) }
            }
        }
    }
}

private fun launchCustomTab(context: Context, url: String) {
    runCatching {
        CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context, url.toUri())
    }.onFailure {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) }
    }
}
