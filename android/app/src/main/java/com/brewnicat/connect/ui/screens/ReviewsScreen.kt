package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.brewnicat.connect.data.LoyaltyFormat
import com.brewnicat.connect.data.ReviewValidation
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.theme.Brand
import java.util.Locale

@Composable
fun ReviewsScreen(vm: AppViewModel) {
    var rating by remember(vm.myReview?.id) { mutableIntStateOf(vm.myReview?.rating ?: 0) }
    var body by remember(vm.myReview?.id) { mutableStateOf(vm.myReview?.body.orEmpty()) }

    LaunchedEffect(vm.session?.userId) { vm.loadReviews(reset = true) }
    LaunchedEffect(vm.myReview?.id, vm.myReview?.updatedAt) {
        vm.myReview?.let {
            rating = it.rating
            body = it.body
        }
    }

    Column(Modifier.fillMaxSize()) {
        TopBar("Shop reviews", { vm.back() })

        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item("summary") {
                Card(Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Customer rating", style = MaterialTheme.typography.titleMedium, color = Brand.colors.ink)
                            Text(
                                "${vm.reviewsTotalCount} review${if (vm.reviewsTotalCount == 1) "" else "s"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Brand.colors.muted,
                            )
                        }
                        if (vm.reviewsTotalCount > 0) {
                            Text(
                                String.format(Locale.US, "%.1f ★", vm.reviewsAverage),
                                style = MaterialTheme.typography.headlineSmall,
                                color = Brand.colors.accent,
                            )
                        }
                    }
                }
            }

            item("composer") {
                val isEditing = vm.session != null && vm.myReview != null
                Card(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            if (isEditing) "Edit your review" else "Write a review",
                            style = MaterialTheme.typography.titleMedium,
                            color = Brand.colors.ink,
                        )
                        Text(
                            if (vm.session != null) {
                                val first = vm.profile?.fullName?.trim()?.split(Regex("\\s+"))?.firstOrNull()?.takeIf { it.isNotEmpty() } ?: "Customer"
                                "Posting with your first name: $first"
                            } else {
                                "Posting as Guest. Sign in on the Account tab if you want to edit your review later."
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = Brand.colors.muted,
                        )
                        StarRow(rating = rating, size = 28.dp, onSelect = { rating = it })
                        OutlinedTextField(
                            value = body,
                            onValueChange = { if (it.length <= ReviewValidation.MAX_LENGTH) body = it },
                            label = { Text("Your experience at Brew ni Cat") },
                            minLines = 3,
                            supportingText = { Text("${ReviewValidation.MAX_LENGTH - body.length} characters left") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        vm.reviewError?.let { Notice(it) }
                        vm.reviewNotice?.let { Notice(it, warning = false) }
                        PrimaryButton(
                            text = if (isEditing) "Update review" else "Post review",
                            onClick = { vm.submitReview(rating, body) },
                            busy = vm.reviewSubmitting,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            when (val state = vm.reviewsState) {
                Loadable.Loading -> item("loading") { LoadingState() }
                is Loadable.Failed -> item("err") {
                    MessageState("😿", "Reviews unavailable", state.message, action = "Try again") { vm.loadReviews(reset = true) }
                }
                is Loadable.Ready -> {
                    val items = vm.loadedReviews
                    if (items.isEmpty()) {
                        item("empty") {
                            MessageState("🐾", "No reviews yet", "Be the first to leave a review for the café.")
                        }
                    } else {
                        item("hdr") { SectionTitle("Recent reviews", Modifier.padding(top = 4.dp)) }
                        items(items, key = { it.id }) { review ->
                            Card(Modifier.fillMaxWidth()) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                        Text(review.displayName, style = MaterialTheme.typography.titleSmall, color = Brand.colors.ink, modifier = Modifier.weight(1f))
                                        StarRow(rating = review.rating, size = 16.dp)
                                    }
                                    Text(review.body, style = MaterialTheme.typography.bodyMedium, color = Brand.colors.ink)
                                    Text(LoyaltyFormat.formatDateTime(review.createdAt), style = MaterialTheme.typography.bodySmall, color = Brand.colors.muted)
                                }
                            }
                        }
                        if (items.size < vm.reviewsTotalCount) {
                            item("more") {
                                TextButton(
                                    onClick = { vm.loadReviews(reset = false) },
                                    enabled = !vm.reviewsLoadingMore,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text(
                                        if (vm.reviewsLoadingMore) "Loading…" else "Load more reviews",
                                        color = Brand.colors.accent,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
