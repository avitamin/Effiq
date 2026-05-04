---
name: effiq-daily-focus
description: "Build a read-only daily focus plan for a developer using Pareto, Eisenhower, WIP limits, Jira signals, calendar load, and optional Google Tasks context. Use when the user asks what to do today first, how to prioritize today's work, выбрать фокус дня, or план на день."
---

# Effiq Daily Focus

## Purpose

Use this skill to turn available work context into a short daily focus plan. The default result is not a full report; it is a decision aid for what deserves attention today.

Primary objective: help the user avoid becoming a bottleneck for team flow. Personal priority matters, but work that unblocks others, reviews, QA, release movement, or ownership clarification should outrank isolated implementation when delay would slow the team.

## Guardrails

- Read-only by default. Do not create, update, move, close, assign, or comment on Jira issues, calendar events, or tasks.
- Use available context first: Jira MCP, open repo context, calendar agenda, Google Tasks, and user-provided notes.
- Treat Google Workspace skills as optional sources. If unavailable, continue with Jira and user context.
- Separate facts from assumptions. Do not invent priorities, deadlines, blockers, or meeting constraints.
- Prefer a narrow plan: 1-3 must-do items, a review or communication slot if needed, and explicit not-today items.

## Context Gathering

Use only sources relevant to the request:

- Jira: assigned issues, watched issues, in-progress work, blocked or stale issues, due dates, priority, status age, links, changelog, development info, and review-related signals.
- Calendar: today's meetings, focus blocks, hard deadlines, and remaining usable work capacity.
- Tasks: dated or high-priority personal tasks, carry-over tasks, and reminders.
- Repo: current branch/status only if the user asks to align the daily plan with local development work.

If a source is unavailable, say so in `Missing context` and continue.

## Prioritization Heuristics

Rank work by practical impact:

1. Prevent or remove a bottleneck where the user is blocking another person, QA, release, review, staging, or production movement.
2. Clarify ownership when an item may be waiting on the user but the next action is ambiguous.
3. Meet a real deadline today or before the next planning checkpoint.
4. Finish already-started high-value work before starting more work.
5. Handle small coordination tasks only when they prevent future delay.

Apply:

- Pareto: identify the small set of actions likely to produce most progress.
- Eisenhower: distinguish urgent/important from merely noisy.
- WIP limit: avoid recommending more active work than can fit today.
- Calendar capacity: reduce commitments when meetings fragment the day.

## Bottleneck Filters

- Separate `waiting on me` from `waiting on others`; prioritize only the former unless escalation is needed.
- Treat `In Review`, `Waiting for Staging`, `Waiting for Prod`, and `On QA` as flow states: recommend review response, verification, ping, or escalation before new development.
- Down-rank old due dates, backlog/open issues, and labels like `exclude` unless they affect active team flow.
- If many issues are assigned to the user, prefer clearing the smallest high-impact bottleneck over starting another task.

## Output Contract

Return concise Markdown with these sections:

- `Inputs checked`: bullets for sources used and unavailable sources.
- `Today focus`: 1-3 ordered must-do items with a one-line reason each.
- `Bottleneck check`: what appears to be waiting on the user versus waiting on others.
- `Review / unblock slot`: review, coordination, or escalation actions if any.
- `Not today`: work intentionally deferred with a short reason.
- `Risks`: blockers, missing data, or assumptions that could change the plan.
- `Next action`: the first concrete action the user should take.

Do not include generic time-management advice unless it directly changes the plan.
