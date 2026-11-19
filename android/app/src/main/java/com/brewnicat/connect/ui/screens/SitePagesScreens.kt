package com.brewnicat.connect.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.brewnicat.connect.data.SitePages
import com.brewnicat.connect.data.SitePhoto
import com.brewnicat.connect.ui.AppViewModel
import com.brewnicat.connect.ui.Loadable
import com.brewnicat.connect.ui.Screen
import com.brewnicat.connect.ui.SitePhotoImage
import com.brewnicat.connect.ui.kit.ButtonSize
import com.brewnicat.connect.ui.kit.ButtonStyle
import com.brewnicat.connect.ui.kit.EmptyState
import com.brewnicat.connect.ui.kit.GlassIconButton
import com.brewnicat.connect.ui.kit.Gutter
import com.brewnicat.connect.ui.kit.IconTile
import com.brewnicat.connect.ui.kit.Kit
import com.brewnicat.connect.ui.kit.KitButton
import com.brewnicat.connect.ui.kit.KitIcons
import com.brewnicat.connect.ui.kit.KitType
import com.brewnicat.connect.ui.kit.ListRow
import com.brewnicat.connect.ui.kit.LoadingState
import com.brewnicat.connect.ui.kit.Page
import com.brewnicat.connect.ui.kit.Section
import com.brewnicat.connect.ui.kit.SectionHeader
import com.brewnicat.connect.ui.kit.Text
import com.brewnicat.connect.ui.kit.pressable
import com.brewnicat.connect.ui.kit.semibold

/** Loads the pages once and shows loading or a retry until they arrive. */
private fun androidx.compose.foundation.lazy.LazyListScope.sitePagesState(
    vm: AppViewModel,
    ready: androidx.compose.foundation.lazy.LazyListScope.(SitePages) -> Unit,
) {
    when (val state = vm.sitePages) {
        is Loadable.Ready -> ready(state.value)
        is Loadable.Failed -> item(key = "failed") {
            EmptyState(KitIcons.CircleAlert, "Page unavailable", state.message, actionLabel = "Try again", onAction = { vm.loadSitePages() }, warning = true)
        }
        Loadable.Loading -> item(key = "loading") { LoadingState(Modifier.padding(top = 24.dp)) }
    }
}

@Composable
fun AboutScreen(vm: AppViewModel) {
    val c = Kit.colors
    LaunchedEffect(Unit) { vm.loadSitePages() }
    Page("About", onBack = { vm.back() }) {
        sitePagesState(vm) { pages ->
            val about = pages.about
            if (about == null) {
                item(key = "empty") { EmptyState(KitIcons.Info, "Nothing here yet", "The shop hasn't written its About page yet.") }
                return@sitePagesState
            }
            item(key = "hero") {
                Column(Modifier.padding(horizontal = Gutter).padding(top = 8.dp)) {
                    about.photos.firstOrNull()?.let { photo ->
                        SitePhotoImage(photo.path, photo.alt, Modifier.fillMaxWidth().aspectRatio(16f / 10f).clip(RoundedCornerShape(24.dp)), width = 1080)
                    }
                    if (about.heroTitle.isNotEmpty()) {
                        Text(about.heroTitle, style = KitType.title2, color = c.label, modifier = Modifier.padding(top = 16.dp))
                    }
                    if (about.heroText.isNotEmpty()) {
                        Text(about.heroText, style = KitType.body, color = c.label2, modifier = Modifier.padding(top = 6.dp))
                    }
                    about.openedOn?.let { date ->
                        Box(
                            Modifier.padding(top = 12.dp).clip(RoundedCornerShape(50)).background(c.tint.copy(alpha = 0.14f))
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        ) { Text("Open since $date", style = KitType.footnote.semibold, color = c.tint) }
                    }
                }
            }
            if (about.intro.isNotEmpty()) {
                item(key = "intro") {
                    Text(about.intro, style = KitType.body, color = c.label, modifier = Modifier.padding(horizontal = Gutter).padding(top = 20.dp))
                }
            }
            if (about.story.isNotEmpty()) {
                item(key = "story") {
                    Column(Modifier.padding(horizontal = Gutter).padding(top = 24.dp)) {
                        SectionHeader(about.storyTitle.ifEmpty { "Our story" }, prominent = true)
                        about.story.forEach { p ->
                            Text(p, style = KitType.body, color = c.label2, modifier = Modifier.padding(top = 8.dp))
                        }
                    }
                }
            }
            val more = about.photos.drop(1)
            if (more.isNotEmpty()) {
                item(key = "photos") {
                    LazyRow(
                        Modifier.padding(top = 18.dp),
                        contentPadding = PaddingValues(horizontal = Gutter),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        itemsIndexed(more, key = { _, p -> p.path }) { _, photo ->
                            SitePhotoImage(photo.path, photo.alt, Modifier.width(220.dp).aspectRatio(4f / 3f).clip(RoundedCornerShape(20.dp)))
                        }
                    }
                }
            }
            if (about.catRules.isNotEmpty()) {
                item(key = "rules") {
                    Section(header = "Cat café house rules") {
                        about.catRules.forEach { rule ->
                            ListRow(rule.title, subtitle = rule.text, leading = { IconTile(KitIcons.PawPrint, c.orange) })
                        }
                    }
                }
            }
            item(key = "menu") {
                Column(Modifier.padding(horizontal = Gutter).padding(top = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (about.menuSummary.isNotEmpty()) Text(about.menuSummary, style = KitType.body, color = c.label2)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        KitButton("See the menu", { vm.showMenu() }, size = ButtonSize.Medium)
                        KitButton("Gallery", { vm.open(Screen.Gallery) }, style = ButtonStyle.Gray, size = ButtonSize.Medium)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun GalleryScreen(vm: AppViewModel) {
    val c = Kit.colors
    LaunchedEffect(Unit) { vm.loadSitePages() }
    var viewing by remember { mutableStateOf<Int?>(null) }
    val photos = (vm.sitePages as? Loadable.Ready)?.value?.gallery?.photos.orEmpty()

    Page("Gallery", onBack = { vm.back() }) {
        sitePagesState(vm) { pages ->
            val list = pages.gallery?.photos.orEmpty()
            if (list.isEmpty()) {
                item(key = "empty") { EmptyState(KitIcons.Heart, "No photos yet", "The shop hasn't added gallery photos yet.") }
                return@sitePagesState
            }
            item(key = "intro") {
                Text(
                    "Café cats, food, the space and moments with our customers.",
                    style = KitType.subhead, color = c.label2,
                    modifier = Modifier.padding(horizontal = Gutter + 4.dp).padding(bottom = 12.dp),
                )
            }
            list.withIndex().chunked(2).forEachIndexed { rowIndex, row ->
                item(key = "row-$rowIndex") {
                    Row(
                        Modifier.padding(horizontal = Gutter).padding(bottom = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        row.forEach { (index, photo) ->
                            SitePhotoImage(
                                photo.path, photo.alt,
                                Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(18.dp))
                                    .pressable(onClick = { viewing = index }, role = Role.Image),
                                width = 384,
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }

    viewing?.let { start -> PhotoViewer(photos, start) { viewing = null } }
}

/** Full-screen photos, swiped left and right, with each photo's description. */
@Composable
private fun PhotoViewer(photos: List<SitePhoto>, start: Int, onClose: () -> Unit) {
    if (photos.isEmpty()) return
    val pager = rememberPagerState(initialPage = start.coerceIn(0, photos.lastIndex)) { photos.size }
    val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            HorizontalPager(pager, Modifier.fillMaxSize()) { page ->
                val photo = photos[page]
                Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center) {
                    SitePhotoImage(photo.path, photo.alt, Modifier.fillMaxWidth().aspectRatio(1f), width = 1080)
                    if (photo.alt.isNotEmpty()) {
                        Text(
                            photo.alt, style = KitType.subhead, color = Color.White.copy(alpha = 0.85f), textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                        )
                    }
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(top = top + 8.dp, start = 16.dp, end = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("${pager.currentPage + 1} of ${photos.size}", style = KitType.subhead.semibold, color = Color.White, modifier = Modifier.weight(1f))
                GlassIconButton(KitIcons.X, "Close", onClose)
            }
            Spacer(Modifier.align(Alignment.BottomCenter).height(bottom))
        }
    }
}
