# Playbooks

A learning path. Three tiers, modeled after AWS Skill Builder course levels.

The [user guides](../llm-wiki/index.md) under `docs/llm-wiki/` are *task references* — go there when you know what you want to do and need to remember the exact steps. The playbooks here are *learning paths* — go through them in order to build mental models.

## Pick your tier

| Tier | Audience | After this playbook you can… | Time |
| ---- | -------- | ---------------------------- | ---- |
| [200 — Foundational](./200-foundational.md) | First-time user. Has Claude Code. Has not seen a vault before. | Install the plugin, scaffold a vault, ingest one source, ask one question with cited answers. | ~30 min |
| [300 — Associate](./300-associate.md) | Operates a real, growing vault. Comfortable with frontmatter and slash commands. | Route work to a specific specialist agent, customize the schema, run hooks manually for debugging, batch-ingest, operate two vaults. | ~2 hours |
| [500 — Expert](./500-expert.md) | Plugin extender or downstream maintainer. Comfortable reading [`/SPEC.md`](../../SPEC.md) and shell scripts. | Author a new skill, add a hook, run all four test tiers, fork the plugin, integrate it with CI. | ~half day |

## Conventions

Every module follows the same shape:

1. **Objectives** — what you can do after this module.
2. **Lab** — copy-pasteable terminal transcript or file diff. The `>` is a shell prompt.
3. **Knowledge check** — two or three short questions. Answers are collapsed; expand to verify.
4. **Next steps** — link to the next module or the canonical reference.

Callouts:

- `> **Lab.**` — hands-on work. Run the commands.
- `> **Note.**` — context worth knowing, not required to follow along.
- `> **Deferred.**` — honest gap. Tracked in [`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md).

## Where the playbooks fit

```
docs/
├── playbooks/         ← you are here. Learning paths, ordered.
├── llm-wiki/          ← task references. Open when you need a specific recipe.
├── architecture.md    ← four-layer model in prose.
├── adr/               ← decision records. The "why" behind the SPEC.
└── security.md        ← threat model.
```

The playbooks link out to the references. They never restate them.

## A note on numbering

AWS Skill Builder uses 100/200/300/400 (Foundational/Associate/Professional/Specialty). We skip 100 (this is not a "hello world" — there is real machinery here from the first module) and 400 (the gap between Associate and Expert is one playbook wide). The numbers are signposts, not certifications.
