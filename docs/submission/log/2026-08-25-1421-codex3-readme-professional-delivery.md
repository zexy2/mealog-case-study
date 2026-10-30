# Professional README delivery

Agent: codex3
Issue: #375
Branch: agent/codex3/readme-professional-delivery
Base: a69ab5c5dc70025397de6d281353f1cb509ce9a5

State: README reorganized for a reviewer-first take-home flow.
Done: Added a bounded product/result summary, explicit EatBetter comparison,
three distinct run paths, corrected architecture branching, reliability and
observability evidence, and precise security/runtime limitations. No source,
fixture, catalogue, threshold, evaluator, or metric changed.
Evidence: Three independent read-only audits checked reviewer order,
source/document truth, and clone-to-first-result commands. The fixture HTTP
smoke returned 200 with action=review and tr.kuru_fasulye. Node 313/313,
mobile typecheck/focused tests, and Python 287 tests plus repository gates were
green before the documentation edit; final documentation gates were rerun
afterward.
Eval impact: None. Documentation only; all reported n=80 V3 figures are copied
from the current reproducible evaluation and the 12.7% MAPE remains explicitly
limited to 2/2 complete covered rows.
Traps: Do not describe Expo export as device execution, old simulator logs as
current-release E2E, the offline fixture scorecard as current live-model
accuracy, or mobile nutrition logic as preview-only. Latest hosted Actions jobs
ran zero steps because of the account billing/spending state.
