---
name: effiq-weekly-reset
description: "Run a read-only weekly productivity review for a developer with team signals: completed work, carry-over, blockers, review debt, calendar load, and next-week focus. Use when the user asks for weekly reset, weekly review, итоги недели, or фокус следующей недели."
---

# Effiq Weekly Reset

## Purpose

Use this skill to summarize the week, identify carry-over and recurring blockers, and propose a practical next-week focus. It is a planning aid, not a status report generator unless the user asks for that format.

Primary objective: reduce recurring bottlenecks caused by unclear ownership, delayed reviews, too much WIP, or slow handoffs involving the user.

## Guardrails

- Read-only by default. Do not update Jira, create calendar blocks, or modify tasks.
- Keep the review decision-oriented. Avoid listing every issue unless it changes next-week planning.
- Include team signals that affect the user's work: blocked teammates, review debt, stale dependencies, and unresolved coordination.
- Mark assumptions and missing data clearly.

## Context Gathering

Use available sources:

- Jira: issues completed this week, issues updated by or assigned to the user, in-progress carry-over, blocked/stale work, reviews, due dates, sprint/release boundaries.
- Calendar: meeting load, recurring focus interruptions, deadlines, planning or review ceremonies.
- Tasks: completed/carry-over personal tasks and dated reminders.
- User notes: commitments, decisions, or context not visible through tools.

If dates are relative, use the user's local date and timezone from the environment when available.

## Review Heuristics

Assess:

- Outcomes: what actually moved forward, not just activity.
- Carry-over: work still open and whether it should remain active.
- Blockers: repeated dependency, review, ownership, or calendar problems.
- Review debt: work waiting on the user or team reviews.
- Bottleneck pattern: where the user repeatedly delayed reviews, QA/staging/prod movement, clarification, or handoff.
- Next-week Pareto focus: the few actions most likely to improve delivery.
- WIP hygiene: what to finish, pause, delegate, clarify, or drop.

## Output Contract

Return concise Markdown with:

- `Inputs checked`: sources used and unavailable sources.
- `Completed / moved forward`: meaningful outcomes from the week.
- `Carry-over`: work that remains active and why.
- `Blockers and risks`: current or recurring issues that threaten progress.
- `Bottleneck pattern`: where the user or team flow got stuck and how to prevent recurrence.
- `Review debt`: pending review work or queue pressure.
- `Next-week focus`: 2-4 recommended focus areas.
- `Cleanup actions`: small planning, clarification, or task hygiene actions.

If the user asks for a status-update format, add a short `Status draft` section after the analysis.

Before rendering the final answer, read `.local/effiq.settings.json` once. In prose, lists, and tables, render every semantic Jira issue mention as `[AG-123]({baseUrl}/browse/AG-123)`. Prefer local `jira.baseUrl`; otherwise use a trusted MCP `browse_url` already present in gathered evidence. Do not perform a new Jira lookup only to obtain a link. Do not rewrite fenced code, inline code, commands, JQL, or raw snippets. If neither URL source is available, keep plain issue keys and add one non-blocking setup note: `JIRA_URL=... npm run config:jira`.
