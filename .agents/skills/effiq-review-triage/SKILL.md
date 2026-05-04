---
name: effiq-review-triage
description: "Prioritize code reviews and review-like work in read-only mode using unblock impact, risk, age, dependency chains, and daily capacity. Use when the user asks which reviews to do first, какие ревью провести, or how to triage review queue."
---

# Effiq Review Triage

## Purpose

Use this skill to decide which reviews should happen first. It does not perform code review; it ranks review work so the user can spend limited review capacity where it unblocks the most progress.

Primary objective: prevent the user from becoming a review bottleneck. A review is high priority when another person, QA, release, or production movement is waiting on the user's response.

## Guardrails

- Read-only by default. Do not approve, reject, comment, assign, transition, or merge anything.
- Prefer evidence from Jira development info, linked issues, PR metadata visible through MCP, user-provided links, or repo context.
- If review metadata is missing, ask for the queue or mark the ranking as based on incomplete context.
- Do not rank solely by age; age matters only with impact, risk, or ownership.

## Signals To Check

- Reviews requested from the user or their team.
- Jira issues in `In Review`, `Code Review`, `Waiting for Review`, or equivalent statuses.
- PRs linked through Jira development info.
- Issues blocked by a pending review.
- Release, sprint, incident, or customer-impact labels.
- Size and risk signals when available: touched area, test coverage, migration/config changes, security-sensitive changes.
- Calendar capacity for review work today.

## Ranking

Prioritize reviews in this order:

1. Reviews where the user is the bottleneck for another developer, QA, release, incident fix, or customer-impacting work.
2. Small high-confidence reviews that can clear queue pressure quickly.
3. High-risk reviews that need early attention before the day fragments.
4. Stale reviews where delay is already causing coordination cost.
5. Low-impact or speculative reviews only after must-review items are handled.

## Noise Filters

- Do not assume every `In Review` issue needs the user's action; separate `waiting on me` from `waiting on someone else`.
- Down-rank old review issues with no recent activity unless they are tied to active delivery, release, security, customer impact, or dependencies.
- Prefer a short clarification action when ownership is unknown instead of ranking ambiguous reviews as must-do work.

## Output Contract

Return concise Markdown with:

- `Inputs checked`: queue sources, Jira queries, calendar/task context if used, and unavailable sources.
- `Review first`: ordered list with reason and expected impact.
- `Waiting on me`: reviews or clarifications where the user appears to be the bottleneck.
- `Batch next`: reviews that can be grouped or handled after must-review items.
- `Defer`: reviews that are not urgent today and why.
- `Clarify`: missing reviewers, unclear ownership, missing PR links, or ambiguous readiness.
- `First action`: the first review or clarification to start with.

If no review queue is visible, say exactly what context is needed: PR links, Jira filter, board, project key, or user/team ownership.
