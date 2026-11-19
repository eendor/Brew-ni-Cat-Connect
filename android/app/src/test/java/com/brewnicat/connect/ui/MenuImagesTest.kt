package com.brewnicat.connect.ui

import com.brewnicat.connect.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MenuImagesTest {
    @Test
    fun mapsTheNewDrinkPhotos() {
        assertEquals(R.drawable.menu_blueberry_bite_soda, MenuImages.forItem("Soda (Fizzy Felines)"))
        assertEquals(R.drawable.menu_blueberry_bite_soda, MenuImages.forItem("Soda (Fizzy Felines)", "Blueberry Bite"))
        assertEquals(R.drawable.menu_passion_fruit_purr_soda, MenuImages.forItem("Soda (Fizzy Felines)", "Passion Fruit Purr"))
        assertEquals(R.drawable.menu_caramel_oreo_kitten, MenuImages.forItem("Oreo (The Tuxedo Cat)", "Caramel Oreo Kitten"))
        assertEquals(R.drawable.menu_siamese_latte, MenuImages.forItem("Cat-Feine (Classic Coffee)", "  siamese  latte "))
    }

    @Test
    fun fallsBackToTheItemPhotoForOtherFlavors() {
        assertEquals(R.drawable.menu_blueberry_bite_soda, MenuImages.forItem("Soda (Fizzy Felines)", "Grumpy Grapes"))
        assertEquals(R.drawable.menu_cat_feine_iced_latte, MenuImages.forItem("Cat-Feine (Classic Coffee)", "Hazelnut Hairball"))
        assertNull(MenuImages.forItem("Fries (Cat Claws)"))
    }
}
