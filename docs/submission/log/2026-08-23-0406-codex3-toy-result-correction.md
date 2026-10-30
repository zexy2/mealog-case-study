# Correction — toy-food result stability

The earlier adversarial report described OYUNCAK YEMEK.png as stable
tr.lahmacun across three repeats. That statement was only true within one
successful provider session. It is not evidence of cross-run or cross-operator
stability.

On the fresh rerun requested after that report:

- Demo mode was not used.
- A new Node Gemini service ran on port 3111.
- Three fresh multipart requests all returned HTTP 503.
- A detail request returned category=provider_unavailable,
  retry_attempted=true, attempts=4.
- No food_id, grams, p10-p90, kcal, or Day record was produced.
- A second properly matched mobile-format upload on a fresh Node service at
  port 3112 used filename meal.jpg, MIME image/png, locale=tr, config=V3, and
  a new idempotency key. It also returned HTTP 503 with the same typed error;
  client routing is Add and Day record creation is false.

The operator reports a separate successful run that returned a food other than
lahmacun. That observation means the earlier tr.lahmacun result must be treated
as session-local and the cross-run outcome as unresolved/unstable. The cause
could be provider/model nondeterminism or a request-environment difference; this
run does not distinguish those causes. No source, prompt, threshold, alias,
fixture, evaluator, or baseline was changed.

Traps: Do not report toy-food -> tr.lahmacun as a reproducible result. Do not
replace the failed live rerun with fixture or demo output. A provider 503 is not
an abstention classification.
