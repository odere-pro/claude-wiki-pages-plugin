# Contributing

Thanks for your interest in `llm-wiki-stack`. This document is short because the project is small.

## Ground rules

- **The schema is authoritative.** Rules for the wiki live in [`example-vault/CLAUDE.md`](./example-vault/CLAUDE.md). Skill defaults that conflict with it must be overridden, not the other way around.
- **The four layers are load-bearing.** Before proposing a change, say which layer it belongs to (Data, Skills, Agents, Orchestration). See [`docs/architecture.md`](./docs/architecture.md).
- **Hooks and scripts are coupled.** If you change a script under `scripts/`, re-read `hooks/hooks.json` first. Never rename a hook script without updating the wiring.
- **Provenance > prose.** When adding a feature, describe the failure mode it catches and which layer catches it.

## How to propose a change

1. Open an issue describing the problem and the layer it affects.
2. For non-trivial changes, wait for maintainer feedback before opening a PR. This saves rework.
3. Keep PRs focused. A skill change, a schema change, and a doc change are three PRs, not one.
4. Update `CHANGELOG.md` under `[Unreleased]` with your change.

## Local development

Test the plugin from a fresh project:

```text
/plugin marketplace add /absolute/path/to/llm-wiki-stack
/plugin install llm-wiki-stack@llm-wiki-stack
```

Validate the manifest and hook config:

```text
jq . .claude-plugin/plugin.json
jq . .claude-plugin/marketplace.json
jq . hooks/hooks.json
```

Run each hook script against a representative input during development (they all read JSON from stdin — see each script's header).

## Things we won't merge

- Changes that silently weaken frontmatter validation.
- Dependencies that require network access during ingest or query.
- Hidden telemetry or analytics in skills, agents, or scripts.
- Scripts that run unsandboxed `eval` on vault content.

## Code of conduct

See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
