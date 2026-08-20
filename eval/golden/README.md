# Golden set — source and retrieval protocol

This set does not contain home-cooked meals, cooking sessions or new weighing.
That decision is deliberate. Public sources support different claims, so each
sample records the strongest tier its source can honestly support.

## Tiers

| Tier | Source | What it supports here |
|---|---|---|
| 1 | [Nutrition5k](https://github.com/google-research-datasets/Nutrition5k) overhead RGB and dish metadata | Identity plus measured component mass for catalogue-covered items. Dataset is CC BY 4.0. |
| 1 | [Open Food Facts](https://world.openfoodfacts.org/product/0011110107176) package image and label | Product identity and the printed 170g serving. Product images are CC BY-SA; the API does not state a version. |
| 1 | [Wikimedia Commons empty plate](https://commons.wikimedia.org/wiki/File:Empty_plate_with_fork.jpg) | Empty-plate negative control. CC BY 4.0, attribution required. |
| 3 | [TurkishFoods-15](https://huggingface.co/datasets/yunusserhat/TurkishFoods-15) | Turkish dish identity only. The dataset card declares Apache-2.0; original image terms are not separately stated. Grams use stated TURKOMP serving assumptions, not weighing. |
| 3 | [UEC-Food 256](http://foodcam.mobi/dataset256.html) | Japanese dish identity and decomposition only. Official terms allow non-commercial research only. Grams are serving assumptions, not weighing. |

Nutrition5k is the only source in this set with mass ground truth. Its selected
plates contain ingredients outside this repository's 24-food catalogue; the
manifest records only the catalogue-covered components rather than pretending
the closed set covers every source ingredient. Tier 3 `truth.items[].grams`
values are explicit assumptions retained for the existing evaluator; they are
not evidence of weighed mass or kcal accuracy.

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

If a source changes bytes, fetching fails with the expected and received SHA-256.
Do not update the hash mechanically: confirm the replacement source, licence and
sample identity in a human-reviewed PR first. `tr_0003` is the text lane and
therefore has no image fields.

## Sample map

- `n5k_0001`, `n5k_0002`: official Nutrition5k overhead RGB members.
- `pkg_0001`: Open Food Facts product `0011110107176`, front label image.
- `tr_0001`, `tr_0002`: TurkishFoods-15 train rows labelled kuru fasulye and simit.
- `jp_0001`: one UEC image shared by rice, miso soup and grilled salmon classes.
- `jp_0002`: UEC pork-cutlet class member.
- `trap_0001`: openly licensed empty plate.

This issue supplies inputs only. Issue #3 owns live provider calls and fixture
recording; do not add provider responses or images to this PR.
