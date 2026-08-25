# Third-party data notice

This repository is a noncommercial case-study and information-sharing project.
This notice records source, attribution, and reuse boundaries for nutrition data.
It does not grant a software licence or relicense third-party material.

## Turkish locale pack: TürKomp

Files covered:

- `locale_packs/tr/foods.jsonl`
- project metadata that refers to those rows in `locale_packs/tr/`

Required attribution:

> TürKomp, Ulusal Gıda Kompozisyon Veri Tabanı, versiyon 1.0,
> <https://turkomp.tarimorman.gov.tr/>

Official conditions: [TürKomp data-use conditions](https://turkomp.tarimorman.gov.tr/useofdata).

The Turkish pack is marked `restricted-noncommercial`. The official conditions
allow conditioned noncommercial information sharing and require visible source
attribution for written use plus a clickable source link for internet use.
Commercial use in software or on a website requires a separate agreement with
the authorised institution. This repository does not grant that permission.

The pack contains 57 selected rows. Nutrient values identify TürKomp as their
source. Project `food_id` values, transliterated/display labels, aliases, serving
defaults, density annotations, retrieval metadata, and confidence behavior are
mealog additions; they are not represented as official TürKomp fields. Consult
the official source rather than treating this subset as a complete or current
copy of the database.

## Japanese locale pack: unverified legacy data

Files covered:

- `locale_packs/ja_JP/foods.jsonl`
- project metadata that refers to those rows in `locale_packs/ja_JP/`

The pack originally declared [MEXT, Standard Tables of Food Composition in
Japan](https://www.mext.go.jp/a_menu/syokuhinseibun/index.htm) as its source.
Row-level review did not establish that provenance for the pack as a whole:
only 2 of 8 rows exactly matched the four checked nutrient fields in the 2015
tables, while the remaining rows did not exactly match the checked 2015, 2020,
or 2023 tables. The repository therefore does **not** present this pack as
verified MEXT data.

The pack remains marked `unverified` and is rejected in mealog commercial mode.
Its rows are retained only as legacy, non-production evaluation material until
each value has a traceable source edition and record identifier.

## US locale pack: USDA FoodData Central

Files covered:

- `locale_packs/en_US/foods.jsonl`
- project metadata that refers to those rows in `locale_packs/en_US/`

Source: [USDA FoodData Central](https://fdc.nal.usda.gov/).

The pack metadata records this source as `public-domain`. Project-specific IDs,
aliases, serving defaults, and retrieval metadata remain mealog additions.

## Repository code

This notice covers third-party nutrition data only. No root open-source licence
is granted by this file. Default copyright rules apply to repository code unless
a file states otherwise. GitHub platform permissions, including viewing and
forking a public repository, remain governed by GitHub's terms.
