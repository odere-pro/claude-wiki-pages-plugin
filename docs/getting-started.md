# Getting Started

A flat list of CLI commands to go from nothing to querying a populated wiki.

## 1. Run Claude Code

```bash
cd ~/your-project
claude
```

## 2. Install the plugin

At the Claude Code prompt:

```
/plugin marketplace add odere-pro/llm-wiki-stack
/plugin install llm-wiki-stack
```

## 3. Create a new vault

```
/llm-wiki-stack:llm-wiki
```

Or pick a path:

```
/llm-wiki-stack:llm-wiki my vault is docs/vault
```

## 4. Import raw files

```
!cp ~/Downloads/*.md vault/raw/
!cp ~/Desktop/*.png vault/raw/assets/
```

## 5. Ingest + lint-fix

```
/llm-wiki-stack:llm-wiki-ingest-pipeline
```

Or lint-fix on its own, any time after the wiki is populated:

```
/llm-wiki-stack:llm-wiki-lint-fix
```

## 6. Status check

```
/llm-wiki-stack:llm-wiki-status
```

## 7. Query the wiki

```
/llm-wiki-stack:llm-wiki-query what does the wiki say about <topic>?
```

## 8. Export an answer as portable markdown

```
/llm-wiki-stack:llm-wiki-markdown what does the wiki say about <topic>?
```

Writes a portable markdown file (no `[[wikilinks]]`, no Dataview blocks) to
`vault/output/<slug>.md` so you can paste it into a PR, an email, or any
non-Obsidian doc tool.
