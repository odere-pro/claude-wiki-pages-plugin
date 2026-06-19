# docs-check-corpus — fixture corpus for `lint --check docs`

This directory is the checked-in reference corpus for `src/core/docs-check.ts`
and `src/core/docs-check.test.ts`.

It models a minimal repository tree that exercises every check in Checks 0–4
of `scripts/validate-docs.sh`:

```
docs-check-corpus/
  clean/            -- files that should produce ZERO findings
  dirty/            -- files that each violate exactly one check
  exempt/           -- files that are on the exemption list and must pass clean
  skills/           -- stub skill directories used by Check 4 (resolve)
  agents/           -- stub agent files used by Check 4 (resolve)
  commands/         -- stub command files used by Check 4 (resolve)
```

## Usage in tests

The `makeDocCorpus()` helper in `docs-check.test.ts` builds an in-memory
sandbox from inline strings. This checked-in corpus is the equivalent
reference for manual verification and dual-run comparison.

To run `checkDocs` against this corpus manually:

```bash
bun -e "
import { checkDocs } from './src/core/docs-check.ts';
const findings = checkDocs('./tests/fixtures/docs-check-corpus');
console.log(JSON.stringify(findings, null, 2));
"
```

## Expected outcome

Running `checkDocs` on this corpus should produce findings ONLY for files
under `dirty/`. Files under `clean/` and `exempt/` must yield zero findings.
