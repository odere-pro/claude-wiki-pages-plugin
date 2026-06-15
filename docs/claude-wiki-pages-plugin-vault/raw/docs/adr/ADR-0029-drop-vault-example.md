# ADR-0029: Drop `docs/vault-example/`; golden tests → a dedicated fixture; schema authority → `skills/init/template/`

- **Status:** Accepted
- **Date:** 2026-06-14
- **Builds on:** [ADR-0014](./ADR-0014-single-source-required-fields-and-duplicate-claim-warning.md) (single-source required-fields table, dev↔runtime parity), [ADR-0004](./ADR-0004-ontology-profile-v1.md) (ontology-profile-v1)
- **Anchor:** §4 (Layer 1 — Data), §5 (the four-layer stack)

## Context

`docs/vault-example/` carried three jobs, but two were already served elsewhere:

1. **Runtime scaffold** — `/claude-wiki-pages:init` copies `skills/init/template/` (`scripts/scaffold-vault.sh` `DEFAULT_SOURCE`), NOT vault-example.
2. **Schema authority** — `scripts/validate-frontmatter.sh` falls back to `skills/init/template/CLAUDE.md` ("vault-example is dev-only, not shipped at runtime"). `vault-example/CLAUDE.md` and `_templates/` were **byte-identical duplicates** of the shipped template, kept in sync only by a parity gate.
3. **Golden test anchor** — `gate-05` row1 (verify parity), the `lint-structural/vocabulary/ontology` "reference passes clean" tests, `doctor.bats`, the `skill-schema` smoke, and `validate-docs` 5g predicate grounding all ran against vault-example.

With a real dogfood vault now in the repo (`docs/claude-wiki-pages-plugin-vault/`), the populated demo no longer earns its keep — and the dogfood vault is unfit as a golden (100+ pages, changes every PR → brittle). vault-example was pure duplication plus a volatile-by-proximity test target.

## Decision

1. **Delete `docs/vault-example/` entirely.**
2. **Schema + templates have one home: `skills/init/template/`** (the shipped scaffold, already the runtime fallback). `validate-frontmatter.sh`, `validate-docs.sh` (5g predicate extraction), and the eval harness now read the template directly.
3. **Golden/parity/lint tests target a new dedicated fixture: `tests/fixtures/reference-vault/`** — a small, schema-v3, deliberately-clean vault that exercises every `verify` CHECK, all three opt-in lints, and the dangling-wikilink check at zero warnings. Its `CLAUDE.md` is a copy of `skills/init/template/CLAUDE.md`, pinned in parity by `ontology-profile.bats` (reference-vault ↔ template).
4. The `maintenance-run` safety guard (don't run scheduled upkeep against the dev reference vault) now protects `tests/fixtures/reference-vault`.

## Consequences

- One schema source instead of two byte-identical copies; the dev↔runtime parity gate now pins fixture↔template.
- The golden target is small and stable, decoupled from the volatile dogfood vault. `gate-05` row1 is now `(0,0)` on a clean fixture.
- `init`/onboarding is unaffected (it never read vault-example).
- Historical ADRs and the dogfood vault's ingested content still mention vault-example by name as a record of how things were; that is documentary, not load-bearing, and is left untouched.
