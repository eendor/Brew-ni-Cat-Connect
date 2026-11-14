package com.brewnicat.connect.data

import org.json.JSONArray

/** A small menu shaped like the live Supabase rows. */
object Fixtures {
    val categories = JSONArray(
        """[{"id":"c-noodles","name":"Buldak & Sedaap"},{"id":"c-bites","name":"Cat-Tastic Bites"},
            {"id":"c-treats","name":"Cat Treats"},{"id":"c-box","name":"Take-out Box"}]""",
    )
    val items = JSONArray(
        """[
          {"id":"i-carbo","category_id":"c-noodles","name":"Buldak Carbo","flavors":null,"is_available":true,
           "variants_json":[{"id":"v-plain","name":"Plain","basePrice":119},{"id":"v-egg","name":"With Egg","basePrice":"134"}]},
          {"id":"i-sedaap","category_id":"c-noodles","name":"Sedaap Spicy Chicken","flavors":"1 Paw (Mild)|2 Paws (Medium)|2 Paws (Medium)","is_available":true,
           "variants_json":"[{\"name\":\"Regular\",\"basePrice\":69,\"priceByFlavor\":{\"2 Paws (Medium)\":74}}]"},
          {"id":"i-fries","category_id":"c-bites","name":"Fries (Cat Claws)","flavors":"Cheese|Sour Cream|BBQ","is_available":true,
           "variants_json":[{"id":"v-reg","name":"Regular","basePrice":0,"priceByFlavor":{"Cheese":30,"Sour Cream":35,"BBQ":30}}]},
          {"id":"i-off","category_id":"c-bites","name":"Takoyaki","flavors":null,"is_available":false,
           "variants_json":[{"id":"v-6","name":"6 pcs","basePrice":79}]},
          {"id":"i-unknown","category_id":"c-bites","name":"Mystery","flavors":null,"is_available":null,
           "variants_json":[{"id":"v-1","name":"Regular","basePrice":50}]},
          {"id":"i-treat","category_id":"c-treats","name":"Tuna Treat","flavors":null,"is_available":true,
           "variants_json":[{"id":"v-1","name":"Regular","basePrice":25}]},
          {"id":"i-box","category_id":"c-box","name":"Take-out Box","flavors":null,"is_available":true,
           "variants_json":[{"id":"v-1","name":"Regular","basePrice":5}]},
          {"id":"i-broken","category_id":"c-bites","name":"   ","flavors":null,"is_available":true,"variants_json":[]}
        ]""",
    )
    val addOns = JSONArray(
        """[{"id":"a-egg","category_id":"c-noodles","label":"Egg (Boiled)","price":15,"sort_order":2},
            {"id":"a-sea","category_id":"c-noodles","label":"3pcs Seaweed","price":25,"sort_order":1},
            {"id":"a-bad","category_id":"c-noodles","label":"Free?","price":-1,"sort_order":3}]""",
    )

    val catalog: MenuCatalog get() = MenuMapper.map(categories, items, addOns)
    val fullCatalog: MenuCatalog get() = MenuMapper.mapAll(categories, items, addOns)
}
