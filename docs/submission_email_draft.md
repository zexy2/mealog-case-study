# Case study submission email draft

> Pre-send: open the public repository and Loom link in a private window, check
> the latest GitHub Actions run, and confirm every development credential has
> been revoked or rotated. Sending and receipt cannot be verified from Git.

**To:** `hello@eatbetter.app`  
**Subject:** Full Stack Developer case study — Mealog / Zeki Akgül

Hi EatBetter team,

I’m submitting Mealog, a mobile-first meal-logging case study built around a
hybrid flow: Gemini perception, closed-set retrieval, deterministic catalogue
nutrition and explicit human review.

Links:

- Repository and technical write-up: https://github.com/zexy2/mealog-case-study
- Loom walkthrough (9:07): https://www.loom.com/share/8a1ad6fea24e401eaf52788d72d5a0fd
- Bounded EatBetter comparison: https://github.com/zexy2/mealog-case-study/blob/main/docs/comparison.md

What I built:

- A React Native / Expo app with capture, review, abstention and day-log flows.
- A NestJS / TypeScript backend that resolves observations to a catalogue
  `food_id` or `ABSTAIN`, exposes p10-p90 portion uncertainty, and computes
  grounded nutrition from sourced locale-pack rows.
- A separate, visibly unverified Gemini estimate lane for catalogue misses. It
  returns ranges and assumptions, is never auto-accepted, requires explicit
  user acceptance and is excluded from grounded evaluation.
- User-scoped idempotency, retries and degraded-state handling; metadata/text
  privacy controls; licence gates; offline regression evaluation; and a
  privacy-minimized correction-telemetry prototype.

The main trade-off is precision over automatic coverage. On the current
80-sample recorded replay, the grounded V3 path commits 10 meals and asks on 70.
Item F1 is 0.15; calorie MAPE is 12.7% over only 2 eligible and covered rows.
Those are deliberately narrow numbers, not a claim of broad production
accuracy. The comparison document explains the sample sizes and failure cases.

What I did not build: a trained model, production authentication/distributed
state, durable telemetry infrastructure, or a public backend deployment. The
Japanese locale pack is unverified evaluation data; the Turkish pack is
restricted to non-commercial use. Pixel-level face blurring is tested as an
RGBA utility but is not connected to compressed-image ingestion.

My next three steps would be: expand licensed catalogue coverage where `ask`
clusters, build a separately labelled evaluation set for the unverified
estimate lane, and replace process-local identity/rate-limit/telemetry state
with authenticated distributed infrastructure.

I used AI coding agents for implementation support, review and test generation;
the repository keeps the decisions, measurements, limitations and reproducible
checks visible.

Thanks for reviewing it,

Zeki Akgül
