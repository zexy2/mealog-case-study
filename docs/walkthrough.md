# Video walkthrough script — Node/TypeScript submission

Target runtime: **8:00**. This is a timed script, not a recording. Rehearse and
re-check every evidence anchor against the recording commit immediately before
the take. A sentence marked `PENDING` is not evidence until that check has
passed; do not silently turn it into a claim.

The walkthrough shows the Node/TypeScript edge and the Expo client. The Python
path appears only as the offline evaluation harness. This is a decision-led
walkthrough: enter a file only to support one boundary, never as a
folder-by-folder code tour.

## Run of show

| Time | Beat | Recording condition |
|---|---|---|
| 0:00–0:40 | Problem, scope, and assumptions | Title card and app shell |
| 0:40–2:20 | Capture, loading, result, portion band, auditability, and routing | Current Node endpoint or deterministic fixture fallback |
| 2:20–2:50 | Live out-of-catalogue abstention | **Required**; use the labelled fixture fallback only if the live shot cannot run |
| 2:50–4:00 | One architecture diagram and the server-action routing table | Node/Nest boundary on screen |
| 4:00–5:20 | The model mistake that changed the design; closed-set nutrition and worst-cuisine measurement | D1/D3 and one short code boundary |
| 5:20–6:15 | Offline scorecard, ablation, retrieval, and regression guard | Scorecard SHA `bfb1703b…` |
| 6:15–6:50 | Security and privacy | Request boundary and CI guard |
| 6:50–7:30 | Limitations, exact calorie denominator, and the open photo-count defect | `n=80` scorecard plus #218 status |
| 7:30–8:00 | Error/empty states and next steps | Close on the honest state, not a success animation |

## Recording rules

- Every metric is spoken with its denominator or sample count in the same
  sentence. Do not round a figure up or substitute a historical number.
- The only live-provider evidence named here is the verified 2026-08-23 run on
  `acfa6dd`: 8/8 text scenarios passed and `C7.jpg` returned exactly one
  `tr.ayran`. This is not broad live accuracy and it does not prove visual
  counting of every image.
- Do not show an API key, a personal photograph, a raw provider envelope, or a
  personal identifier. If the device path fails, use the deterministic fixture
  recording and say **fixture / demo path** on screen.
- The abstention at 2:20–2:50 is mandatory. It is the strongest proof that the
  system knows when not to guess.
- Do not say “production ready”. Do not narrate the multi-agent process.

## Script

### 0:00–0:40 — The problem, the scope, the assumptions

**Picture:** Title card, then the mobile capture surface.

**Say:**

> A meal photo is an uncertain observation, but a nutrition log has to be a
> decision someone can inspect. Mealog identifies a catalogue food, shows a
> portion band, and calculates nutrition from the chosen catalogue row.
>
> The delivered runtime is Node and TypeScript behind a NestJS HTTP edge, with
> an Expo client. Python remains the offline evaluator, so measurements replay
> without a provider key. When the catalogue cannot support an identity, the
> correct result is an abstention, not a plausible guess.

**On-screen proof:** the app shell and the Node entrypoint. Do not open a file
tree or read a scorecard in this opening.

### 0:40–2:20 — Capture, loading, result, and auditability

**Picture:** Choose a photo or enter a meal description, then show the loading
state, the result, and the expanded **“Nasıl bulundu?”** panel.

**Say:**

> I start with the deterministic demo path so the recording does not depend on
> a live key. The same boundary accepts a camera photo, a library photo, or
> text. The loading copy says **“Fotoğrafın işleniyor; öğünün için kanıt
> oluşturuluyor.”** and names the stages: **“Tabak okunuyor”, “Katalogda
> eşleşme aranıyor”, “Porsiyon tahmin ediliyor.”**
>
> The server response decides the next screen. The client never guesses from
> the local prompt. `auto_accept` goes to **Gün**, highlights the record, and
> offers one-tap undo. `review` goes to **Kontrol et** with nothing written;
> if there is a question, it is visible — **“Kaç adet?”**. The server's `ask`
> action is the abstention surface: it shows the observation and next choices
> without creating a record. Degraded stays in Review with a warning and never
> auto-accepts. A `503` is an error-with-retry state, not a meal result; its
> exact mobile copy remains `PENDING` until the client-to-Node rehearsal.
>
> Review shows a band, never a single asserted mass: **“yaklaşık [gram] g
> ([alt]–[üst] g)”**. The **“Nasıl bulundu?”** panel is open and shows the
> `food_id`, catalogue source, confidence, portion source, provenance, and
> p10–p90 evidence.

The current live evidence available for the recording commit is bounded: on
2026-08-23 at `acfa6dd`, 8/8 text scenarios passed and `C7.jpg` returned exactly
one `tr.ayran`. If a fresh device rehearsal has not verified this exact screen
against the current Node endpoint, mark the shot `PENDING` and use the fixture
recording with that label rather than claiming a live device result.

**On-screen proof:** loading copy, one result with its portion band, the open
audit panel, and the action transition. Do not show raw JSON.

### 2:20–2:50 — A catalogue miss, live

**Picture:** Submit one out-of-catalogue image to the running Node path and stop
on the abstention screen.

**Say:**

> This food is outside the catalogue. The system says **“GÜVENLİ EŞLEŞME YOK”**
> and **“Katalogda yeterli kanıt yok. Yakın bir tahmin seçmek yerine senden
> yardım istiyoruz.”** It shows the observation but assigns no food ID, grams, or
> calories. The next action is explicit: type the food or retake the photo. No
> record is created.
>
> This is not an empty result. It is deliberate `ABSTAIN`: the boundary is
> visible, the user has a next step, and a nearest neighbour is not truth.

`PENDING — before recording, verify that this exact out-of-catalogue input
reaches the current Node service and lands on this screen. This thirty-second
live abstention is mandatory. If the live shot cannot run, use the recorded
fixture state, label it **fixture / demo path**, and do not call it live.`

**On-screen proof:** `ABSTAIN · TAHMİN YOK`, the observed text, no accepted food
ID, and the type-or-retake next action. Keep this segment; do not replace it with
another success case.

### 2:50–4:00 — One architecture, and why the route is server-owned

**Picture:** One diagram, then the two boundaries that make the diagram true.

```text
Expo capture or text
        -> POST /v1/meals
        -> NestJS edge
        -> VisionPort (fixture replay or provider)
        -> normalize -> retrieval -> resolve -> portion -> nutrition
        -> MealLog { action, degraded, items, totals }
        -> Day / Review / Add
```

**Say:**

> The edge is thin. It validates the request, applies user-scoped idempotency,
> and delegates to a framework-free pipeline. The provider is a port, so the
> runner can use a recorded fixture without booting HTTP. The pipeline
> normalizes observations, retrieves candidates, resolves to a catalogue ID or
> `ABSTAIN`, estimates a p10–p90 band, and computes nutrients deterministically.
>
> One contract controls the experience: `action` and `degraded` come from the
> server. A fallback-backed answer is review, never acceptance. A provider
> error is retry, not a saved record. The client does not infer success from a
> local string, confidence, or screen transition.

**On-screen proof:** the diagram, `POST /v1/meals`, and the VisionPort boundary.
Show only enough of each file to support the boundary. Do not scroll through
directories.

### 4:00–5:20 — The wrong model answer, and the two design decisions

**Picture:** D1 and D3, then the nutrition boundary.

**Say:**

> Here is the moment the model was wrong. An early vision response supplied a
> plausible calorie number without a catalogue food or measured portion. We
> caught it because it had no inspectable source: the evaluator could not tie it
> to a closed-set identity or reproduce the arithmetic. That was the wrong
> contract, not a number to polish.
>
> Now the model observes food surfaces only. Retrieval and resolution choose a
> catalogue `food_id` or return `ABSTAIN`; only nutrition produces a number from
> catalogue data and grams. That is the first decision.
>
> The second is how to read accuracy. A mean can hide the failing cuisine, so
> the headline is the worst bucket with coverage beside it. Abstention is not a
> zero-calorie answer: it costs coverage, but avoids invented identity and
> nutrition.

**On-screen proof:** D1 and D3, the closed-set resolver, and the pure nutrition
boundary. Do not show a made-up provider response or a folder tour.

### 5:20–6:15 — Evaluation, ablation, and the regression guard

**Picture:** The scorecard, retrieval table, and CI regression check. Keep the
scorecard hash visible: `bfb1703b…`.

**Say:**

> The current scorecard covers **15%: 12/80** samples. Item F1 is **0.15**, FP
> is **86.0%**, and calorie MAPE is **12.7%**. I will state its exact denominator
> again in the limitations segment; this is not broad live accuracy.
>
> The ablation makes the trade-off visible: V0 ungated is **100% coverage at
> 100% MAPE**; V3 is **15% coverage at 12.7% MAPE**. V3 answers less often
> because it refuses unsupported identities.
>
> Retrieval is a separate guard: across **145 variants**, Recall@1 is **100%**
> and MRR is **1.000**; across **22 negative probes**, there are zero wrong
> accepts. On **10 out-of-catalogue images**, there are **10 correct
> abstentions** and zero false accepts. CI compares buckets, not just an
> aggregate, before a change can merge.

**On-screen proof:** scorecard SHA, the V0/V3 rows, the retrieval rows, the
out-of-catalogue result summary, and the green regression check. If local output
is unavailable, use a captured CI view; do not invent a new measurement during
the recording.

### 6:15–6:50 — Security and privacy

**Picture:** The HTTP boundary and the CI secret guard.

**Say:**

> The photo is handled as a bounded request. The edge checks the declared type
> and the bytes themselves before transport. The request bytes live only for
> the provider call; the adapter releases its strong reference afterward. The
> application does not persist the photograph, and a fixture stores observations,
> not the image or raw provider envelope.
>
> The provider key stays in server configuration and never appears in the
> repository or recording. Idempotency is user-scoped, but its optional header
> is not authentication. Health is liveness, not downstream-provider health.

**On-screen proof:** request validation, configuration boundary, and secret-scan
CI result. Never show credentials, a user photo, or a user identifier.

### 6:50–7:30 — Limitations, with the denominator spoken aloud

**Picture:** The scorecard and the two-simit evidence note.

**Say:**

> The scorecard has **n=80** samples, but the calorie MAPE denominator is **TWO
> scorable rows**, not 80: **12.7% over 2 scorable rows**. The other rows do not
> provide trustworthy calorie truth, so they are not zero-calorie errors.
> Coverage is **15%: 12/80**: selective answers and a very small calorie
> denominator.
>
> **Still open:** the two-simit photo currently returns one `tr.simit` at 329
> kcal in 3/3 runs — a 50% undercount. It is being fixed under #218; this script
> does not call that fix done.
>
> **Conditional — only if #218 has merged and the same live check has been
> re-run before recording:** replace the previous sentence with “The two-simit
> photo count fix is merged and verified; the prior 3/3 one-simit, 329 kcal,
> 50% undercount is the defect the re-run closed.”

The two #218 sentences are deliberately adjacent. The second is conditional,
not current evidence; if its merge and re-run are absent, keep the **Still open**
sentence.

**On-screen proof:** scorecard with `n=80` and `2 scorable rows`, then the
two-simit evidence. Do not hide the denominator in a footnote.

### 7:30–8:00 — Error, empty, and what comes next

**Picture:** The error-with-retry state, then an empty Day state, then the
abstention screen as the closing frame.

**Say:**

> The last two states are also part of the product, not polish. A provider
> failure says **“Bir sorun çıktı.”**, keeps the draft safe, and offers **“Tekrar
> dene”**. A `503` is not a first-class answer: **PENDING — after the current
> client-to-Node rehearsal verifies the boundary, show “Sağlayıcıya
> ulaşılamadı”, create no record, and return to Add.** An empty day says
> **“Henüz bir öğün yok.”** and gives one next action.
>
> Next, re-verify #218 if it has landed, record this eight-minute run from the
> current commit, and send the submission with the scorecard hash and
> denominators. End on the abstention: useful because it shows evidence, safe
> because it can say no.

**On-screen proof:** retry button, empty state, and the deliberate abstention.
Do not end on a fabricated success state.

## Final edit checklist

- [ ] Rehearse from a clean checkout after code freeze.
- [ ] Re-check `bfb1703b…`, every scorecard figure, and every denominator against
      the recording commit.
- [ ] Keep the 2:20–2:50 live abstention in the final cut; use and label the
      fixture fallback only if the live shot cannot run.
- [ ] Confirm the server action, not a local guess, controls every screen.
- [ ] Confirm degraded results show Review and never auto-accept.
- [ ] Confirm the portion is always spoken and shown as a band.
- [ ] Confirm the **Still open** #218 sentence remains unless the conditional
      merge and live re-run are both verified before recording.
- [ ] Confirm no API key, personal photo, personal identifier, or raw provider
      payload appears in the recording.
- [ ] Confirm the full script is exactly 8:00 or under the brief's ceiling.
