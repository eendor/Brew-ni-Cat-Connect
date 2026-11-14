package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.LoyaltyFormat
import com.brewnicat.connect.data.RewardItem
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.theme.Brand

@Composable
fun RewardsScreen(vm: AppViewModel) {
    var confirmReward by remember { mutableStateOf<RewardItem?>(null) }

    LaunchedEffect(Unit) { vm.loadRewards() }

    Column(Modifier.fillMaxSize()) {
        TopBar("Rewards & points", { vm.back() }) {
            TextButton(onClick = { vm.open(Screen.LoyaltyHistory) }) {
                Text("History", color = Brand.colors.accent)
            }
        }

        if (vm.rewardsLoading && vm.rewards.isEmpty()) {
            LoadingState()
            return
        }

        val balance = vm.loyaltyBalance ?: 0
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item("balance") {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(MaterialTheme.shapes.extraLarge)
                        .background(Brand.colors.accentSurface)
                        .padding(18.dp),
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Your balance", style = MaterialTheme.typography.labelLarge, color = Brand.colors.accent)
                        Text("$balance points", style = MaterialTheme.typography.displaySmall, color = Brand.colors.strong)
                        Text(
                            LoyaltyFormat.earningRule(vm.loyaltySettings.currencyStep, vm.loyaltySettings.pointsPerStep),
                            style = MaterialTheme.typography.bodySmall,
                            color = Brand.colors.muted,
                        )
                        Text(
                            LoyaltyFormat.weeklyLimitNote(vm.loyaltySettings.weeklyLimit),
                            style = MaterialTheme.typography.bodySmall,
                            color = Brand.colors.muted,
                        )
                    }
                }
            }

            vm.lastRedeem?.let { redeemed ->
                item("redeemed") {
                    Card(Modifier.fillMaxWidth()) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Reward unlocked", style = MaterialTheme.typography.titleMedium, color = Brand.colors.accent)
                            Text(redeemed.rewardName, style = MaterialTheme.typography.titleLarge, color = Brand.colors.ink)
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(MaterialTheme.shapes.medium)
                                    .background(Brand.colors.warm)
                                    .padding(12.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(redeemed.code, style = MaterialTheme.typography.headlineMedium, color = Brand.colors.strong)
                            }
                            Text(
                                "Show this verification code at the counter. ${redeemed.pointsSpent} pts spent · New balance: ${redeemed.newBalance} pts.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Brand.colors.muted,
                            )
                            TextButton(onClick = vm::dismissRedeemFeedback) {
                                Text("Dismiss", color = Brand.colors.accent)
                            }
                        }
                    }
                }
            }

            vm.redeemError?.let { err -> item("redeem-err") { Notice(err) } }
            vm.rewardsError?.let { err ->
                item("load-err") {
                    MessageState("😿", "Couldn't load rewards", err, action = "Try again") { vm.loadRewards() }
                }
            }

            if (vm.rewards.isNotEmpty()) {
                item("heading") { SectionTitle("Available rewards", Modifier.padding(top = 4.dp)) }
                items(vm.rewards, key = { it.id }) { reward ->
                    val affordable = balance >= reward.points
                    Card(Modifier.fillMaxWidth()) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(reward.name, style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                                if (reward.description.isNotBlank()) {
                                    Text(reward.description, style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                                }
                                Pill(
                                    text = "${reward.points} pts",
                                    color = if (affordable) Brand.colors.accent else Brand.colors.muted,
                                    background = if (affordable) Brand.colors.accentSurface else Brand.colors.warm,
                                )
                            }
                            Button(
                                onClick = { confirmReward = reward },
                                enabled = affordable && !vm.redeeming,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Brand.colors.accentFill,
                                    contentColor = Brand.colors.onAccentFill,
                                ),
                            ) {
                                Text(if (affordable) "Redeem" else "Need ${reward.points - balance}")
                            }
                        }
                    }
                }
            }
        }
    }

    confirmReward?.let { target ->
        AlertDialog(
            onDismissRequest = { if (!vm.redeeming) confirmReward = null },
            title = { Text("Redeem ${target.name}?") },
            text = { Text("This spends ${target.points} loyalty points and gives you a verification code to show at the café counter.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        vm.redeemReward(target.id)
                        confirmReward = null
                    },
                    enabled = !vm.redeeming,
                ) {
                    Text("Confirm", color = Brand.colors.accent)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmReward = null }) {
                    Text("Cancel", color = Brand.colors.muted)
                }
            },
        )
    }
}

@Composable
fun LoyaltyHistoryScreen(vm: AppViewModel) {
    LaunchedEffect(Unit) { vm.loadLoyaltyHistory() }

    Column(Modifier.fillMaxSize()) {
        TopBar("Points history", { vm.back() })
        when {
            vm.rewardsLoading && vm.loyaltyHistory.isEmpty() -> LoadingState()
            vm.rewardsError != null && vm.loyaltyHistory.isEmpty() ->
                MessageState("😿", "Couldn't load history", vm.rewardsError ?: "", action = "Try again") { vm.loadLoyaltyHistory() }
            vm.loyaltyHistory.isEmpty() ->
                MessageState("🐾", "No points activity yet", "Complete an online order while signed in to earn loyalty points.")
            else -> LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(vm.loyaltyHistory, key = { it.id }) { tx ->
                    val earned = tx.points > 0
                    Card(Modifier.fillMaxWidth()) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(LoyaltyFormat.reasonLabel(tx.reason, tx.note), style = MaterialTheme.typography.titleSmall, color = Brand.colors.ink)
                                tx.orderReference?.let { ref ->
                                    Text("Order $ref", style = MaterialTheme.typography.bodySmall, color = Brand.colors.accent)
                                }
                                Text(LoyaltyFormat.formatDateTime(tx.createdAt), style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                            }
                            Pill(
                                text = LoyaltyFormat.pointsDelta(tx.points),
                                color = if (earned) Brand.colors.accent else Brand.colors.strong,
                                background = if (earned) Brand.colors.accentSurface else Brand.colors.warm,
                            )
                        }
                    }
                }
            }
        }
    }
}
