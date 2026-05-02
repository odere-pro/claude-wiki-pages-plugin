# Support

`llm-wiki-stack` is a community plugin maintained best-effort by the project owner. This document describes what kind of support to expect and where to get it.

## Posture

- Support is **best-effort, community-driven, no SLA**.
- The supported version is the latest tagged release on `main`. There are no backports unless the active version is v1.0+.
- Contributions are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Where to get help

| What you need          | Where to go                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Bug reports            | [GitHub Issues](https://github.com/odere-pro/llm-wiki-stack/issues/new) — include vault `schema_version`, plugin version, and a minimal `vault/raw/` repro |
| Feature requests       | [GitHub Issues](https://github.com/odere-pro/llm-wiki-stack/issues/new) — describe the workflow, not just the feature                  |
| How-to / discussion    | [GitHub Discussions](https://github.com/odere-pro/llm-wiki-stack/discussions)                                                          |
| Security vulnerability | See [SECURITY.md](./SECURITY.md) — **not** a public issue                                                                              |

## What gets fixed

| Severity | Examples                                                                                                                          | Triage                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Critical | A hook fails open (the schema is bypassed), `raw/` becomes mutable, or vault data is silently lost or corrupted                   | Hotfix branch, prioritised over all else |
| High     | A `SubagentStop` gate misclassifies a vault state; lint reports false negatives; ingest produces an unsalvageable wiki shape      | Next release                             |
| Medium   | Polish, ergonomics, error-message clarity, MOC churn that doesn't break invariants                                                | When time permits                        |
| Low      | Style, typos, minor docs                                                                                                          | Welcomes PRs                             |

Feature requests are triaged into `v0.2`, `v1.0`, or `wontfix` labels. `wontfix` always carries a one-line rationale (typically: "out of scope per [`/SPEC.md`](./SPEC.md) §17 non-goals").

## What does not get fixed here

- **Obsidian itself** — graph view bugs, plugin loader issues, OFM rendering quirks. Report to <https://obsidian.md/about>.
- **Claude Code** — slash command resolution, hook lifecycle, session management. Report per <https://support.anthropic.com/> for security; otherwise via the Claude Code feedback channel.
- **`kepano/obsidian-skills` upstream** — the `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` reference skills are bundled MIT copies. Report to <https://github.com/kepano/obsidian-skills>.
- **User-authored vault content** — if your wiki pages don't say what you expected, that's a curation question, not a plugin bug. Discussion is welcome; issues should reproduce against a checked-in fixture vault.

See the **Out of scope** section in [SECURITY.md](./SECURITY.md) for the security-equivalent escalation paths.

## What to include in a bug report

A bug report is actionable when it includes all of these:

1. The **plugin version** (`/.claude-plugin/plugin.json#version`) and the **vault `schema_version`** (`docs/vault-example/CLAUDE.md` if you're using the example vault, otherwise your own).
2. The **command sequence** that triggered the issue, including which `/llm-wiki-stack:*` slash command and any agent fan-out.
3. A **minimal `vault/raw/` fixture** if the issue depends on input. Strip secrets; the fixture goes into a public issue.
4. The **expected** versus **actual** behaviour, framed against a contract in [`/SPEC.md`](./SPEC.md) when possible (e.g. "§9 says ingest writes a `wiki/log.md` entry; this run did not").
5. Output of `/llm-wiki-stack:llm-wiki-status` (the one-command health check) if the issue is reproducible.

## Versioning and release cadence

- SemVer — pre-1.0 minors may break public interfaces. Every break is called out in `CHANGELOG.md` under "Vocabulary changes" or "Breaking changes" subsections.
- The vault `schema_version` and the plugin `version` are independent. A schema bump never lands without an explicit `CHANGELOG.md` "Spec changes" entry per `/SPEC.md §17`.
- Releases are tagged on `main` after Tier 0 + Tier 1 + Tier 2 tests pass.
- Each tagged release is published as a GitHub Release.

## Reporting and feedback

If something is genuinely broken, file an issue. If something is just confusing, file a Discussion — confusing UX is a real bug, but discussion-format helps converge on the right fix before any code lands.
