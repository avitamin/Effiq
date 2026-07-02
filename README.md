# Effiq

Effiq is intended to become a productivity environment for an AI agent that helps work with Jira, calendar events, and tasks.

## Goal

The project goal is to improve day-to-day productivity by giving an AI agent enough context and integrations to help plan, track, and coordinate work across:

- Jira issues and project work
- Calendar events and scheduling context
- Personal or team tasks

## Current Status

- The repository is in an initial documentation-only state.
- There is no source tree, package manifest, CI workflow, or verified build/test/lint command yet.
- Product direction is based on the current user-provided intent; implementation architecture is not defined in repo files yet.

## Documentation

- `AGENTS.md` contains compact guidance for future Codex/OpenCode sessions.
- `docs/repo-documentation-guide.md` defines how project documentation should be maintained.
- `.agents/skills/` contains repo-local skills for read-only daily planning, blocker detection, review triage, weekly reset, and Codex code review workflows.

## Codex Code Review

Run read-only Codex reviews for both AG CMS repositories:

```bash
.agents/skills/effiq-code-review/scripts/run-codex-review.sh
```

The runner launches Codex with configurable repository cwd targets:

- Backend CMS AG: `--backend-path <path>` or `EFFIQ_AG_CMS_BACKEND_PATH`
- Frontend CMS AG: `--frontend-path <path>` or `EFFIQ_AG_CMS_FRONTEND_PATH`

If no path is provided, AG CMS paths default to `../agcms-laravel` and `../ag-cms-ng` relative to the Effiq Git root. By default the runner reviews both AG CMS repos against `develop` and writes reports to `.local/code-reviews/backend.md` and `.local/code-reviews/frontend.md`. Use `--repo backend`, `--repo frontend`, or `--repo effiq` to run one target; use `--uncommitted`, `--commit <sha>`, or `--base <branch>` to choose another review scope.

By default the Codex process only receives the selected cwd repository. Use `--with-context` to add Effiq, backend, and frontend as extra read-only roots for cross-repo contract checks.

## Agent Notes

Until source and config files are added, do not assume a framework, package manager, integration SDK, database, or command set. Document those only after they appear in executable project files.
