package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.Coins
import com.brewnicat.connect.data.LoyaltyFormat
import com.brewnicat.connect.data.RewardCodeStatus
import androidx.compose.ui.text.style.TextDecoration
import com.brewnicat.connect.data.RewardItem
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.kit.Alert
import com.brewnicat.connect.ui.kit.BarAction
import com.brewnicat.connect.ui.kit.ButtonRow
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.IconTile
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.SectionHeader
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.bold
import com.brewnicat.connect.ui.kit.groupItems
import com.brewnicat.connect.ui.kit.semibold

@Composable
fun RewardsScreen(vm: AppViewModel) {
    val c = Kit.colors
    var confirmReward by remember { mutableStateOf<RewardItem?>(null) }

    LaunchedEffect(Unit) { vm.loadRewards() }

    Page("Rewards & coins", onBack = { vm.back() }, trailing = { BarAction("History", { vm.open(Screen.LoyaltyHistory) }) }) {
        if (vm.rewardsLoading && vm.rewards.isEmpty()) {
            item(key = "loading") { LoadingState(Modifier.fillParentMaxHeight(0.6f)) }
            return@Page
        }
        val balance = vm.loyaltyBalance ?: 0.0
        item(key = "balance") {
            Section {
                Column(
                    Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Color(0xFF2A8156), Color(0xFF123F29)))).padding(20.dp),
                ) {
                    Text("Your balance", style = KitType.footnote.semibold, color = Color.White.copy(alpha = 0.78f))
                    Text(Coins.label(balance), style = KitType.largeTitle, color = Color.White, modifier = Modifier.padding(top = 2.dp))
                    Text(
                        LoyaltyFormat.earningRule(vm.loyaltySettings.currencyStep, vm.loyaltySettings.pointsPerStep),
                        style = KitType.footnote, color = Color.White.copy(alpha = 0.85f), modifier = Modifier.padding(top = 8.dp),
                    )
                    Text(LoyaltyFormat.weeklyLimitNote(vm.loyaltySettings.weeklyLimit), style = KitType.footnote, color = Color.White.copy(alpha = 0.85f))
                }
            }
        }

        vm.lastRedeem?.let { redeemed ->
            item(key = "redeemed") {
                Section(header = "Reward unlocked") {
                    Cell {
                        Text(redeemed.rewardName, style = KitType.title3.semibold, color = c.label)
                        Box(
                            Modifier.fillMaxWidth().padding(vertical = 12.dp).clip(RoundedCornerShape(16.dp)).background(c.fill3).padding(14.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(redeemed.code, style = KitType.title1.bold, color = c.tint, textAlign = TextAlign.Center)
                        }
                        Text(
                            "Show this verification code at the counter. ${Coins.label(redeemed.pointsSpent.toDouble())} spent · New balance: ${Coins.label(redeemed.newBalance)}.",
                            style = KitType.footnote, color = c.label2,
                        )
                    }
                    ButtonRow("Dismiss", vm::dismissRedeemFeedback, centered = true)
                }
            }
        }

        if (vm.rewardCodes.isNotEmpty()) {
            item(key = "codes-heading") {
                Column(Modifier.padding(horizontal = Gutter).padding(top = 24.dp)) {
                    SectionHeader("My codes")
                    Text("Show a code at the counter. Each code works once.", style = KitType.footnote, color = c.label2)
                }
            }
            groupItems(vm.rewardCodes, key = { "code-${it.code}" }) { code ->
                val status = LoyaltyFormat.codeStatus(code)
                val ready = status == RewardCodeStatus.READY
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconTile(KitIcons.Gift, if (ready) c.orange else c.gray, size = 32.dp)
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(code.rewardName, style = KitType.body, color = c.label)
                        Text(
                            code.code,
                            style = KitType.headline.copy(textDecoration = if (ready) null else TextDecoration.LineThrough),
                            color = if (ready) c.tint else c.label2,
                        )
                        Text(
                            LoyaltyFormat.codeSourceLabel(code) + if (ready) " · Use by ${LoyaltyFormat.formatDate(code.expiresAt)}" else "",
                            style = KitType.footnote, color = c.label2,
                        )
                    }
                    Text(status.label, style = KitType.footnote.semibold, color = if (ready) c.green else c.label2)
                }
            }
        }

        vm.redeemError?.let { err -> item(key = "redeem-err") { Notice(err, Modifier.padding(horizontal = Gutter).padding(top = 16.dp), warning = true) } }
        vm.rewardsError?.let { err ->
            item(key = "load-err") {
                EmptyState(KitIcons.CircleAlert, "Couldn't load rewards", err, actionLabel = "Try again", onAction = { vm.loadRewards() }, warning = true)
            }
        }

        if (vm.rewards.isNotEmpty()) {
            item(key = "heading") { Column(Modifier.padding(horizontal = Gutter).padding(top = 24.dp)) { SectionHeader("Available rewards") } }
            groupItems(vm.rewards, key = { it.id }) { reward ->
                val affordable = balance >= reward.points
                ListRow(
                    reward.name,
                    subtitle = listOfNotNull(reward.description.takeIf { it.isNotBlank() }, Coins.label(reward.points.toDouble())).joinToString("\n"),
                    leading = { IconTile(KitIcons.Gift, if (affordable) c.orange else c.gray, size = 36.dp) },
                    trailing = {
                        KitButton(
                            if (affordable) "Redeem" else "Need ${Coins.amount(reward.points - balance)} more",
                            { confirmReward = reward },
                            style = if (affordable) ButtonStyle.Prominent else ButtonStyle.Gray,
                            size = ButtonSize.Small,
                            enabled = affordable && !vm.redeeming,
                        )
                    },
                )
            }
        }
    }

    confirmReward?.let { target ->
        Alert(
            title = "Redeem ${target.name}?",
            message = "This spends ${Coins.label(target.points.toDouble())} and gives you a verification code to show at the café counter.",
            primary = "Confirm",
            onPrimary = {
                vm.redeemReward(target.id)
                confirmReward = null
            },
            secondary = "Cancel",
            onDismiss = { if (!vm.redeeming) confirmReward = null },
        )
    }
}

@Composable
fun LoyaltyHistoryScreen(vm: AppViewModel) {
    val c = Kit.colors
    LaunchedEffect(Unit) { vm.loadLoyaltyHistory() }

    Page("Coins history", onBack = { vm.back() }) {
        when {
            vm.rewardsLoading && vm.loyaltyHistory.isEmpty() -> item(key = "loading") { LoadingState(Modifier.fillParentMaxHeight(0.6f)) }
            vm.rewardsError != null && vm.loyaltyHistory.isEmpty() -> item(key = "failed") {
                EmptyState(
                    KitIcons.CircleAlert, "Couldn't load history", vm.rewardsError ?: "", Modifier.fillParentMaxHeight(0.7f),
                    "Try again", { vm.loadLoyaltyHistory() }, warning = true,
                )
            }
            vm.loyaltyHistory.isEmpty() -> item(key = "empty") {
                EmptyState(KitIcons.PawPrint, "No coins activity yet", "Complete an online order while signed in to earn coins.", Modifier.fillParentMaxHeight(0.7f))
            }
            else -> {
                item(key = "gap") { Box(Modifier.padding(top = 8.dp)) }
                groupItems(vm.loyaltyHistory, key = { it.id }) { tx ->
                    val earned = tx.points > 0.0
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        IconTile(if (earned) KitIcons.Plus else KitIcons.Gift, if (earned) c.green else c.orange, size = 32.dp)
                        Column(Modifier.weight(1f).padding(start = 12.dp)) {
                            Text(LoyaltyFormat.reasonLabel(tx.reason, tx.note), style = KitType.body, color = c.label)
                            tx.orderReference?.let { ref -> Text("Order $ref", style = KitType.footnote, color = c.tint) }
                            Text(LoyaltyFormat.formatDateTime(tx.createdAt), style = KitType.footnote, color = c.label2)
                        }
                        Text(LoyaltyFormat.pointsDelta(tx.points), style = KitType.headline, color = if (earned) c.tint else c.label2)
                    }
                }
            }
        }
    }
}
