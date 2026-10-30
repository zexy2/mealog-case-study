# Gemini 3.1 Flash Lite adversarial rerun

Date: 2026-08-23
Agent: codex3
Issue: #233 measurement follow-up; claim #234

## State

Measurement only. No repository source, fixture, golden, baseline, evaluator, or
mobile files changed. Six user-provided adversarial images were uploaded once
each to the real Node provider path with `GEMINI_MODEL=gemini-3.1-flash-lite`.
`GEMINI_API_KEY` was checked as present without printing or persisting its value.
No Expo client or device was run.

## Command and boundary

Server command, from the temporary worktree server directory:

```text
VISION_PROVIDER=gemini GEMINI_MODEL=gemini-3.1-flash-lite PORT=3113 npm start
```

Each request was a multipart `POST /v1/meals` with a fresh idempotency key,
`locale=tr`, `config=V3`, and the image sent as `meal.jpg` with `image/png`
content type. Demo mode was not used. The client screen below is the current
`apps/mobile/App.tsx` routing derived from the returned HTTP payload; no device
screen is claimed.

## Results

| Input | Expected | HTTP/action | Result | Portion | Client route | Verdict |
|---|---|---|---|---|---|---|
| `BOS TABAK.png` | refuse | 200 / ask | no items | none | Review | correct refusal |
| `BIR BARDAKSU.png` | refuse | 200 / ask | `ABSTAIN` | 0 / 0–0, not_applicable | Abstention | correct refusal |
| `ANAHTARLIK KALEM.png` | refuse | 200 / ask | no items | none | Review | correct refusal |
| `TELEFON EKRANINDA YEMEK.png` | refuse | 200 / ask | `tr.pilav` 180 g; 2 `ABSTAIN` items | 180 / 117–261, `catalogue_default`, `catalogue.default_serving_g=180` | Abstention | false accept in returned items |
| `OYUNCAK YEMEK.png` | refuse | 200 / ask | `ABSTAIN`; `tr.lahmacun` 140 g; `ABSTAIN` | 140 / 91–203, `catalogue_default`, `catalogue.default_serving_g=140` | Abstention | false accept in returned items |
| `BULANIK RESIM.png` | refuse | 200 / ask | `ABSTAIN` | 0 / 0–0, not_applicable | Abstention | correct refusal |

All responses had `degraded=false`. The two false-accept rows carried
confidence 1 and candidate score 1 for the number-bearing catalogue item, but
the top-level action remained `ask` because the response also contained
`ABSTAIN`; therefore this run created no Day record. The result is still a
false accept at the server result boundary: a refused image received a
catalogue food, grams, and calories.

Summary: 4/6 correct refusals; 2/6 false accepts; 0 provider 503s in this
rerun. Switching from the exhausted prior model to `gemini-3.1-flash-lite`
did not eliminate screen-food or toy-food confusion.

## Limitations

- This was one request per image, not a stability estimate.
- No known real-food control image was supplied, so false-refusal recall is not
  measurable.
- The raw provider envelope and surface forms were not retained.
- No Expo runtime, simulator, or physical-device execution was performed.
- The images remained outside the repository under `/tmp/mealog-adversarial/`.

HANDOFF
State:    Six-image live rerun complete with Gemini 3.1 Flash Lite; 4 correct refusals and 2 false accepts.
Done:     Real multipart Node requests recorded; no source changes; server stopped.
Next:     Keep #233 measurement finding; any gate or provider/prompt change needs a separate scoped claim.
Traps:    `GEMINI_API_KEY=PRESENT` does not prove quota or provider health; model switch removed 503s here but did not remove false accepts; mixed `ABSTAIN` responses still contained number-bearing wrong food items.
Branch:   agent/codex3/adversarial-measurement
Commit:   pending
