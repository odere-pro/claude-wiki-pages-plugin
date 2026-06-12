# Claude-arm evidence — NON-REPRODUCIBLE (supplementary)

These cells were produced by **claude-fable-5** (Claude Code session,
2026-06-12) executing the two arms' prompts in-session on the same golden
inputs, then scored by the same model-neutral scorers as the local arms.

Caveats — why this is supplementary, not gate evidence:

- **No reproducibility controls.** No temperature/seed control, no pinned
  model snapshot; re-running on a later Claude model will produce different
  text. The ADR-0011 evidence convention (stamp + verify-artifact) applies
  only to the local arms.
- **Not contamination-controlled.** The operator session had full repository
  access, including the gold references and scorer source. The outputs were
  authored from the prompts alone, but this cannot be proven the way the
  sealed local-arm produce step can.
- **What it is for:** contextualizing the scaffolding ablation
  (docs/adr/ADR-0020-scaffolding-ablation-eval.md) on a frontier model — the
  plugin arm passes; the baseline arm loses schema/provenance (ingest) and
  drops the gold-required quote (query-basic) even when the prose answer is
  correct.

Scores live next to each arm's outputs (`<arm>/<case>.scores.json`); re-score
any cell with the scorers in `scripts/` — scoring IS reproducible, only the
production step is not.
