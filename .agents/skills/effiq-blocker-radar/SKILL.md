---
name: effiq-blocker-radar
description: "Find read-only blocker and dependency signals across Jira and optional calendar/tasks context. Use when the user asks what blocks development, какие задачи блокируют разработку, что требует эскалации, or where team progress is stuck."
---

# Effiq Blocker Radar

## Purpose

Use this skill to identify work that is blocking development, delaying teammates, or likely to become an escalation. The output should help the user decide where intervention matters most.

Primary objective: detect where the user is or may become the bottleneck, then identify the smallest action that restores flow.

## Guardrails

- Read-only by default. Do not change Jira statuses, comments, assignees, links, calendar events, or tasks.
- Focus on observed signals. Mark uncertain blocker status as a hypothesis.
- Include team signals when visible, but keep recommendations centered on what the user can do next.
- Do not treat every old issue as a blocker; explain the blocking mechanism.
- Distinguish `blocked by me`, `blocked by someone else`, and `unclear owner`.

## Signals To Check

Use available MCP/tools selectively:

- Jira issue status: Blocked, In Progress, In Review, Waiting, Open, Done.
- Issue age: long time in current status, stale updates, old pull requests, or no recent activity.
- Dependencies: linked issues, parent/child issues, blockers, duplicate chains, release or sprint dependencies.
- Staging delivery route: for `Waiting for Staging`, inspect structured issue links plus the linked issues' type and status category.
- Ownership: assigned-to-user work, issues waiting on the user, watched issues, review requests, mentions in comments if available.
- Due dates and priority: overdue, due soon, release-critical, customer-impacting.
- Development info: pull requests, branches, commits, review status if Jira exposes it.
- Calendar/tasks: commitments that reduce response capacity or scheduled follow-up actions.

If exact blocker links are unavailable, infer cautiously from status names, labels, comments, or issue summaries and label the result `inferred`.

## Ranking

Order blockers by:

1. Observed active blockers, especially when the user can unblock team flow today.
2. Staging delivery risks that can be lost because they have no active Change Request.
3. Number or importance of downstream issues affected.
4. Time sensitivity: due date, sprint boundary, release risk, promised review.
5. Staleness: no owner movement or no update after a reasonable interval.
6. Cost of delay versus effort to clarify or resolve.

## Noise Filters

- Do not classify old backlog/open issues as blockers only because their due date is overdue.
- Treat review, QA, staging, and prod queues as blockers only when there is a concrete owner action, missing decision, or escalation need, except for the explicit orphan-staging delivery risk below.
- For `Waiting for Staging`, classify the route as `active_cr`, `no_cr`, `closed_cr_only`, or `unknown` using linked issue type and status category. Link type and direction do not matter; descriptions and comments are not release membership evidence.
- Report `no_cr` and `closed_cr_only` under `Likely blockers` as observed delivery risks, not `Critical blockers`, unless separate evidence proves an active blocking mechanism. Recommend linking to an appropriate active Change Request or, for a hotfix, confirming staging readiness and the rollout owner.
- Do not flag `active_cr` on status alone. Treat missing relationship fields as `unknown` and visible missing context, never as proof that no active Change Request exists.
- Keep the default search centered on work relevant to the user. Expand an orphan-staging search to broader team-visible work only when the user explicitly requests that scope.
- Down-rank `exclude`, hold-like, or archived work unless it blocks active delivery.

## Output Contract

Return concise Markdown with:

- `Inputs checked`: sources used and unavailable sources.
- `Critical blockers`: issues or work items that appear to block development now.
- `Bottleneck on me`: actions where the user appears to be delaying team flow.
- `Likely blockers`: weaker signals that need confirmation.
- `Waiting on me`: actions where the user is the bottleneck.
- `Escalate / clarify`: who or what needs a decision, update, or ownership clarification.
- `No blocker found`: include this only when the checked sources show no meaningful blocker.

For each issue, include key, summary, current status, why it blocks, and recommended next action when known.

Before rendering the final answer, read `.local/effiq.settings.json` once. In prose, lists, and tables, render every semantic Jira issue mention as `[AG-123]({baseUrl}/browse/AG-123)`. Prefer local `jira.baseUrl`; otherwise use a trusted MCP `browse_url` already present in gathered evidence. Do not perform a new Jira lookup only to obtain a link. Do not rewrite fenced code, inline code, commands, JQL, or raw snippets. If neither URL source is available, keep plain issue keys and add one non-blocking setup note: `JIRA_URL=... npm run config:jira`.
