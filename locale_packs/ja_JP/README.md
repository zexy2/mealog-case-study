# Japanese locale-pack data notice

This is an `unverified` legacy pack, not a verified extract of a named food
composition table.

The pack originally declared [MEXT, Standard Tables of Food Composition in
Japan](https://www.mext.go.jp/a_menu/syokuhinseibun/index.htm) as its source.
Row-level review found exact four-field matches for only 2 of 8 rows in the 2015
tables; the other rows did not exactly match the checked 2015, 2020, or 2023
tables. Mealog therefore does not cite the pack as verified MEXT data.
Commercial mode rejects it. Production reuse requires replacement rows with a
traceable source edition, official record identifier, and reviewed reuse terms.

Project `food_id` values, English display labels, aliases, serving defaults,
density annotations, retrieval metadata, and confidence behavior are mealog
metadata, not official MEXT fields. See the repository-level
[third-party data notice](../../THIRD_PARTY_DATA.md) for the full boundary.
