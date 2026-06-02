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
/plugin marketplace add odere-pro/claude-wiki-pages
/plugin install claude-wiki-pages
```

## 3. Create a new vault

```
/claude-wiki-pages:init
```

Or pick a path:

```
/claude-wiki-pages:init my vault is docs/vault
```

## 4. Import raw files

```
!cp ~/Downloads/*.md vault/raw/
!cp ~/Desktop/*.png vault/raw/assets/
```

## 5. Run the wiki

The recommended entry. Probes vault state and chains the right next step automatically — ingest if `raw/` has new files, curator if lint drift is pending, analyst if the prompt is a question.

```
/claude-wiki-pages:wiki
```

Power users can still call individual specialists directly:

```
/claude-wiki-pages:claude-wiki-pages-ingest-agent
/claude-wiki-pages:claude-wiki-pages-curator-agent
```

## 6. Status check

```
/claude-wiki-pages:status
```

## 7. Query the wiki

```
/claude-wiki-pages:query what does the wiki say about <topic>?
```

## 8. Export an answer as portable markdown

```
/claude-wiki-pages:markdown what does the wiki say about <topic>?
```

Writes a portable markdown file (no `[[wikilinks]]`, no Dataview blocks) to
`vault/output/<slug>.md` so you can paste it into a PR, an email, or any
non-Obsidian doc tool.
