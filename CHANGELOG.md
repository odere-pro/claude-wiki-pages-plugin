# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/odere-pro/claude-wiki-pages-plugin/compare/v1.0.0...v1.1.0) (2026-06-13)


### Features

* 0.2.0 — top-level orchestrator + polish agent (four-layer DX retrofit) ([ea89835](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/ea89835d6fd6c44bfa84c5bacd284a55e245f257))
* 1.0.0 — rebrand to claude-wiki-pages + deterministic Bun engine (M1–M5) ([376888b](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/376888b05a757b4c68070e7c525689ca10a2e94a))
* ablation smoke + measured with/without-plugin matrix in features.md ([#27](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/27)) ([9fb7177](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/9fb71772c68241ec6b3f6bc268d78a7f52234b6f))
* add OG/Twitter cards, JSON-LD, and share image to landing page ([b5dcff8](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/b5dcff8e6fa1b399ca8feee270bec26d1ae37e98))
* backlink-safe renames via Obsidian CLI with git mv fallback ([#24](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/24)) ([5b1e90b](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/5b1e90b45c275ce102065ed14e156ab9aae3b1fe))
* C1 budget-aware MOC descent reading R4 score (no re-rank) ([bc7e8e8](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/bc7e8e86f146c21b35f038408729910b0b81943b))
* C2/C4-write durable memory — sanctioned agent-session raw carve-out ([a3e81bb](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a3e81bb457b045fd8753f1522f420496961975ad))
* C3 stale-memory flagging (reuse S4 + status:stale + confidence) ([bb4acca](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/bb4acca0c80a8f5d7b25e2b8bd4f465b82cdbd87))
* C4-read + U3 SessionStart MOC pointer, NEXT line, undo clause ([7e23014](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/7e23014355fa32c0d7be13c031fb926bc5f62422))
* commit-hash paper trace in wiki/log.md ([760816c](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/760816c8f523a2b81ea4b27e80bd6f93bd6dc94b))
* D2 tag/vocabulary freshness-eval lint + honest exemplar lexicon ([cd6087d](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/cd6087deeddc2fb36c137c3daf446230c33dd1c2))
* deterministic Tier 4 prompt-injection corpus replay ([bda8193](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/bda819345de3103a48c0fd8b18170eb850f58974))
* doctor D11 — advisory Obsidian link parity check ([#25](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/25)) ([745e19a](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/745e19acf51bad4b328e6996ea7435bc52ac3a22))
* git protection everywhere + project wiring + sync skill ([10e3370](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/10e33700d2b836878e9cd84c5e42d386c42461fc))
* git-required per-vault init [D4] (ADR-0005) ([80d7cf9](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/80d7cf94e77c29e15d85e67e5854472ae3dda128))
* graph-quality knowledge base — folder notes (schema v3), color groups, Sources grounding, resolver fix ([#29](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/29)) ([b71f465](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/b71f465994faf9f6558d5c4bf1fac49070f6c161))
* graph-traversal primitive + R2 --graph (ADR-0008) ([c25d434](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/c25d434cc17087f0e50627705cd74cf92af61b26))
* I1 ingest classification checklist consuming ontology-profile-v1 ([de6d7e3](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/de6d7e3a27616f7839b0290622a27759ec723160))
* I2 alias-aware two-pass dedup in ingest ([2ea4ecd](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/2ea4ecdd324e5a38e57890ca12c4cca938593e36))
* I3 provenance-completeness checks in verify (bash + TS parity) ([66c0fc5](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/66c0fc593498c3d5be09b266ffe5e7c59e110bd2))
* I4 PDF ingest via source_format: pdf ([afa0792](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/afa079251371ddebf33f2dc383f2e25e44a6764f))
* init wiki vault for claude-wiki-pages-plugin repo ([7b4f45b](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/7b4f45b47fe8454416ea2356d2245c657f68859c))
* initial four-layer plugin — spec, vault schema, skills, agents, orchestration, CI ([2f96e50](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/2f96e50d742276a2668fc26c64feb336a28c1504))
* initial Obsidian graph filters in new vaults ([1d2e1a6](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/1d2e1a6a6325e4f3529636c97787d688b9ced7cd))
* jq pre-flight check in session-start and doctor ([1c5a71e](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/1c5a71e6d533d3de8e22c68ff0459401dd6d28b4))
* local-LLM basic ops — ingest-extract gate (ADR-0017), offline fallback (ADR-0018), query tier (ADR-0019) ([#22](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/22)) ([876999f](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/876999f23223655be33c65aa7b866c70ea9557b5))
* local-model quality-gate eval (ingest-extract tier) + ADR-0011 ([8348638](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/83486380ee69f7be5eb41bb3159554a19861cfd3))
* Obsidian-visible vault name — docs/&lt;root-slug&gt;-vault for new vaults ([#28](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/28)) ([30ab3c7](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/30ab3c7c4ce54771bfb868cb478ffc0d98c81afe))
* P0.3 — design-drift Check 5 + router parity in validate-docs.sh (ADR-0013) ([929b5db](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/929b5db2da34401c2accf639428fec3b695cd47f))
* P1.1 — SessionStart emits absolute vault CLAUDE.md on-ramp ([2ba3571](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/2ba3571779e595e8bcd2c96b0d29b9afe06745c4))
* P2.2 — single-source required-field rules from the schema table (ADR-0014) ([32eca36](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/32eca36e7c272270ed8cba98e7cd032a2d5509f9))
* P2.4 — duplicate-claim WARN in review gate (exact/normalized match, no RAG) ([4e457fd](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/4e457fd7a72daa56e1299b9e5a597b54e1d371be))
* P3.1 — single CAPABILITIES table + capabilities verb (N1-N3, ADR-0015) ([0e9944c](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/0e9944c9dc970e052939c4ff66809335875e360c))
* P3.3 — engine ontology --json parser (N6, ADR-0015) ([6d52277](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/6d5227724c7ad441b3d91ad4a1041af829b19c6d))
* P3.4 — engine-side entity_type membership check (N7, D15) ([e5dae28](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/e5dae283e42e634f8a5134708ec00eb728ec8b34))
* P3.5 — opt-in --json envelopes for bash gate scripts (N10, N11) ([89f8d99](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/89f8d99150a8af99fbba9128623d3f644bc8953d))
* pathspec-scoped vault git ops + consume gitCheckpoint.mode ([4c4fa33](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/4c4fa33626be1aea54ae27ea39c290cb40959b3f))
* Pc local-ingest-stub (ingest-extract tier) into _proposed/ ([469330c](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/469330c156630600aa0e3b9b32e3e5f86bcf4872))
* PM.1 — simultaneous N-vault registry contract (ADR-0016) ([e6a9857](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/e6a9857728db1264bc98a8efb79709679f0e5fa1))
* PM.3 — read-time cross-vault audit roll-up (N8, ADR-0016) ([ca87cec](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/ca87cec3d84ff0c36fac54239869d412a4b6286a))
* PM.4 — list --status column + pre-switch health-check (OBJ-grill-power-user-5) ([cf40645](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/cf40645055e3ea1a2e3d9dfeb3058c701fcd4e92))
* PM.7 — 07-ontology.md design doc + validate-docs Check 5g (N12, D13) ([c998f18](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/c998f182d7e4e7e1f483a99e9b1ee1e9158c0c5d))
* R1 candidate filters --type/--folder/--tag for search ([6502fd2](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/6502fd2f059d521bcbb03c25ce2b3e6de5540965))
* R3 agent-vs-human retrieval contract on the MOC ([2474fef](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/2474fef1ef4d62fe417f696007caeb6915095a2c))
* R4 matched{} score breakdown on SearchHit (+ glossary) ([209a539](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/209a539b73f280a4c9994047c7ae1ff97b0b20f1))
* S1 ontology-profile-v1 predicate table + enum list (ADR-0004) ([fe30a9d](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/fe30a9d32a0bd6e5dee37eee10ef1b5989d59b5a))
* S1-check opt-in predicate domain-&gt;range lint (lint-ontology.sh) ([2c772f6](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/2c772f63171b16050878fa791f8956787419093b))
* S2-structural template-skeleton + no-raw-HTML lint (lint-structural.sh) ([0db59b8](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/0db59b85233baa28951603bf7b6c68d50b11790d))
* S3 multi-vault registry + per-vault write confinement (ADR-0009) ([cf4ee9b](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/cf4ee9b6bb7858f88abdb2853b1550b0695ad0fd))
* S4 cited-source staleness in verify (bash CHECK 4 + TS twin) ([8302c72](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/8302c72bb4348cc2e83623a7066055fd98c9c3b9))
* scaffolding ablation — what the plugin buys, measured (ADR-0020) ([#26](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/26)) ([f85a3a0](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/f85a3a0f3a60a4f8e5dd730f35c7cfa9acf8eaa3))
* schema enums (source_type agent-session, source_format pdf) + P3 localModel config ([99cc7ff](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/99cc7ff95bc1138b8be563abd9a4d9f1cb09f6c5))
* schema v2 + firewall, search, maintenance, local-model drafting; audit remediation ([5eddd0b](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/5eddd0bee6b60f6318e66e160ad8e362fd6040be))
* SEO social cards, JSON-LD, and share image for the landing page ([e93eab1](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/e93eab14e222219bd7ff15f03d22c7f68f2aa65e))
* snapshot engine verb — git-bound LLM write phases ([f491954](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/f491954de8cbc2dd6dd4a16e6104dc4b211dd34a))
* SOFTWARE-3.0 agentic-brain roadmap (four-layer stack, dual-entry router) ([620284d](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/620284d60c76475a039dd2ec6980184a8a4d8929))
* SOFTWARE-3.0 deferred — Phase 3 (engine/ontology surfaces) + Phase M (multi-vault) ([2ec8b92](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/2ec8b92dfaa7bddf5b48461dd7f17f84af3741cc))
* SubagentStop commit backstop — no LLM write escapes git coverage ([c45561c](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/c45561c74402787bd2af5cfae4c72c467928c6c7))
* sync skill + wired-change surfacing (backlog, heartbeat) ([27651d6](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/27651d6bd04ab73b68f7377db5bfdcbcd2e7921f))
* Tier-2 embedding-free recall — synonym lexicon + Porter stemming ([38c29ed](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/38c29ed283fe5b890ebbd969e7448522c8030f46))
* U1 advertise /claude-wiki-pages:wiki as the one entry verb ([f094497](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/f094497b986c63b0e28646d7d4f7d086ae47010b))
* U2 first-run bundled sample source ([0e70a9a](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/0e70a9acd76fff80ecb6a89a1f4fa0af5f1a7903))
* U4 errors that teach (all missing fields + offending fragment) ([a5f3a73](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a5f3a7314cd4206f959d8532b788099095eb5491))
* U5 optional next? on Report (JSON-only) ([c428b8f](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/c428b8fc45f7ad3b83ee95e08e46c5f9d7ce1325))
* U6 contributor quick wins (stale-dist gate, gate-09 fix, tier3 stub) ([4d50f94](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/4d50f940371f36fd5f496cee5731f4e1b02de14a))
* **vault:** ingest 9 raw sources into structured wiki ([75e7470](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/75e74701d60be2a640d4dab9a82584469370c3ab))
* wiki-only graph — exclude raw/_templates/_proposed, drop layer pass, graph config as regenerable cache (ADR-0023) ([#30](https://github.com/odere-pro/claude-wiki-pages-plugin/issues/30)) ([ba60920](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/ba60920c455f9275d88fe9df255d24897123b135))
* wire a project as a docs-only ingest source ([2abee4d](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/2abee4d7ef3fa6eeadb7d8da667514878343e025))


### Bug Fixes

* calibrate skill invocation guards + enforcement hooks ([a8ec7a0](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a8ec7a064eee52482561f8f50beb6681385cdc62))
* de-link gitignored plan path in design docs (Tier 0 lychee) ([8538a9e](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/8538a9e48c68cf1424035273911692e428198dda))
* decouple eval --stamp uncommitted-gold test from real-repo commit state ([7367040](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/73670401d456d41626bc82bc870f1e4fed2b1a51))
* drop removed marketplace.json from release-please extra-files ([8c25ead](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/8c25eadd25a8187e12278ac80adeb6befd11b38f))
* harden active-vault extractor against compact JSON (QA-adv MEDIUM/LOW) ([bd1b556](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/bd1b556eb983e6a8d01ae1364112e75b3dac8d67))
* here-string grep -q in validate-docs Check 5 (SIGPIPE on macOS) ([febd907](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/febd907976478399be3a285c729242eebdafca0d))
* implement all findings from the 2026-06-11 evaluation review ([dcf9813](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/dcf98136072d859d7622a2a074f7def8fa983f61))
* P3.5 — escape C0 control chars in bash --json emitters (QA-adv HIGH) ([80dbc2f](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/80dbc2feaf9155bbbf8b154647be6c13e9b0a2b1))
* PM.2 — OQ-9 registry fail-closed (N4, N5, ADR-0016) ([43d56e0](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/43d56e05d0f11a4ca2f5a30d28cca459d48dc8ca))
* render mermaid diagram on Pages site via explicit mermaid.run() ([ae9e7a8](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/ae9e7a8399923b72161f410f1b5970492bb8e5f2))
* render mermaid diagram on the GitHub Pages site ([9fcb8d2](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/9fcb8d26799618ea45895aa6179b3b20662d9cf3))
* stop requiring removed marketplace.json in manifest gates ([a2ad793](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a2ad7930a38f5eb00ef3db4f87f0ac37b18ef25f))
* **vault:** post-curate touch-ups — title-form wikilinks on qwen3 page, confidence discipline, log entries ([87bb927](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/87bb927b093afb029392443373b3fc882beb25f3))
* **vault:** resolve 49 dangling wikilinks — aliases, backtick demotions, new entity page ([a4fcadf](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a4fcadf29e5303ad313ac4353c2f81b02ef88e42))


### Refactoring

* pre-0.2.0 hardening — agents, skills, tooling, docs, config, onboarding ([c070ad4](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/c070ad46639c6a5fa9e7c0a510d990790417259e))


### Documentation

* add directory-scoped CLAUDE.md context files ([f238442](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/f23844225cbd613df3cc0e518726fdcf96ec38c6))
* add SOFTWARE-3-0 dual-entry router + docs/design diagrams; redefine the brainstorm team ([10d2543](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/10d25435ff2a12585029fd9d0043f295e2ed71fd))
* add SOFTWARE-3.0 deferred-work plan (0005) — Phase 3/M proposal ([f522d9b](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/f522d9bb06ae501893a725d796bd6d579f27449d))
* ADR-0010 durable-memory carve-out (complete the ADR trail through Phase 2) ([0e4faf0](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/0e4faf075eec31f8772704bbddb2a6f992b20849))
* ADR-0015 engine self-description + ADR-0016 simultaneous multi-vault ([b95562e](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/b95562ef8d35e20ae4027d5c6302d37ebbae9e23))
* ADRs for the R4 score object + Tier-2 wiki-native recall (0006, 0007) ([b215231](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/b215231c2675c513e859d63e17908d67c5a6ae0c))
* correct README hook count and surface the multi-vault guide ([b6ed672](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/b6ed6728c92f0b4af5c181c1c5ef9b385d2c0ad2))
* document _proposed/ + proposed_by review-gate contract ([114b49f](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/114b49f3868d7d048119d36917a541e37b9865ae))
* glossary terms, changelog, design-doc sync for git protection + wiring ([388f229](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/388f229ff524acdb63f70466152ca8808e1de1fa))
* I2.7 — design-diagram template (passes design-drift Check 5) ([7fbfc01](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/7fbfc0103ddbe8ba57c54052a5e660b0b97b2eb4))
* make ADR-0015/0016 self-contained after docs/plan removal ([a4dfc3d](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a4dfc3d6d142229f1867e9e1470ef89431a5fc71))
* P0.2 — glossary rows for Software 3.0 / dual-entry router terms ([cd402ce](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/cd402ce248dea8436f9aae704465f480c04e6daa))
* P0.4 — pin root CLAUDE.md schema_version to 2 (match authority) ([c2e3d66](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/c2e3d667b305e7d2b289999da4b3fbe90c7fc036))
* P1.5 — link ontology row to the ontology-profile-v1 anchor ([90de6fc](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/90de6fcb43c1df13277898e7d412cd0035dc573e))
* P3.6 — graceful-degradation table + ontology-aware write guard (engine-api) ([3d15e96](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/3d15e96a4bdd633feef5ddd57926c13e2bfaaa45))
* Phase-0 glossary rows for roadmap terms (Brief §13) ([8b1e236](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/8b1e236e1484c369bd8b1fed66cc14eac62beae0))
* PM.5 — multi-vault operating rules (engine-api links maintain-contract) ([3f71e6e](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/3f71e6e5c4808b00a6e67795002e17a260260516))
* PM.6 — fix vault-registry merge drift; confirm engine glossary rows ([390d185](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/390d18500b80e44cdd349e194603170287fc2c9d))
* reconcile architecture.md counts + init schema_version/paths ([b0e3afc](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/b0e3afc9393456d47a003e99f00b5673518b7d88))
* record review-fix pass in CHANGELOG [Unreleased] ([ec010b9](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/ec010b9b7c89240aed2c5126f764f749d9be1fff))
* remove build-process scaffolding, consolidate security, add directory context files ([1db92e1](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/1db92e124e1fc578927609f400941f0a78fb0677))
* remove build-process scaffolding; consolidate security; self-contained ADRs ([1c7fb37](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/1c7fb37dc11d0c00f36bb61bcc51ba41c4f80a49))
* **site:** align landing-page skill/agent counts with README ([8ec3fee](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/8ec3fee53c283356f6d9ab2d228cf83682be9bf3))
* slim README; split install/operations/features into docs/ ([a776d27](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a776d270dabd39129fac05fe63ce279b65b6163c))
* vault-merge conflict-resolution design — plan 0004 + ADR-0012 ([5ade101](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/5ade101fb06c8d59ff0a4a061d10ebdf6ad81417))


### CI

* drop removed marketplace.json from the Tier 0 manifest-parse step ([e38d744](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/e38d744f4729d6127a4039ee89e5c70e43a1211c))
* fix CD workflow failures ([bce6d5c](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/bce6d5c9cb575a1dc8255306272bae4e04a86052))
* install bun in Tier 1 so frontmatter/vocab Bats run ([486acfc](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/486acfcd37ece828a7f82f9e9989e657a46c0cd3))


### Tests

* calibration-flow fixtures; exclude .claude/fixtures from doc/style gates ([eb4a211](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/eb4a21197be1afac5fa2c9e8ec56797a00bdfdcd))
* neutralize firewall test paths (gate-06) ([e9d8335](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/e9d833533a7a2f2e93c0c9cb3a8558fda040879e))
* P3.2 — verb-drift contract test pinned to golden list (N9) ([f4f31c4](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/f4f31c475fa0dd73e795ab4efa9a7381e917ba6c))
* pin the session-start → heartbeat maintenance trigger ([4fa2264](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/4fa2264b7db9048ba4eb17a5aa275ffa6391786a))


### Chores

* exclude vault content from the doc-normalization gates ([7eeb58b](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/7eeb58b3a789b4c15818bd1160956e31dfeff4d3))
* finalize curated history — rewrite CHANGELOG, reconcile manifest to 1.0.0, harden gitleaks scan ([241fce6](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/241fce646ead3d47df19288a147df7e6eaa5e619))
* git checkpoint before curator fix+curate pass ([4d98c65](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/4d98c65cffa5820a01f3a968480d92f0ccc0d61a))
* git checkpoint before ingest pipeline run ([12dc6b1](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/12dc6b1cf84ea507eba9adb09f7ba43c4e99a2b0))
* gitignore the entire .obsidian/ directory — regenerable cache, never tracked ([c537dde](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/c537dde27165b770b4315b7566f8d58085ece99b))
* local dev marketplace renamed to claude-wiki-pages-local + install docs ([bdfd00c](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/bdfd00c3b623017251c9ff9eb2bd719fb0e1d74b))
* record Phase-3 delivered/deferred items in team BACKLOG ([a42997c](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/a42997ca4b3d3a5dc81425e233bd168a81dc6c4d))
* remove marketplace.json (must not ship own marketplace — listing via odere-pro registry) ([308fe67](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/308fe67bac991bad7fe10f777bb73418d7e08977))
* rename to claude-wiki-pages-plugin; remove SPEC.md, repoint contracts to living docs ([797f7ed](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/797f7edf79d93bb15c1b274916311aa0a80bf7b7))
* stand up wiki-dev delivery team apparatus + agentic-brain roadmap ([59bb499](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/59bb499afe2a46bbcee519696bd3ce904db754e9))
* track calibration-audit-parallel workflow ([453e44a](https://github.com/odere-pro/claude-wiki-pages-plugin/commit/453e44af240f61023fb80eb10ccb4d83e69c9582))

## [Unreleased]

### Added

- **Folder notes — schema version 3 (ADR-0022).** The per-folder wiki index is now a **folder note** named exactly after its folder (`wiki/<topic>/<topic>.md`, `type: index`) instead of `_index.md`, so index nodes render under their topic's name in Obsidian's graph instead of as identical `_index` blobs; the root MOC stays `wiki/index.md`. The engine accepts both names indefinitely — a remaining `_index.md` in a v3 vault is a verify WARN `legacy-index-filename` (remediation: `engine.sh migrate --write`), never an error. `migrate` gains a v2→v3 `rename-index` action: rename each `_index.md` to its folder-note name and rewrite the `[[…/_index]]` wikilinks that pointed at it (name conflict ⇒ report + skip; idempotent; git-checkpointed).
- **Wikilink hierarchy codification (ADR-0022).** `parent:`, `children:`, and `child_indexes:` are now normatively REQUIRED to be quoted `"[[wikilink]]"` values — a plain title string produces no graph edge and is a lint finding (the same class as plain-string `sources`). Root `wiki/index.md` `child_indexes` entries become filename links to the folder notes (`"[[agents]]"`), so the root MOC's edges land on real nodes.
- **Graph color groups: topics → specials, plus a headless fallback (ADR-0022, amended by ADR-0023).** The white `file:_index` catch-all group is dropped (folder notes made it meaningless); the canonical order is per-topic `path:wiki/<topic>` groups, then `_sources` gray + `_synthesis` yellow. The `obsidian-graph-colors` skill gains a documented HEADLESS FALLBACK: when `obsidian eval` is unavailable, write `.obsidian/graph.json` directly, touching only `colorGroups`/`collapse-color-groups` — with the documented trade-off that a running Obsidian can clobber direct writes (restart required).
- **Wiki-only graph (ADR-0023).** The Obsidian experience shows only generated wiki pages: `raw/`, `_templates/`, and `_proposed/` are excluded from Obsidian's index via Excluded files (`.obsidian/app.json` → `userIgnoreFilters`), written by the `obsidian-graph-colors` skill and asserted idempotently by the polish agent (merge-only — user entries are never removed). The ADR-0022 layer pass (`path:raw` green, `path:wiki` blue, `path:_templates` orange) is dropped before release — color groups query `path:wiki/...` exclusively. Graph filters and color groups are declared **regenerable cache**: delete `.obsidian/graph.json` and re-run `obsidian-graph-colors` (or polish) to rebuild scaffold, topic groups, specials, and exclusions deterministically.
- **`.obsidian/` is fully gitignored (ADR-0023).** The whole Obsidian config directory is now treated as regenerable cache and is no longer tracked or shipped pre-built — this supersedes the earlier mechanism that shipped `.obsidian/graph.json` (and, briefly, `app.json`) tracked in `skills/init/template/` and `docs/vault-example/`. New vaults get their initial filters, wiki-only exclusions, and topic colors generated on the first `obsidian-graph-colors` / polish run rather than copied from a tracked scaffold.
- **`## Sources` grounding contract on query answers (ADR-0022).** Every analyst/query answer now ends with a Sources section — numbered, research-paper style — citing each consulted wiki page as a `[[wikilink]]` plus the raw source file path(s) from that page's `sources:` frontmatter, so the answer's evidence is auditable in one place.

- **`snapshot` engine verb + wrapper — every LLM write phase is git-bounded.** The planned `checkpoint` verb shipped as `snapshot`: `snapshot pre` checkpoints the vault under `gitCheckpoint.mode`, `snapshot post` commits whatever a write phase wrote (clean vault → skip; never an empty commit; always exit 0 — reports, never gates). New `scripts/snapshot.sh` is the single agent-facing entry with an inline-git fallback when Bun is absent. The ingest, curator, and polish agents now call it around their write phases.
- **SubagentStop commit backstop.** New `scripts/subagent-commit-gate.sh` (last in the `SubagentStop` chain): after a write-path agent returns, any vault changes left uncommitted are committed as one labelled backstop commit — no LLM write escapes git coverage, even on degraded paths (it creates the repo when coverage is missing). Pathspec-scoped; honors `gitCheckpoint.mode=off`; never blocks.
- **`gitCheckpoint.mode` is finally consumed.** `heal`, `migrate`, `propose`, and `snapshot` route through the new `applyCheckpointMode` helper: `off` skips all git ops, `branch`/`both` pin a `cwp/checkpoint/<opId>` rollback branch.
- **Wired sources — ingest the host project's docs.** New `scripts/wire-source.sh add` registers a git work tree (typically the project root) as a **docs-only** ingest source (README, `*.md`, `docs/`, ADRs, RFCs — never source code; the vault itself auto-excluded). The init wizard offers wiring as Step 3c. Records live in `.claude/claude-wiki-pages/settings.json` (`wired_sources`, with new `wired_read`/`wired_add`/`wired_set_synced` helpers in `resolve-vault.sh`).
- **Commit-hash paper trace in `wiki/log.md`.** Every git-bounded operation now records its rollback anchor in the operations log: `heal`/`migrate`/`propose` log their checkpoint SHA, `snapshot post` and the SubagentStop backstop log the pre-state SHA — the entry lands inside the operation's own commit (a commit cannot contain its own SHA; `git log -- wiki/log.md` recovers it).
- **Initial Obsidian graph filters.** New vaults get a curated `.obsidian/graph.json` filter set — Tags off, Attachments off, Existing files only on, Orphans on — generated by the `obsidian-graph-colors` skill as the minimum scaffold the polish agent creates when `graph.json` is absent. (The config is gitignored regenerable cache — see the ADR-0023 entry above — not shipped tracked.)
- **Local dev marketplace `claude-wiki-pages-local`.** `.claude-plugin/marketplace.json` is back (it was removed in favor of the registry listing), under a deliberately different marketplace name so adding both the published registry and a local clone never collides. Fixes the documented local-clone install flow.
- **`/claude-wiki-pages:sync` skill + `scripts/sync-source.sh`.** Manual sync pulls upstream docs changes (git diff vs `lastSyncedCommit`, glob-filtered) into `raw/wired/<name>/` as immutable versioned snapshots (`<stem>--<date>-<sha8>`, sha256-12 content dedup, never overwrites), marks superseded `_sources/` notes with additive `superseded_by` frontmatter, and hands off to the normal ingest pipeline. `backlog` gains an informational `wiredChanges` field and the heartbeat prints a `SYNC:` notice — recommendation only, no auto-writes.
- **Enforced local-model allow-list + full 6-model evaluation.** The engine now gates which local models it will run: `APPROVED_LOCAL_MODELS` in `src/data/config/config.ts` is the single source of truth, and `config` (every subcommand) computes `localModelErrors` + exits 1 fail-closed when `localModel.enabled` names an unproven model — a teaching message points at the eval path to add one. All six pulled Ollama models were measured on 0.30.7 (qwen3-coder:30b, qwen3-vl:30b, qwen3.5:27b, gemma4:31b, gemma4:26b, gpt-oss:20b); **only `qwen3-coder:30b` passed**, so it is the sole allow-listed model. New [`docs/local-models.md`](docs/local-models.md) documents the tested-and-rejected models and why each failed (mostly dedup/page-set and schema discipline; only gpt-oss:20b fabricated). The `draft` skill now refuses to draft with an unapproved model.
- **`--retries` exponential backoff** on `eval-produce-ollama.sh` / `eval-compare-ollama.sh`: each retry doubles the chat timeout (`stream:false` makes a slow model indistinguishable from a hung one), absorbing the 27–31B models' long generations.
- **Ollama produce step + first measured quality-gate pass (ADR-0017).** New `scripts/eval-produce-ollama.sh` (model-specific produce step for the ADR-0011 apparatus: schema-table-sourced prompt, deterministic `/api/chat` options, fail-closed `===FILE:` block parser) and `scripts/eval-compare-ollama.sh` (models × cases matrix report). The first measured run (qwen3.5:27b, qwen3-coder:30b, gpt-oss:20b, gemma4:26b on an M1 Pro) exposed that the strict set-diff fabrication floor conflated *invented claims* with *over-citation* (extra verbatim input sentences beyond gold's selection); **ADR-0017** amends the scorer: with `--input <raw-input.md>`, extra claim pairs partition into `over_citation` (verbatim in input, reported) vs `fabricated` (the unchanged zero floor). Under the amended definition **`ollama:qwen3-coder:30b` passes both golden-set cases** (schema 1.0, fidelity 1.0, fields 0.93, dedup 1.0, fabricated 0) — the `ingest-extract` tier is unlocked for that model with committed, `--verify-artifact`-reproducible evidence at `tests/eval/runs/ingest-extract/qwen3-coder-30b/`. The other models failed (gpt-oss:20b broadly, gemma4:26b off-task, qwen3.5:27b timeout); every other tier stays Claude-first.
- **Tier 4 prompt-injection corpus replay (deterministic).** New checked-in corpus `tests/fixtures/adversarial/*.json` (8 cases: out-of-vault `.ssh`/`.env` writes, edits to existing `raw/` sources, frontmatter spoofing, markdown-link smuggling — plus two `allow-*` cases pinning the structural/semantic boundary) and driver `tests/adversarial/replay-corpus.sh`, which replays each payload against the real PreToolUse hook chain in `hooks.json` order. No LLM or API key required; the `adversarial.yml` corpus-replay job now runs it live instead of printing `[SKIP]`. Self-tested by `tests/scripts/replay-corpus.bats`.
- **jq pre-flight check.** `session-start.sh` now prints a NOTICE when `jq` is missing (the JSON-parsing hooks fail open without it — writes pass through unchecked), mirroring the existing Bun notice; `doctor.sh` treats a missing `jq` as a hard FAIL (exit 1, same class as a missing `git`).
- **Doctor D11 — Obsidian link parity (advisory).** The engine doctor gains an eleventh check: ask a running Obsidian for `app.metadataCache.unresolvedLinks` and warn (with a `/claude-wiki-pages:lint` hint) when dangling links exist — a second, metadata-cache-backed opinion on link health. Strictly advisory: CLI absent, vault not open, or unparseable output all `skip`, never `fail`; the check shells out through a new injectable `DoctorOptions.runner` (default `spawnSync`, 5 s timeout) so it stays pure in tests. The bash twin `scripts/doctor.sh` prints the same finding as a yellow NOTE with the exit-code contract (0–5) untouched.
- **Scaffolding ablation — what the plugin buys, measured (ADR-0020).** New `scripts/eval-produce-baseline.sh` (the control arm: generic "extract the knowledge into notes" / "answer from these notes" prompts; sources the plugin arm's parser and network plumbing so the two arms differ only in prompts) and `scripts/eval-ablation-report.sh` (arms × tiers × cases matrix; a report, never a gate — baseline FAIL is the measurement; scorer-unscorable cells render labeled, never as numbers). Method: ablate the contract (schema, provenance, citation rules), keep the transport (delimiter protocols). Measured on `qwen3-coder:30b`: the plugin arm passes both tiers; the baseline arm collapses on schema/fidelity (ingest) and drifts off the citation protocol entirely on one query case — committed evidence under `tests/eval/runs/*/qwen3-coder-30b-baseline/`, plus a supplementary non-reproducible Claude-arm run under `tests/eval/runs/*/claude-arm/`. New planted fixture `candidate-baseline-shape` pins that a frontmatter-less candidate scores rc 1 (measured FAIL), never rc 2 (unscorable).
- **Ablation smoke + the measured comparison matrix.** New `tests/smoke/ablation-smoke.sh` (opt-in, wired into the `eval` target): one golden case through both ablation arms with the configured local model, asserting the plugin arm >= the baseline arm on `schema_validity` and `claim_source_fidelity` — self-skips without `CLAUDE_WIKI_PAGES_EVAL_MODEL` + a live Ollama endpoint, so CI never runs it. `docs/features.md` gains "Measured: with and without the plugin": the arms × metrics numbers tables (qwen3-coder:30b canonical + the supplementary Claude arm, every cell linked to its committed run artifact) and the "What the scaffolding buys" capability × mechanism × number map.
- **Obsidian-visible vault name for new vaults.** Obsidian displays the vault's folder name, so until now every project's vault read as a generic "vault". The init wizard now defaults a NEW vault to `docs/<root-slug>-vault` (project folder `my-project/` → vault visible as **my-project-vault**), via the new sourceable `slugify` + `default_new_vault_path` helpers in `scripts/resolve-vault.sh`; the multi-vault registry picks the same name up automatically (`vault_add` defaults to the path basename). Back-compat untouched: the read-side tier-4 default stays `docs/vault`, an existing `docs/vault` keeps winning, and no existing vault is ever renamed.
- **Maintenance-trigger regression pin.** New `session-start.bats` cases pin the `session-start.sh` → `heartbeat.sh` wiring (CATCHUP surfaces when `maintenance.enabled` and a backlog exists; silent by default), so the autonomous-maintenance trigger cannot be dropped silently.
- **Backlink-safe renames via the Obsidian CLI.** New `scripts/obsidian-rename.sh` wraps `app.fileManager.renameFile()` — Obsidian updates every `[[wikilink]]` backlink from its metadata cache, eliminating the LLM-error-prone manual rewrite on title-collision renames. Strict degradation contract: exit 0 only after an on-disk post-condition check (new path exists, old path gone); exit 3 + `[skip] cli-rename: …` when the CLI is absent or the rename didn't take effect (caller falls back to `git mv` + manual rewrite); exit 2 on usage errors (path traversal, non-`wiki/` targets, `--to` collisions). The curator (Phase 4) and ingest restructure (Step 3.3) now try this path first; frontmatter (`parent:`/`path:`) and index updates stay manual in both branches. CLI writes bypass the PreToolUse hooks, so the existing post-phase re-verify is documented as mandatory.

- **Schema version 2 (additive).** New page types `topic` (narrative topic landing page), `project` (goal/initiative with a `project_status` lifecycle), and `manifest` (source-processed tracker at `wiki/_sources/manifest.md`); new templates `topic.md` and `project.md`; optional claim-level provenance fields `source_quotes` and `derived` on any typed page. Version 2 is a strict superset of v1 — existing v1 vaults stay valid. `validate-frontmatter.sh`, `verify-ingest.sh`, and the engine `verify` accept both versions; `plugin.json` now declares `supported_schema_versions: [1, 2]`.
- **`migrate` engine command.** `claude-wiki-pages migrate [--write]` upgrades a vault v1 → v2 in place: bumps `schema_version`, writes the new templates when absent, and generates the source manifest — additive, idempotent, and git-checkpointed (`git revert <checkpoint>` rolls it back). Dry-run by default.
- **`search` engine command + skill.** Deterministic keyword retrieval over `wiki/` (title/alias > tag > body, ties by title) returning `[[wikilink]]`-ready hits with `--json`. New `/claude-wiki-pages:search` skill; wired into the analyst agent's search strategy. GraphRAG (`search --graph`) documented as the next phase.
- **Vault firewall.** New PreToolUse hook `scripts/firewall.sh` (first in the Write/Edit chain) + engine `firewall check` command confine agent writes to the resolved vault plus `firewall.allowPaths`, minus `firewall.denyPaths` (default-deny `**/.ssh/**`, `**/.aws/**`, `**/.env`, `**/.git/config`). Modes `enforce`/`warn`/`off` via the new `firewall` config block. New `obsidian-vault` guard skill teaches agents to scope the Obsidian CLI; `gate-11-firewall-parity.sh` pins the bash hook to the engine.
- **Engine log entries.** `heal` and `migrate` now record their operation in `wiki/log.md` via the new `src/core/log.ts` helper.
- **Autonomous maintenance (opt-in).** New `backlog` engine command (pending raw sources + overdue lint, manifest-backed), `scripts/heartbeat.sh` (a SessionStart catch-up recommendation — recommends only, never mutates), and `claude-wiki-pages-maintenance-agent` (runs ingest → curator → polish → lint in one git-checkpointed, budgeted pass). The orchestrator routes to it when `maintenance.enabled` and a backlog exists. New `maintenance` config block (all off/bounded by default). Guide: [`docs/automation.md`](docs/automation.md).
- **Local-model drafting + human review (opt-in).** New `vault/_proposed/` staging area (sibling of `wiki/`, so drafts are outside every wiki-scoped check until promoted); `propose` engine command (`review`/`approve`/`reject`, git-checkpointed); `/claude-wiki-pages:review` (the promote/reject gate) and `/claude-wiki-pages:draft` (Ollama/LM Studio drafting into `_proposed/`) skills; `localModel` config block (off by default — Claude Code stays primary); optional `proposed_by` schema field. The orchestrator routes to review when drafts are pending.
- **Opt-in git push.** New `gitCheckpoint.push` (`off` default / `auto`) pushes to the configured upstream after each git-checkpointed engine op (`heal`, `migrate`, `propose`). Best-effort — a push failure never blocks the op.
- **Layer graph coloring.** The `obsidian-graph-colors` skill + polish agent now apply an optional layer pass (raw→green, wiki→blue, schema→orange), ordered after per-topic colors so topic colors still win first-match.
- **Calibration-flow fixtures.** A golden fixture set under `.claude/fixtures/` covering all five wiki flows (onboarding, ingest, curate, polish, analyst) with known-good and known-defect cases — `input/` vault, `expected.md` oracle, and recorded `actual*.tsv` traces — for behavioural regression scoring of the orchestrator and specialists.

### Changed

- **Calibration audit remediation.** Slimmed the analyst, curator, and ingest agent bodies under 200 lines by extracting their per-mode / per-phase procedures into three new agent-teaching skills — `analyst-modes`, `curator-fixes`, `ingest-pipeline` (skill count 16 → 19; agent-teaching skills 2 → 5). Marked the side-effecting `ingest`/`fix`/`index` skills `disable-model-invocation: true` (slash-command-only). Reworded the `CLAUDE.md` glossary / `validate-docs` rules to reference their CI Tier 0 enforcement. `.gitignore` now ignores `CLAUDE.local.md` and `.claude/calibration/`.
- **Calibrate skill-invocation guards + enforcement hooks.** Tightened the skill-invocation guards and wired the matching enforcement hooks so side-effecting flows stay slash-command-gated.
- **Repository renamed to `claude-wiki-pages-plugin`.** The GitHub repo (and Pages site) moved to `odere-pro/claude-wiki-pages-plugin`; the **plugin id stays `claude-wiki-pages`** (the `-plugin` suffix marks the repo, not the plugin). All `github.com/odere-pro/…` and `odere-pro.github.io/…` URLs, schema `$id`s, and the `/plugin marketplace add` target now carry the `-plugin` suffix; the slash namespace `/claude-wiki-pages:`, `/plugin install claude-wiki-pages`, and the npm package `@odere-pro/claude-wiki-pages` are unchanged.
- **Naming alignment + gate.** Replaced the retired skill name `llm-wiki` with `init` in the README and playbooks (the onboarding/scaffold skill was renamed in `1.0.0`), and hardened `scripts/validate-docs.sh` with a targeted check that flags `` `llm-wiki` `` used as a skill while still allowing the kept `llm-wiki-pattern` and `docs/llm-wiki/`.

### Fixed

- **`resolve-vault.sh` degrades cleanly on a minimal `PATH`.** Vault resolution no longer breaks when invoked with a degraded `PATH` (e.g. from hooks or CI environments that don't inherit the user's shell profile).
- **Vault git ops are pathspec-scoped.** `git add -A` / commits in `src/core/git.ts` (and the bash twins) now carry `-- .`, so a vault inheriting the parent project repo never stages or swallows the user's unrelated dirty/staged files; `isClean` likewise ignores dirt outside the vault. Doctor D05 now names the covering parent repo when the vault is nested.
- **README hook count.** The "What's inside" table now reports the real wiring — 15 hook scripts across 7 events, including the previously undocumented `Stop` and `SessionEnd` (session-memory persistence) — and links the multi-vault registry guide.
- **Dangling `marketplace.json` in release-please config.** Removed the reference to the deleted `.claude-plugin/marketplace.json` from `extra-files`, which would have broken the first release PR.
- **CD workflow failures.** Repaired three red workflows on `main` so continuous delivery is green again.
- **Firewall test isolation.** `firewall.test.ts` now uses neutral absolute paths (gate-06), so the suite no longer depends on a machine-specific home directory.
- **Doc/style gate scope.** `.claude/fixtures/` is excluded from the markdownlint, lychee, and glossary gates — fixture vaults intentionally contain defect cases that must not fail the doc gates.

### Removed

- **`SPEC.md`.** The consolidated specification has been retired; its contracts now live in the documents that own them — `docs/architecture.md` (four-layer model, command and agent contracts), `docs/vault-example/CLAUDE.md` (schema), `docs/GLOSSARY.md` (canonical terms), `docs/security.md` (threat model), and `tests/README.md` (test tiers). All references across the README, `CLAUDE.md`, agent/command/skill footers, and docs were repointed; the `docs/SPECIFICATION.md` stub now redirects to those living docs. Historical mentions in `CHANGELOG.md`, `docs/adr/*`, and the migration docs are preserved.

### Glossary changes

- Added (minor): **snapshot**, **commit backstop**, **backlink-safe rename**, **link parity** (Architecture terms); **sync** (User-facing verbs); **wired source** (Vault management terms); **superseded** (Ingest and memory terms); **scaffolding ablation**, **plugin arm**, **baseline arm** (Capability and model terms); **folder note** (Schema terms); **Sources section** (Retrieval terms).
- Changed: **schema version** (current: 3), **migrate** (v1 → v2 → v3, `rename-index`), **MOC** / **topic page** (per-folder MOC is the folder note), **layer coloring** (ordered after topics and specials; `path:_templates` orange) — per ADR-0022.

## [1.0.0] — 2026-06-01

Rebrand to **`claude-wiki-pages`** and the first cut of the deterministic **Bun engine**. Breaking: the plugin id, slash namespace, agent names, skill names, settings path, and env vars all change.

### Added

- **Deterministic engine (`@odere-pro/claude-wiki-pages`).** A Bun/TypeScript CLI under `src/` (bins `claude-wiki-pages` / `wiki-pages`) that the plugin calls for anything that must be exact. First command: `verify`, a faithful port of `scripts/verify-ingest.sh` CHECK 0–3 emitting structured `--json`. A parity test pins it to the bash verifier (equal error/warn sets on clean and dirty vaults). Tooling mirrors `claude-agentline`: `package.json`, `tsconfig.json`, `bunfig.toml`, prettier, plus staged `.eslintrc.cjs`/`knip.json`. 24 `bun test` cases.
- **Git-checkpointed self-heal.** `engine fix`/`heal`: after ingest the engine writes a checkpoint commit, then loops verify → fix → re-verify and commits the result. Fully automatic — no approval prompts; rollback is `git revert`. The curator and ingest agents are rewired to this model (approval gates removed).
- **Onboarding + agent-teaching skills.** New `onboarding` skill + `claude-wiki-pages-onboarding-agent` + `/claude-wiki-pages:onboarding` (guided first run: health → scaffold → ingest → first cited answer). Two Software-3.0 teaching skills — `engine-api` (the engine's `--json` tool contract) and `maintain-contract` (the safe ingest/retrieve/maintain ordering) — so any agent can drive the wiki correctly.
- **`/claude-wiki-pages:doctor`** (renamed from `wiki-doctor`) backed by the engine `doctor` — ten checks D01–D10 with `--fix` (hook perms, git init, settings migration), `--json`, and `--strict` (exit 3 on warn/fail).
- **Config system.** `engine config` (show / validate / path): defaults ← user (`~/.config/claude-wiki-pages/config.json`) ← project (`.claude/claude-wiki-pages.json`) ← `CLAUDE_WIKI_PAGES_*` env overrides, validated against `schemas/config.schema.json`.
- **Quality gates + CI.** `tests/gates/gate-NN-*.sh` + `run-all.sh` (engine tests, typecheck, shellcheck, glossary, verify↔bash parity, no-absolute-paths, config-schema, prettier, npm-pack); a CI `gates` job runs them on every PR.
- **GitHub Pages landing.** `site/` (framework-free, accessible, with the mermaid "how it works" diagram) deployed by `.github/workflows/pages.yml`; excluded from the npm tarball.
- **`docs/migration-1.0.md`** — search-and-replace map from the old identifiers, plus what does NOT change (vault schema/content).

### Changed (breaking)

- **Plugin renamed `llm-wiki-stack` → `claude-wiki-pages`** across the manifest, marketplace, slash namespace (`/claude-wiki-pages:`), settings path (`.claude/claude-wiki-pages/settings.json`, auto-migrated on `SessionStart`), and hook log prefixes.
- **Agents** `llm-wiki-stack-{orchestrator,ingest,curator,analyst,polish}-agent` → `claude-wiki-pages-…-agent`.
- **Skills** to bare short verbs (the namespace already scopes them): `llm-wiki`→`init`, `llm-wiki-ingest`→`ingest`, `-query`→`query`, `-lint`→`lint`, `-fix`→`fix`, `-status`→`status`, `-synthesize`→`synthesize`, `-index`→`index`, `-markdown`→`markdown`. The `obsidian-*` skills are unchanged.
- **Env vars** `LLM_WIKI_*` → `CLAUDE_WIKI_PAGES_*`. `LLM_WIKI_VAULT` is still read as a deprecated fallback for one minor.
- **`docs/VOCABULARY.md` → `docs/GLOSSARY.md`** (matches the `claude-agentline` convention); `validate-docs.sh` is now the "glossary gate" and bans the retired `1.0.0` identifiers outside `CHANGELOG.md`, `docs/adr/*`, and the migration docs.

## [0.2.0] — 2026-05-02

Top-level orchestrator and four-layer DX retrofit. Single `/llm-wiki-stack:wiki` command replaces the per-skill chain users had to remember; vault state now drives dispatch automatically. ADRs in `docs/adr/` capture the rationale; the migration map is in `docs/llm-wiki/migration-0.2.md`.

### Added

- **`commands/wiki.md`** (`/llm-wiki-stack:wiki`) — top-level entry point. Probes vault state and dispatches to the right specialist (init wizard, ingest, curator, or analyst). One verb instead of a remembered chain.
- **`commands/wiki-doctor.md`** (`/llm-wiki-stack:wiki-doctor`) — environment health check. Wraps the new `scripts/doctor.sh` with exit codes 0–5 (vault path, schema, raw/wiki layout, hook executability, vocab drift). Tier 1 Bats coverage in `tests/scripts/doctor.bats`.
- **`agents/llm-wiki-stack-orchestrator-agent.md`** — Layer 4 dispatcher. `user-invocable: true`. Owns vault state probing; specialists trust its payload and never re-probe.
- **`agents/llm-wiki-stack-polish-agent.md`** — tail-of-write specialist. Centralises graph colors, vault-MOC refresh, and per-folder `_index.md` consistency. Idempotent; runs after every successful ingest or curator pass. Removes the "I have to switch to Obsidian and refresh the graph" step. See [`docs/llm-wiki/obsidian-experience.md`](docs/llm-wiki/obsidian-experience.md).
- **Repository governance parity.** Root `SPEC.md` (moved from `docs/SPECIFICATION.md`), root `SECURITY.md`, root `SUPPORT.md`, `docs/adr/` with three seed ADRs, `docs/plan/` with the retrofit plan.
- **`NEXT_STEP:` hand-off line** in the `llm-wiki` wizard skill — the orchestrator parses it to chain directly into ingest when `raw/` has pending files.

### Changed

- **Vocabulary changes — agent rename.** Three Layer 3 agents renamed to the `{plugin-name}-{role}-agent` convention. Hard rename, no shims; pre-1.0 plugin, low back-compat cost. See `docs/adr/ADR-0002-agent-naming-convention.md` for the rationale.
  - `llm-wiki-ingest-pipeline` → `llm-wiki-stack-ingest-agent`
  - `llm-wiki-lint-fix` → `llm-wiki-stack-curator-agent` (verb upgrade — the agent already gates judgment fixes behind plans, which is curation, not just linting)
  - `llm-wiki-analyst` → `llm-wiki-stack-analyst-agent`
- **`/SPEC.md` location.** Specification moved from `docs/SPECIFICATION.md` to root `/SPEC.md` for parity with standard plugin layout. A one-line stub remains at the old path through `0.2.x`; removed in `0.3.0`.
- **Default verb.** `/llm-wiki-stack:wiki` replaces the old per-skill chain (the pipeline agent, formerly named `llm-wiki-ingest-pipeline`, now `llm-wiki-stack-ingest-agent`) as the default user verb. The pipeline agent remains user-invocable for power users and scripting.
- **`scripts/validate-docs.sh`** — extends the namespace resolver to recognize `commands/<name>.md` (in addition to `skills/<name>/` and `agents/<name>.md`); adds the three retired agent names to the banned-string list (allowlisted in CHANGELOG, ADRs, plan, and migration doc).
- **Documentation surface.** README quick-start, `docs/architecture.md`, `docs/getting-started.md`, `docs/security.md`, `SECURITY.md` updated to use the new agent names and the `/llm-wiki-stack:wiki` entry point.

### Documentation

- **AWS-Skill-Builder-style playbooks.** New learning path under `docs/playbooks/`: `index.md`, `200-foundational.md` (install → first wiki entry, ~30 min), `300-associate.md` (orchestrator decision tree, hooks, schema, multi-vault, ~2 hours), `500-expert.md` (skill authoring, hook authoring, test harness, fork, CI, ~half day). Orthogonal to the existing `docs/llm-wiki/01-07*.md` task references.
- **Spec alignment.** `SPEC.md` §5/§6/§11 corrected — agent count and orchestrator dispatch wording now match the five-agent retrofit. `docs/VOCABULARY.md` Layer 3 row corrected from "Three" to "Five".
- **DX cleanup.** README version badge bumped to 0.2.0; skill count corrected (12 → 13); `llm-wiki-markdown` added to the Layer 2 list. Stale `/llm-wiki-stack:llm-wiki-stack-ingest-agent` references in `docs/llm-wiki/index.md`, `docs/llm-wiki/02-create-new-knowledge-base.md`, `docs/llm-wiki/03-update-existing.md`, and `docs/vault-example/wiki/tools/llm-wiki-stack.md` reframed — `/llm-wiki-stack:wiki` is the primary entry; the agent-direct form is now documented as a power-user bypass.
- **Risk and gap report.** New `docs/risk-report-0.2.0.md` tracking deferred work (orchestrator/polish test coverage, Tier 4 corpus replay, edge cases in `resolve-vault.sh` / `session-start.sh` / `prompt-guard.sh`) so the audit findings have a single follow-up surface.

### Migration

Users with scripts pinned to the old agent names: see `docs/llm-wiki/migration-0.2.md` for the rename table and search-and-replace guidance. Vaults themselves are unchanged — `schema_version: 1` continues to be supported; only plugin-side identifiers moved.

## [Earlier — pre-0.2.0]

### Changed

- **Skill rename (clean-room rewrite).** The eight adapted skills have been
  retired and replaced with fresh, independently-authored implementations
  under new names:
  - `second-brain` → `llm-wiki` (onboarding entry point)
  - `second-brain-ingest` → `llm-wiki-ingest`
  - `second-brain-query` → `llm-wiki-query`
  - `second-brain-lint` → `llm-wiki-lint`
  - `second-brain-fix` → `llm-wiki-fix`
  - `second-brain-status` → `llm-wiki-status`
  - `vault-synthesize` → `llm-wiki-synthesize`
  - `vault-index` → `llm-wiki-index`

  Each new `SKILL.md` was authored from `docs/SPECIFICATION.md`,
  `docs/architecture.md`, `docs/vault-example/CLAUDE.md`, and the Karpathy LLM
  Wiki gist — the previously-adapted content was not consulted during the
  rewrite. Mechanical 5-gram Jaccard similarity between each new file and
  its predecessor is below 0.02.

- **Vocabulary.** `second-brain`, `second brain`, `vault-synthesize`, and
  `vault-index` are retired from the vocabulary and flagged by
  `scripts/validate-docs.sh` as banned strings outside `CHANGELOG.md`,
  `docs/VOCABULARY.md`, and the test surface.
- **Attribution.** `NOTICE` rewritten to credit only the Karpathy pattern
  (public design) and `kepano/obsidian-skills` (MIT, bundled unmodified).
  Prior third-party attribution for skills that have since been replaced
  by clean-room originals has been removed.
- **New file.** `THIRD_PARTY_LICENSES.md` — full license text of every
  bundled third-party component.

### Removed

- `skills/second-brain/`, `skills/second-brain-ingest/`,
  `skills/second-brain-query/`, `skills/second-brain-lint/`,
  `skills/second-brain-fix/`, `skills/second-brain-status/`,
  `skills/vault-synthesize/`, `skills/vault-index/` — replaced by the
  renamed, rewritten skills listed above.

## [0.1.0] — 2026-04-18

Initial release as a Claude Code plugin.

- **Plugin distribution.** `.claude-plugin/plugin.json` and same-repo marketplace.
- **Layer 1 — Data.** `docs/vault-example/` with authoritative schema (`docs/vault-example/CLAUDE.md`, `schema_version: 1`), five frontmatter templates, a small sticky reference vault demonstrating sources, indexes, and two topic folders.
- **Layer 2 — Skills.** 11 skills: `second-brain`, `second-brain-ingest`, `second-brain-query`, `second-brain-lint`, `second-brain-fix`, `vault-synthesize`, `vault-index`, `graph-colors`, `obsidian-markdown`, `obsidian-bases`, `obsidian-cli`.
- **Layer 3 — Agents.** 3 agents: `wiki-ingest-pipeline`, `wiki-lint-fix`, `wiki-analyst`.
- **Layer 4 — Orchestration.** 10 hook scripts wired through `hooks/hooks.json`; 4 path-scoped rules in `rules/`.
- **Docs.** `SPECIFICATION.md`, `VOCABULARY.md`, `SEO.md`, `architecture.md`, `security.md`, `comparison.md`, and the user guide set in `docs/llm-wiki/`.
- **Governance.** `LICENSE` (Apache 2.0), `NOTICE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.

### Schema

`schema_version: 1`. Authoritative rules live in `docs/vault-example/CLAUDE.md`; contract summary in `docs/SPECIFICATION.md`.

### Known limitations

See `docs/security.md` — no cryptographic provenance, no hook-script sandboxing, no secret scanning on ingest, confidence scores are the LLM's opinion, topic-tree placement relies on LLM judgement.
