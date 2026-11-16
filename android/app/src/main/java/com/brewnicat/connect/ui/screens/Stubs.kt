package com.brewnicat.connect.ui.screens

import androidx.compose.runtime.Composable
import com.brewnicat.connect.data.MenuItem
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.kit.Page

@Composable fun OrdersScreen(vm: AppViewModel) = Page("Orders") {}
@Composable fun AccountScreen(vm: AppViewModel) = Page("Account") {}
@Composable fun VisitScreen(vm: AppViewModel) = Page("Visit") {}
@Composable fun OrderScreen(vm: AppViewModel, reference: String) = Page("Order $reference", onBack = { vm.back() }) {}
@Composable fun ProfileScreen(vm: AppViewModel) = Page("Profile", onBack = { vm.back() }) {}
@Composable fun OrderHistoryScreen(vm: AppViewModel) = Page("Order history", onBack = { vm.back() }) {}
@Composable fun FavoritesScreen(vm: AppViewModel, onItem: (MenuItem) -> Unit) = Page("Favorites", onBack = { vm.back() }) {}
@Composable fun RewardsScreen(vm: AppViewModel) = Page("Rewards", onBack = { vm.back() }) {}
@Composable fun LoyaltyHistoryScreen(vm: AppViewModel) = Page("Points history", onBack = { vm.back() }) {}
@Composable fun ReviewsScreen(vm: AppViewModel) = Page("Shop reviews", onBack = { vm.back() }) {}
@Composable fun DataRequestScreen(vm: AppViewModel) = Page("Data requests", onBack = { vm.back() }) {}
