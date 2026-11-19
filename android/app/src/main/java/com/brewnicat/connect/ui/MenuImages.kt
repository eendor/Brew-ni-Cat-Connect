package com.brewnicat.connect.ui

import androidx.annotation.DrawableRes
import com.brewnicat.connect.R

/* The same photo lookup as src/config/menu-item-images.ts, with the photos bundled. */
object MenuImages {
    private val byName: Map<String, Int> = buildMap {
        listOf("takoyaki", "pawsome balls").forEach { put(it, R.drawable.menu_takoyaki_pawsome_balls) }
        put("buldak carbo", R.drawable.menu_buldak_carbo)
        put("buldak cheese", R.drawable.menu_buldak_cheese)
        put("cat-feine", R.drawable.menu_cat_feine_iced_latte)
        listOf("matcha", "the lucky green neko", "lucky green neko").forEach { put(it, R.drawable.menu_lucky_green_neko_matcha) }
        listOf("oreo", "the tuxedo cat", "tuxedo cat").forEach { put(it, R.drawable.menu_vanilla_oreo_whisker) }
        listOf("soda", "fizzy felines").forEach { put(it, R.drawable.menu_blueberry_bite_soda) }
    }

    private val byFlavor: Map<String, Int> = buildMap {
        val matcha = listOf("matcha", "the lucky green neko", "lucky green neko")
        matcha.forEach {
            put("$it|dirty neko", R.drawable.menu_dirty_neko_matcha)
            put("$it|vanilla matcha meow", R.drawable.menu_vanilla_matcha_meow)
            put("$it|caramel matcha tail", R.drawable.menu_caramel_matcha_tail)
        }
        listOf("oreo", "the tuxedo cat", "tuxedo cat").forEach {
            put("$it|vanilla oreo whisker", R.drawable.menu_vanilla_oreo_whisker)
            put("$it|caramel oreo kitten", R.drawable.menu_caramel_oreo_kitten)
        }
        listOf("cat-feine", "classic coffee").forEach { put("$it|siamese latte", R.drawable.menu_siamese_latte) }
        listOf("soda", "fizzy felines").forEach {
            put("$it|blueberry bite", R.drawable.menu_blueberry_bite_soda)
            put("$it|passion fruit purr", R.drawable.menu_passion_fruit_purr_soda)
        }
    }

    private fun normalize(value: String) = value.trim().lowercase().replace(Regex("\\s+"), " ")

    private fun candidates(itemName: String): List<String> {
        val base = normalize(itemName.replace(Regex("\\([^)]*\\)"), " "))
        val nicknames = Regex("\\(([^)]*)\\)").findAll(itemName).map { normalize(it.groupValues[1]) }
        return (listOf(base) + nicknames).filter { it.isNotEmpty() }
    }

    @DrawableRes
    fun forItem(itemName: String, flavor: String? = null): Int? {
        val key = flavor?.let { normalize(it) }.orEmpty()
        if (key.isNotEmpty()) candidates(itemName).firstNotNullOfOrNull { byFlavor["$it|$key"] }?.let { return it }
        return candidates(itemName).firstNotNullOfOrNull { byName[it] }
    }
}
