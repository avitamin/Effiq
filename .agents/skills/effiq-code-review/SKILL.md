---
name: effiq-code-review
description: "Run or guide factual read-only code review from this repository using Codex CLI. Use when the user asks to review local changes, branch changes, a commit, or wants a deterministic Codex review artifact."
---

# Effiq Code Review

## Purpose

Use this skill to perform a factual, evidence-first code review of repository changes. It is for actual review findings, not review queue prioritization.

Primary objective: find actionable bugs, regressions, security/config leaks, missing validation, and meaningful test gaps in the reviewed diff, then produce a concise Markdown report.

## Guardrails

- Read-only. Do not edit files, stage, commit, approve, reject, comment, transition Jira issues, or merge anything.
- Do not invent findings. Every finding must be backed by diff/source evidence.
- Do not claim tests or commands ran unless they actually ran in this review session.
- Do not include style nits, preferences, or speculative concerns unless they create a concrete behavioral risk.
- Keep `effiq-review-triage` separate: that skill ranks review work; this skill reviews code.

## Review Scope

Prefer the deterministic runner when the user wants a repeatable local artifact:

```bash
.agents/skills/effiq-code-review/scripts/run-codex-review.sh
```

Default target is both AG CMS repositories. The runner launches Codex with the selected repository as cwd:

- `backend`: path from `--backend-path`, `EFFIQ_AG_CMS_BACKEND_PATH`, or `../agcms-laravel` relative to the Effiq Git root
- `frontend`: path from `--frontend-path`, `EFFIQ_AG_CMS_FRONTEND_PATH`, or `../ag-cms-ng` relative to the Effiq Git root
- `effiq`: `--cd` this repository
- `all`: run backend, then frontend

Default scope is branch changes against `develop` for AG CMS repositories and `main` for Effiq. Supported runner modes:

- `--repo effiq|backend|frontend|all`: choose the Codex cwd target.
- `--backend-path <path>`: override the backend AG CMS repository path.
- `--frontend-path <path>`: override the frontend AG CMS repository path.
- `--base <branch>`: review branch diff against a base branch.
- `--uncommitted`: review staged, unstaged, and untracked changes.
- `--commit <sha>`: review one commit.
- `--out <path>`: write a report file for one repo, or report directory for `--repo all`.
- `--title <title>`: pass a display title to Codex review.
- `--with-context`: add Effiq, backend, and frontend as extra read-only roots for cross-repo contract checks.
- `--dry-run`: print the command without calling Codex.

If running review manually, use the same constraints: `codex --sandbox read-only --ask-for-approval never exec review` with the chosen scope and `-o` report path.

## Branch Selection

Use the companion branch switcher when a review starts from a Jira key or branch name and the relevant AG CMS branch is not known yet:

```bash
.agents/skills/effiq-code-review/scripts/switch-review-branch.sh --query AG-60588
```

The switcher is search-first: it lists matching local and `origin/*` branches by default and changes branches only with explicit `--checkout`. It refuses real checkout when any selected repository is dirty, when a repository has no match, or when a query is ambiguous. `--repo all` targets backend then frontend only; use `--repo effiq` for this repository.

## AG CMS Context Paths

AG CMS paths are configurable and should not be recorded as machine-local absolute paths in repository docs:

- `--backend-path <path>` or `EFFIQ_AG_CMS_BACKEND_PATH`
- `--frontend-path <path>` or `EFFIQ_AG_CMS_FRONTEND_PATH`
- Defaults: `../agcms-laravel` and `../ag-cms-ng` relative to the Effiq Git root

By default Codex receives only the selected cwd target. Use `--with-context` only when a reviewed change depends on backend/frontend contracts, permission names, API shape, route behavior, or cross-repo documentation. Do not edit those repositories during review.

## Evidence To Check

Use only sources relevant to the scope:

- Git diff for the selected base, commit, or uncommitted changes.
- Nearby source/config/docs needed to prove a finding.
- Existing repo instructions: `AGENTS.md`, `README.md`, and docs under `docs/`.
- AG CMS backend/frontend sibling repos only when `--with-context` was used or the user explicitly provided that context.
- Local generated or sensitive artifacts when they appear in the diff.
- Test, lint, typecheck, or build configs only if such files exist.

## Output Contract

Write concise Markdown with:

- `Findings`: first section, ordered by severity. Each finding includes severity, file/line reference when available, concrete risk, evidence, and suggested fix direction.
- `No findings`: include this instead of `Findings` only when no actionable issue is found.
- `Evidence checked`: scope reviewed, key files inspected, commands actually run, and unavailable sources.
- `Residual risk`: test gaps, missing runtime evidence, or context that could change confidence.
- `Stopping condition`: why review is complete, or what blocked full confidence.

When no issue is found, say that clearly and still report residual risk or test gaps.

## Missing Evidence Behavior

- If a finding depends on code outside the diff, inspect the smallest nearby context needed to validate it.
- If required evidence is unavailable, report the uncertainty in `Residual risk` instead of turning it into a finding.
- If the reviewed scope is empty, stop and say exactly which scope was empty.
- If `codex` or Git context is unavailable, report the blocker and the command that failed.
