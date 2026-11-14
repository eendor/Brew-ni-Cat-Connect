package com.brewnicat.connect.ui.screens

import android.content.Context
import android.content.Intent
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.RateReview
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.brewnicat.connect.BuildConfig
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.theme.Brand

@Composable
fun AccountScreen(vm: AppViewModel) {
    val context = LocalContext.current
    val session = vm.session
    val bottomPad = if (vm.cart.isEmpty) 24.dp else 88.dp

    LaunchedEffect(session?.userId) {
        if (session != null) vm.loadAccountSummary()
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = bottomPad),
    ) {
        BrandHeader {
            if (session != null) {
                TextButton(onClick = vm::signOut) {
                    Text("Sign out", color = Brand.colors.muted)
                }
            }
        }

        Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (vm.authBusy) {
                Card(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        CircularProgressIndicator(Modifier.size(22.dp), color = Brand.colors.accent, strokeWidth = 2.5.dp)
                        Text("Finishing sign-in with Google…", style = MaterialTheme.typography.titleSmall, color = Brand.colors.ink)
                    }
                }
            }

            vm.authError?.let { Notice(it) }

            if (session == null) {
                Text("Customer account", style = MaterialTheme.typography.headlineMedium, color = Brand.colors.ink)
                Card(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Sign in with Google", style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                        Text(
                            "Sign in to earn loyalty points on every completed order, redeem café rewards, save favorite drinks and food, view past orders, and prefill checkout.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Brand.colors.muted,
                        )
                        Text(
                            "We receive only your name and email address from Google.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Brand.colors.muted,
                        )
                        Spacer(Modifier.height(4.dp))
                        PrimaryButton(
                            text = "Continue with Google",
                            onClick = { launchCustomTab(context, vm.startGoogleSignIn()) },
                            enabled = !vm.authBusy && vm.api.isConfigured,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                AccountLinkCard(
                    icon = Icons.Rounded.RateReview,
                    title = "Shop reviews",
                    subtitle = "Read customer ratings or post a review as a guest.",
                    onClick = { vm.open(Screen.Reviews) },
                )
            } else {
                val greetingName = vm.profile?.fullName?.takeIf { it.isNotBlank() } ?: session.label
                Text("Hi, $greetingName", style = MaterialTheme.typography.headlineMedium, color = Brand.colors.ink)
                if (session.email.isNotBlank()) {
                    Text(session.email, style = MaterialTheme.typography.bodyMedium, color = Brand.colors.muted)
                }

                Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(MaterialTheme.shapes.extraLarge)
                        .background(Brand.colors.accentSurface)
                        .clickable { vm.open(Screen.Rewards) }
                        .padding(18.dp),
                ) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Loyalty balance", style = MaterialTheme.typography.labelLarge, color = Brand.colors.accent)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "${vm.loyaltyBalance ?: 0} pts",
                                style = MaterialTheme.typography.displaySmall,
                                color = Brand.colors.strong,
                            )
                            Text("Tap to browse rewards & points history", style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                        }
                        Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = Brand.colors.accent)
                    }
                }

                AccountLinkCard(
                    icon = Icons.Rounded.CardGiftcard,
                    title = "Rewards & points",
                    subtitle = "Redeem points for café favorites and view point history.",
                    onClick = { vm.open(Screen.Rewards) },
                )
                AccountLinkCard(
                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                    title = "Order history",
                    subtitle = "See past pickup orders, track progress, or reorder.",
                    onClick = { vm.open(Screen.OrderHistory) },
                )
                AccountLinkCard(
                    icon = Icons.Rounded.Favorite,
                    title = "Favorites",
                    subtitle = "Menu items you saved (${vm.favoriteIds.size}).",
                    onClick = { vm.open(Screen.Favorites) },
                )
                AccountLinkCard(
                    icon = Icons.Rounded.Person,
                    title = "Profile",
                    subtitle = vm.profile?.phone?.let { "Saved number: $it" } ?: "Add your name & mobile number to prefill checkout.",
                    onClick = { vm.open(Screen.Profile) },
                )
                AccountLinkCard(
                    icon = Icons.Rounded.RateReview,
                    title = "Shop reviews",
                    subtitle = "Read customer ratings and share or edit your review.",
                    onClick = { vm.open(Screen.Reviews) },
                )
                AccountLinkCard(
                    icon = Icons.Rounded.Security,
                    title = "Data requests",
                    subtitle = "Request a correction or deletion of your account data.",
                    onClick = { vm.open(Screen.DataRequests) },
                )
            }

            OutlinedButton(
                onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, (BuildConfig.SITE_URL + "/privacy").toUri())) } },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Brand.colors.accent),
            ) {
                Text("Read Privacy Policy")
            }
        }
    }
}

@Composable
private fun AccountLinkCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .background(Brand.colors.card)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = Brand.colors.accent, modifier = Modifier.size(26.dp))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
        }
        Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = Brand.colors.muted)
    }
}

private fun launchCustomTab(context: Context, url: String) {
    runCatching {
        CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context, url.toUri())
    }.onFailure {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) }
    }
}
