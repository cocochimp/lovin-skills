# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

This repository (`lovin-skills`) is a collection of Claude Code agent skills. Each skill is a self-contained prompt-driven capability that extends Claude Code's behavior when triggered by specific user phrases or contexts.

## Repository Structure

Skills live in two locations:

- `.claude/skills/` — Installed/active skills loaded by Claude Code at runtime. Each skill has a `SKILL.md` (the contract) and optional supporting files (references, scripts, assets, templates).
- Root-level directories (`yuque-weekly-report/`, `skill-scenario-generator/`) — Standalone skill definitions not yet installed into `.claude/skills/`.

`skills-lock.json` tracks externally sourced skills (e.g., from `vercel-labs/skills`) with content hashes for integrity.

## Skill Anatomy

Every skill is defined by a `SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: "Trigger description — when/how the skill activates"
---
```

The body contains the skill's prompt: workflow steps, constraints, output format, and examples. Supporting files go in subdirectories:
- `references/` — domain knowledge, prompt templates, cheat sheets
- `scripts/` — executable tooling (Python, JS) the skill invokes
- `assets/` — templates, images, static resources
- `templates/` — output format templates

## Installed Skills

- `ljg-card` — Content-to-PNG visual renderer with 7 output modes (long card, infograph, multi-card, sketchnote, comic, whiteboard, big-fonts). Uses Playwright (`capture.js`) to render HTML templates.
- `ljg-roundtable` — Multi-perspective structured debate framework with moderator.
- `ljg-writes` — Chinese critical writing engine (Org-mode output, 1000-1500 chars).
- `brainstorming` — Pre-implementation design exploration. Enforces a design-first gate before any creative/building work.
- `daisy-financial-research` — Autonomous stock/sector research with Tushare data, DCF valuation, screening, and multi-agent debate. Has its own `CLAUDE.md`, Python scripts, and test suite. See `.claude/skills/daisy-financial-research/CLAUDE.md` for its internal conventions.

## Conventions

- Skills are prompt-first: the `SKILL.md` is the canonical user-facing contract. All other files support it.
- Trigger phrases are defined in the `description` frontmatter field — this is how Claude Code decides when to activate a skill.
- Skills that use Python scripts follow an agent-native CLI pattern with `--format json|table`, `--schema`, `--dry-run`, and structured exit codes.
- Output paths default to `~/Downloads/` (visual skills) or `./financial-research/` (data skills) unless overridden.
