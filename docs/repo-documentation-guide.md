# Repo Documentation Guide

## Source Priority

- Prefer executable project files over prose: root manifests, workspace config, lockfiles, task runners, CI, test/lint/typecheck configs, and generated-code config.
- If executable sources are missing, use checked-in documentation and instruction files: `README.md`, `AGENTS.md`, and files under `docs/`.
- Treat `.idea/workspace.xml` as local IDE state, not as project architecture or setup documentation.
- Treat product goals provided by the user as intent until implementation files exist.

## Document Ownership

- `README.md` owns the project overview, goals, current status, and quick-start expectations.
- `AGENTS.md` owns compact instructions for future OpenCode sessions.
- `docs/repo-documentation-guide.md` owns documentation rules, source priority, verification expectations, and indexing policy.

## Verification Matrix

- Product overview: verify against `README.md` and explicit user-provided intent.
- Build, test, lint, typecheck, and package-manager commands: verify only from manifests, task runners, lockfiles, or CI before documenting.
- Architecture and entrypoints: verify from source files and executable config before documenting.
- Agent workflow constraints: verify from `AGENTS.md` and repository-local OpenCode config if added later.

## Indexing Policy

- Keep `README.md` as the main entrypoint for humans and agents.
- Link from `README.md` to supporting docs only when they add durable context that should be discoverable.
- Do not create broad documentation trees before the repo has enough implementation surface to justify them.

## Completion Criteria

- Separate verified facts from product intent or assumptions.
- Do not document commands, frameworks, services, or deployment flows that are not backed by repo files.
- When new source/config files are added, update `README.md`, `AGENTS.md`, and this guide if their statements become stale.
