# Repository Guidance

## Why

- Effiq is planned as a productivity environment for an AI agent working with Jira, calendar events, and tasks.
- The product goal is to improve day-to-day productivity by helping plan, track, and coordinate work across those systems.

## What

- The repo is currently documentation-only: no source tree, package manifests, CI workflows, or verified build/test/lint commands exist.
- `README.md` owns the project overview and current product intent.
- `docs/repo-documentation-guide.md` owns documentation maintenance rules.
- `.idea/workspace.xml` is local IDE state and should not be used as architecture or setup documentation.

## How

- Communicate with the user in Russian by default; keep English technical terms, commands, API names, file paths, class names, and common engineering slang in English when that is clearer.
- Do not assume a framework, package manager, integration SDK, database, or command set until project files are added and inspected.
- For factual code review from this repo, use `$effiq-code-review` or `.agents/skills/effiq-code-review/scripts/run-codex-review.sh`; keep `effiq-review-triage` for ranking review work only.
- AG CMS code review cwd targets are configurable through `--backend-path`, `--frontend-path`, `EFFIQ_AG_CMS_BACKEND_PATH`, and `EFFIQ_AG_CMS_FRONTEND_PATH`; do not commit machine-local absolute paths.
- When source/config files are added, update docs from executable sources first: manifests, workspace config, lockfiles, task runners, CI, and test/lint/typecheck configs.
- Keep this file compact and universally applicable; move task-specific or detailed guidance into named docs and link to them instead of copying it here.
