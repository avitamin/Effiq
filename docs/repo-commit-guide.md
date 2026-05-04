# Repo Commit Guide

## Source Priority

- Fact: Repository documentation exists in `README.md`, `AGENTS.md`, and `docs/repo-documentation-guide.md`.
- Fact: The current branch is `main` and has no commits yet, so recent history cannot define local commit conventions.
- For future commit tasks, resolve conflicts in this order: explicit user request, this guide, repository documentation, current branch, recent commit history, and the actual diff.
- The actual diff defines the commit scope and subject; do not describe files that are not staged for the commit.

## Commit Message Format

- Conservative default: Use a short imperative subject without a trailing period.

Use:

```text
Verb concise object
```

Examples:

```text
Document project intent
Add repository commit guide
Update agent guidance
```

- Prefer specific verbs such as `Add`, `Update`, `Document`, `Fix`, `Remove`, or `Refactor`.
- Do not use Conventional Commits unless repository docs, automation, or consistent history later requires it.

## Issue Key Rules

- Fact: No repository file or commit history currently requires issue keys in commit subjects.
- Conservative default: Do not add an issue key unless the user explicitly provides one or future repository documentation requires one.

## Branch Policy

- Fact: The current branch is `main` and the user selected a Simple Feature Branch flow.
- `main` is the stable branch.
- Do not commit directly to `main` after the initial bootstrap commit unless the user explicitly asks.
- Create short-lived branches from `main` using `type/short-description`.
- Use common types: `docs`, `feat`, `fix`, `chore`, and `refactor`.
- Examples: `docs/project-intent`, `feat/jira-integration`, `chore/setup-tooling`.

## Staging Policy

- Conservative default: Stage only files that were inspected and are relevant to the user's requested commit scope.
- Do not stage unrelated local IDE state or generated files unless the user explicitly asks and the diff has been reviewed.
- If staged and unstaged changes differ, write the commit message for staged content only and mention relevant unstaged leftovers.

## Validation Policy

- Fact: There are no manifests, CI workflows, test configs, lint configs, or verified project commands yet.
- Conservative default: No validation command is mandatory until executable project files define one.
- For documentation-only changes, inspect the edited Markdown for readability and valid local links.

## Missing Facts And Defaults

- Missing fact: No commit history exists to infer message style.
- Missing fact: No issue-key, branch, PR, release, or validation policy is documented.
- Default: Use short imperative subjects and commit the minimal reviewed scope.
- Default: Revisit this guide after source/config files or consistent commit history are added.
