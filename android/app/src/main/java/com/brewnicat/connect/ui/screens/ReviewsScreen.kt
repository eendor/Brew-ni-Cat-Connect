package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.LoyaltyFormat
import com.brewnicat.connect.data.ReviewValidation
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.kit.ButtonRow
import com.brewnicat.connect.ui.kit.Cell
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.FieldRow
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Notice
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.SectionHeader
import com.brewnicat.connect.ui.kit.StarRow
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.bold
import com.brewnicat.connect.ui.kit.groupItems
import com.brewnicat.connect.ui.kit.semibold
import java.util.Locale

@Composable
fun ReviewsScreen(vm: AppViewModel) {
    val c = Kit.colors
    var rating by remember(vm.myReview?.id) { mutableIntStateOf(vm.myReview?.rating ?: 0) }
    var body by remember(vm.myReview?.id) { mutableStateOf(vm.myReview?.body.orEmpty()) }

    LaunchedEffect(vm.session?.userId) { vm.loadReviews(reset = true) }
    LaunchedEffect(vm.myReview?.id, vm.myReview?.updatedAt) {
        vm.myReview?.let {
            rating = it.rating
            body = it.body
        }
    }

    Page("Shop reviews", onBack = { vm.back() }) {
        item(key = "summary") {
            Section {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Customer rating", style = KitType.headline, color = c.label)
                        Text(
                            "${vm.reviewsTotalCount} review${if (vm.reviewsTotalCount == 1) "" else "s"}",
                            style = KitType.subhead, color = c.label2,
                        )
                    }
                    if (vm.reviewsTotalCount > 0) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(String.format(Locale.US, "%.1f ★", vm.reviewsAverage), style = KitType.title1.bold, color = c.label)
                            StarRow(vm.reviewsAverage.toInt(), size = 14.dp)
                        }
                    }
                }
            }
        }

        item(key = "composer") {
            val isEditing = vm.session != null && vm.myReview != null
            Section(
                header = if (isEditing) "Edit your review" else "Write a review",
                footer = if (vm.session != null) {
                    val first = vm.profile?.fullName?.trim()?.split(Regex("\\s+"))?.firstOrNull()?.takeIf { it.isNotEmpty() } ?: "Customer"
                    "Posting with your first name: $first"
                } else {
                    "Posting as Guest. Sign in on the Account tab if you want to edit your review later."
                },
            ) {
                Cell {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("Your rating", style = KitType.body, color = c.label, modifier = Modifier.weight(1f))
                        StarRow(rating = rating, size = 28.dp, onSelect = { rating = it })
                    }
                }
                FieldRow(
                    "Your experience at Brew ni Cat", body, { if (it.length <= ReviewValidation.MAX_LENGTH) body = it },
                    singleLine = false, minLines = 3,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                )
                Text(
                    "${ReviewValidation.MAX_LENGTH - body.length} characters left", style = KitType.footnote, color = c.label3,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
                )
            }
        }
        vm.reviewError?.let { e -> item(key = "error") { Notice(e, Modifier.padding(horizontal = Gutter).padding(top = 16.dp), warning = true) } }
        vm.reviewNotice?.let { n -> item(key = "notice") { Notice(n, Modifier.padding(horizontal = Gutter).padding(top = 16.dp)) } }
        item(key = "submit") {
            val isEditing = vm.session != null && vm.myReview != null
            KitButton(
                if (isEditing) "Update review" else "Post review", { vm.submitReview(rating, body) },
                Modifier.fillMaxWidth().padding(horizontal = Gutter).padding(top = 16.dp),
                busy = vm.reviewSubmitting,
            )
        }

        when (val state = vm.reviewsState) {
            Loadable.Loading -> item(key = "loading") { LoadingState() }
            is Loadable.Failed -> item(key = "failed") {
                EmptyState(KitIcons.CircleAlert, "Reviews unavailable", state.message, actionLabel = "Try again", onAction = { vm.loadReviews(reset = true) }, warning = true)
            }
            is Loadable.Ready -> {
                val items = vm.loadedReviews
                if (items.isEmpty()) {
                    item(key = "empty") { EmptyState(KitIcons.MessageSquareText, "No reviews yet", "Be the first to leave a review for the café.") }
                } else {
                    item(key = "hdr") { Column(Modifier.padding(horizontal = Gutter).padding(top = 28.dp)) { SectionHeader("Recent reviews") } }
                    groupItems(items, key = { it.id }) { review ->
                        Cell {
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Text(review.displayName, style = KitType.body.semibold, color = c.label, modifier = Modifier.weight(1f))
                                StarRow(rating = review.rating, size = 14.dp)
                            }
                            Text(review.body, style = KitType.subhead, color = c.label, modifier = Modifier.padding(top = 4.dp))
                            Text(LoyaltyFormat.formatDateTime(review.createdAt), style = KitType.footnote, color = c.label2, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                    if (items.size < vm.reviewsTotalCount) {
                        item(key = "more") {
                            Section {
                                ButtonRow(
                                    if (vm.reviewsLoadingMore) "Loading…" else "Load more reviews",
                                    { vm.loadReviews(reset = false) }, centered = true, enabled = !vm.reviewsLoadingMore,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
