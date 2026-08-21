# Golden set — source and retrieval protocol

This set does not contain home-cooked meals, cooking sessions or new weighing.
Each manifest row records label provenance separately from image provenance and
states what each truth axis can support.

## Label contract

`truth.items[]` contains catalogue `food_id` values and the evaluator's numeric
`grams` field. Every food ID and mass field carries a provenance string with
dataset, record ID and source field. `truth_axes.identity` and
`truth_axes.portion` carry the authoritative tier and source for each axis.

For identity-only datasets, `grams: 0` is an explicit non-scoring sentinel
required by the current offline harness. It is not a mass claim. Its
`grams_provenance` says that the source did not provide mass and that the value
must not be read as a measured or assumed portion. Those rows contribute real
identity labels; they do not contribute calorie truth.

## Tiers

| Tier | Source | What it supports here |
|---|---|---|
| 1 | [Nutrition5k](https://github.com/google-research-datasets/Nutrition5k) overhead RGB and dish metadata | Identity plus scale-weighed component mass for catalogue-covered items. Dataset is CC BY 4.0. |
| 1 | [Open Food Facts](https://world.openfoodfacts.org/product/0011110107176) product label | Product identity and printed per-100g nutrition. Product images are CC BY-SA; the API does not state a version. |
| 2 | Open Food Facts serving label | Printed serving used as a portion assumption, not observed eaten mass. |
| 1 | [TurkishFoods-15](https://huggingface.co/datasets/yunusserhat/TurkishFoods-15) | Class-label identity only. The dataset card declares Apache-2.0; original image terms are not separately stated. |
| 1 | [UEC-Food 256](http://foodcam.mobi/dataset256.html) | Class-label identity only. Official terms allow non-commercial research only. |
| 3 | TurkishFoods-15, UEC-Food 256 and the text consensus row | No source mass; portion axis remains seeded/non-scoring and is not a nutrition claim. |
| 1 | [Wikimedia Commons empty plate](https://commons.wikimedia.org/wiki/File:Empty_plate_with_fork.jpg) | Empty-plate negative control. CC BY 4.0, attribution required. |

Nutrition5k selected plates contain ingredients outside this repository's
24-food catalogue. The manifest records those source ingredients in
`unmapped_source_ingredients`, with their real source masses and provenance,
rather than silently dropping them. Only catalogue-covered components enter
`truth.items` and the closed-set evaluator.

`pkg_0001` uses the product's exact identity and per-100g label fields, but the
printed 170g serving is an assumption about portion. TurkishFoods-15 and
UEC-Food 256 provide class labels without mass; their identity axis is Tier 1
and portion axis Tier 3. No plausible gram figure is substituted.

## Fetching inputs

Images are intentionally absent from Git. Fetch them into the ignored local
directory with:

```bash
python scripts/fetch_golden_images.py
```

The script fetches every non-text sample, writes `data/golden-images/<sample_id>.*`,
and verifies `image_sha256` before atomically replacing each file. It supports
direct image URLs, the Hugging Face row API (which resolves a fresh signed image
URL at fetch time), and the official UEC ZIP through HTTP range requests. The
UEC archive is about 4.2 GB; the script downloads only its central directory and
the two selected members.

If a source changes bytes, fetching fails with the expected and received
SHA-256. Do not update the hash mechanically: confirm the replacement source,
licence and sample identity in a human-reviewed PR first. `tr_0003` is the text
lane and therefore has no image fields.

## Sample map

- `n5k_0001`: official Nutrition5k dish `dish_1563216440`; chicken breast and white rice map, nine other source ingredients are retained as unmapped.
- `n5k_0002`: official Nutrition5k dish `dish_1562862493`; scrambled eggs only.
- `pkg_0001`: Open Food Facts product `0011110107176`, front label image.
- `tr_0001`, `tr_0002`: TurkishFoods-15 train rows 18 and 12; class labels are kuru fasulye and simit.
- `tr_0003`: text lane with two-rater consensus identity labels.
- `jp_0001`: UEC category 1 (`rice`).
- `jp_0002`: UEC category 174 (`pork cutlet`).
- `trap_0001`: openly licensed empty plate.

Issue #57 replaces the seeded identity and measured labels without changing
provider fixtures, images or pipeline code. Issue #3 owns live provider calls
and fixture recording; do not add provider responses or images to this PR.
