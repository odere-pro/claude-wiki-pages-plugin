/**
 * Canonical frontmatter skeletons for the schema-v2 page types that `migrate`
 * may write into an upgrading vault's `_templates/` directory.
 *
 * These mirror the on-disk templates in `docs/vault-example/_templates/` and
 * `skills/init/template/_templates/` (which init copies for new vaults). The
 * migrate command embeds them so it can upgrade a v1 vault without needing to
 * locate the plugin's template directory at runtime. Keep the three copies in
 * sync; the templates rule (`rules/templates.md`) is the contract.
 */

export const TOPIC_TEMPLATE = `---
title: ""
type: topic
aliases: []
parent: "[[Parent Index]]"
path: ""
summary: ""
key_pages: []
sources: []
related: []
source_quotes: []
derived: false
tags: []
created:
updated:
update_count: 1
status: active
confidence: 0.8
---

# {{title}}

> [!summary]
> {{summary}}

## Overview

## Key Pages

## Open Questions
`;

export const PROJECT_TEMPLATE = `---
title: ""
type: project
aliases: []
parent: "[[Parent Index]]"
path: ""
objective: ""
project_status: planned
members: []
sources: []
related: []
source_quotes: []
derived: false
tags: []
created:
updated:
update_count: 1
status: active
confidence: 0.8
---

# {{title}}

> [!summary]
> {{objective}}

## Objective

## Members

## Status & Milestones

## Related
`;
