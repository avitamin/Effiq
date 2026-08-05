# Effiq

Effiq is intended to become a productivity environment for an AI agent that helps work with Jira, calendar events, and tasks.

## Goal

The project goal is to improve day-to-day productivity by giving an AI agent enough context and integrations to help plan, track, and coordinate work across:

- Jira issues and project work
- Calendar events and scheduling context
- Personal or team tasks

## Current Status

- The repository contains a local Tauri v2 desktop app for configuring, previewing, and running the Effiq Codex code-review workflows.
- Project-scoped Codex roles and a guarded on-demand daily-focus swarm are configured for Jira and optional Calendar or Tasks context. One interactive Luna role has passed child routing; full native-swarm and live-source acceptance remain gated.
- The app uses a dependency-light browser JavaScript frontend and a Rust `src-tauri/` backend.
- There is no CI workflow yet.
- Product direction beyond the review runner is still based on current user-provided intent.

## Review Runner App

The desktop app is the operational surface for the existing review scripts:

- `.agents/skills/effiq-code-review/scripts/run-codex-review.sh`
- `.agents/skills/effiq-code-review/scripts/switch-review-branch.sh`

Install dependencies:

```bash
npm install
```

The current frontend has no npm package dependencies; this command verifies the npm project and creates/updates `package-lock.json`.

Run the frontend development server:

```bash
npm run dev
```

Run the Tauri desktop app:

```bash
npm run tauri dev
```

Build the frontend assets into `dist/`:

```bash
npm run build
```

Build the Tauri app in debug mode:

```bash
npm run tauri build -- --debug
```

This command uses the Cargo-installed Tauri CLI through `cargo tauri`. The configured Linux bundle targets are `deb` and `rpm`.

Repeatable validation commands from the executable manifests:

```bash
npm test
npm run typecheck
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build -- --debug
```

The app delegates review and branch operations to the existing scripts through typed Rust commands. It does not expose generic shell execution to the frontend.

## Documentation

- `AGENTS.md` contains compact guidance for future Codex/OpenCode sessions.
- `docs/tauri-review-runner.md` documents the local Tauri review runner app.
- `docs/codex-subagents.md` documents the daily-focus subagent roles, orchestration, fallbacks, validation, and security boundaries.
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

Use executable project files as the source of truth for commands and architecture: `package.json`, `scripts/`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.

For an on-demand personal focus plan, start a Sol thread and invoke `$effiq-daily-focus`. The skill uses the project-scoped roles under `.codex/agents/`; see [Codex Daily-Focus Subagents](docs/codex-subagents.md).
