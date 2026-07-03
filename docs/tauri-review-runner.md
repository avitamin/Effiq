# Tauri Review Runner

## Purpose

The Effiq desktop app provides a local UI for the existing Codex code-review scripts:

- `.agents/skills/effiq-code-review/scripts/run-codex-review.sh`
- `.agents/skills/effiq-code-review/scripts/switch-review-branch.sh`

The app is not a generic terminal. The frontend sends typed requests to Rust commands, and the Rust layer builds argv for the existing repository scripts.

## Package Manager

The repository had no package manifest or lockfile before the Tauri migration. The app uses `npm`, which matches the migration goal's default when no prior package-manager evidence exists.

Run dependency installation from the repository root:

```bash
npm install
```

The current frontend intentionally has no npm package dependencies, so `npm install` is fast and only validates the npm project plus `package-lock.json`.

## Development Commands

```bash
npm run dev
npm run tauri dev
```

`npm run dev` starts the local frontend server from `scripts/dev-server.mjs`. `npm run tauri dev` starts the Tauri desktop app using the dev server declared in `src-tauri/tauri.conf.json`.

## Build And Validation

Run these commands from the repository root:

```bash
npm test
npm run typecheck
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build -- --debug
```

Tauri WebDriver smoke tests are not configured in this migration because the local WebDriver harness is absent. Follow-up command after adding the WebDriver harness and npm script:

```bash
npm run test:e2e
```

`npm run tauri build -- --debug` uses the Cargo-installed Tauri CLI through `cargo tauri`. The configured Linux bundle targets are `deb` and `rpm`; AppImage is not enabled because it failed locally with a read-only filesystem error.

## Security Model

- The app does not use `tauri-plugin-shell`.
- Tauri capabilities grant `core:default` only.
- The frontend cannot pass arbitrary shell text for execution.
- Rust requests use enums and structs for repo target, review scope, branch selector, output path, context mode, dry-run, model override, fetch, and checkout.
- Process execution is allowlisted to the two existing repository scripts.
- Review safety defaults remain owned by `run-codex-review.sh`: `codex --sandbox read-only --ask-for-approval never exec review --ephemeral` with high reasoning effort and low verbosity.

## Unsupported Or Deferred

- `open` and `copy path` actions for reports are not implemented yet. Report paths are listed as selectable text under `.local/code-reviews`.
- Tauri WebDriver smoke tests require local WebDriver setup and are not configured yet.
