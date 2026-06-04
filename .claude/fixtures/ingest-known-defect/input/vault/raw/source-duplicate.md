# Claude Code — Release Notes

Claude Code is Anthropic's command-line coding assistant. This document records a few
additional facts about the tool that complement the existing getting-started guide.

## What's New

- Claude Code now supports a plugin marketplace for installing extensions.
- Sessions can run hooks at lifecycle points to enforce project rules.
- The `claude` binary reports its build with `claude --version`.

## Usage

Run `claude` inside a project directory to start an interactive session. Install plugins
with `/plugin marketplace add <source>` followed by `/plugin install <name>`.

## Notes

These details describe the same Claude Code product already tracked in the wiki — they
extend the existing entity rather than introduce a new one.
