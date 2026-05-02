# Security policy

`llm-wiki-stack` is a Claude Code plugin that maintains a provenance-tracked Obsidian vault. The plugin's threat surface is the contract it enforces between **immutable user-curated sources** and **LLM-maintained wiki pages** — the security model is a property of the four layers, not a perimeter around them.

## Reporting a vulnerability

**Please do not file public GitHub issues for security vulnerabilities.** Use one of the following private channels:

- **Email**: `odere.pub@gmail.com` with subject prefix `[security][llm-wiki-stack]`.
- **GitHub Security Advisory**: open a draft at <https://github.com/odere-pro/llm-wiki-stack/security/advisories/new>.

Include in the report:

- Affected version(s) (`/.claude-plugin/plugin.json#version` and the vault `schema_version`)
- A description of the vulnerability and its impact on the vault contract (what invariant breaks)
- Steps to reproduce, ideally a minimal `vault/raw/` fixture and the prompt sequence that triggers the issue
- Whether the issue is reachable via a normal `/llm-wiki-stack:*` invocation or only by bypassing hooks
- Your suggested mitigation, if any

## Response window

- **Acknowledgement**: best-effort within 7 days of receipt.
- **Triage and fix**: no SLA at v0.x. Issues that breach a Layer 4 invariant (raw-immutability, frontmatter validity, MOC consistency) take priority over feature work.
- **Disclosure**: coordinated. The reporter is credited in the fix's CHANGELOG entry unless they request anonymity.

## In-scope

The following components are in scope for security reports:

- **Hook scripts** under `scripts/` (any script wired in `hooks/hooks.json`) — particularly `protect-raw.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh`, `validate-attachments.sh`, `prompt-guard.sh`, `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`. Bypasses, shell-expansion issues, and unquoted variable handling are explicitly in scope.
- **Vault path resolution** (`scripts/resolve-vault.sh`) — the four-tier resolution order is a trust boundary. Path-traversal escapes from a configured vault root are in scope.
- **Frontmatter validators** — schema bypasses (e.g. crafted YAML that the validator accepts but downstream skills mis-parse) are in scope.
- **`SubagentStop` gates** — issues that allow an agent to complete a chain with an unverified vault are in scope.
- **Skill and agent definition files** under `skills/` and `agents/` — instruction patterns that enable prompt-injection escapes from ingested sources, or tool-call abuse that writes outside the contract.
- **`/llm-wiki-stack:*` slash commands** — argument-handling issues that let a user (or an agent) bypass a precondition.
- **Onboarding wizard** (`skills/llm-wiki/`) — issues during vault scaffolding that leave the vault in a state where validators no longer fire.

## Out of scope

Report these to the upstream maintainer:

- **Vulnerabilities in Claude Code itself** — report to Anthropic per <https://support.anthropic.com/>.
- **Vulnerabilities in Obsidian or its plugins** — report to <https://obsidian.md/about> and the relevant plugin maintainer. `obsidian-graph-colors` is plugin-authored; bugs there are in scope, but vulnerabilities in Obsidian's graph view itself are not.
- **Vulnerabilities in `kepano/obsidian-skills`** (the upstream of the bundled `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` reference skills) — report to <https://github.com/kepano/obsidian-skills>. We track upstream security fixes via `THIRD_PARTY_LICENSES.md`.
- **User-authored content** under their own `vault/raw/` or `vault/wiki/` — this is consumer data, not plugin code. Plugin behaviour given malicious content is in scope; the content itself is not.
- **Misuse of the `confidence:` field** — it is a scoring convention, not an audited truth signal. See the threat model for what this does and does not protect against.

## Threat model

Documented in [`docs/security.md`](./docs/security.md). Four threat classes enumerated, each with the test files that exercise the defenses:

1. **Prompt injection via ingested sources.** Mitigated by reading the schema before the source, hook-enforced raw-immutability, and frontmatter-bound writes that block malicious output shapes.
2. **Provenance drift.** Every non-source page carries a `sources:` field; `confidence` is lower-bounded by the number of corroborating sources; `llm-wiki-stack-curator-agent` repairs structural drift between pages and their indexes.
3. **Vault poisoning.** Ingest is additive — a contradicting source extends `contradicts:`; it does not silently overwrite. Every ingest lands a `wiki/log.md` entry for human audit.
4. **Hook script abuse.** Mitigated by `set -euo pipefail`, quoted variables, scope confinement to the resolved vault path, and Tier 1 Bats unit tests per hook script.

The threat model also documents what the plugin **does not** defend: unsigned provenance, non-sandboxed hook scripts (they run with user privileges), and LLM-opinion confidence scores.

## Supply chain

- **No MCP servers.** `llm-wiki-stack` exposes none and depends on none. If that changes, scope will be limited to the vault path and pinned with explicit version tracking.
- **No npm or PyPI dependencies.** Tooling under `tests/` (`bats-core`, `shellcheck`, `shfmt`, `markdownlint`, `lychee`, `gitleaks`, `yq`, `garak`, `osv-scanner`) is installed by `tests/install-deps.sh` and is not redistributed.
- **GitHub Actions** in `.github/workflows/` — `uses:` references should pin to a full commit SHA, not a tag. Drift here is a security report.
- **Adversarial CI** runs weekly via `.github/workflows/adversarial.yml`: `garak` red-team, `osv-scanner` dependency vulnerabilities, and a prompt-injection corpus replay (currently stubbed pending fixture). See `/SPEC.md §14` for the Tier 4 contract.
- **Third-party skills** (`obsidian-markdown`, `obsidian-bases`, `obsidian-cli`) are MIT-licensed copies from `kepano/obsidian-skills`. Provenance and license tracked in `NOTICE` and `THIRD_PARTY_LICENSES.md`. We do not modify them; updates land as a single `chore(skills)` PR with the upstream commit SHA in the message.
