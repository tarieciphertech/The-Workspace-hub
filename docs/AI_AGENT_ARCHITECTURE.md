# AI agent orchestration — proposed architecture

This document captures the integration concept shared by the partners. It describes a proposed design, not functionality that is already live.

## Intended flow

1. **Partners** give instructions, review recommendations, and approve actions.
2. **Workspace Hub** is the human-facing control centre for the dashboard, tasks, projects, sales, QA, and decisions.
3. **AI agent orchestration layer** receives a request, selects an approved agent, checks permissions, and records the outcome.
4. Specialist agents perform bounded work:
   - **Strategy agent:** reports and insights.
   - **Operations agent:** tasks and deadlines.
   - **Sales agent:** leads and follow-ups.
   - **QA agent:** defects and testing.
5. **Shared company data and integrations** provide approved context and actions: the separate company database, OpenAI API, email, GitHub, and any additional approved tools.

## Guardrails before agents can take actions

- Keep the three partners as decision-makers; agents recommend and execute only within explicitly granted permissions.
- Require human approval for external, financial, destructive, or company-representing actions until the partners explicitly approve a narrower policy.
- Give each agent the minimum data and tool access it needs.
- Treat email, documents, issue descriptions, and other retrieved content as untrusted input, not instructions that can override agent policy.
- Record the requester, selected agent, proposed action, approval, execution result, timestamps, and errors in an audit trail.
- Use idempotency keys and bounded retries for operations that can send messages, create tickets, or modify records.
- Keep secrets server-side. Never expose OpenAI or integration credentials in browser code.
- Start with read-only reports and draft recommendations. Enable write actions only after permission and audit checks are tested.

## Suggested delivery stages

1. **Workspace foundation:** finance records, ownership, and company data model.
2. **Governance:** audit events, roles, approval queue, and backup/recovery runbook.
3. **Automation:** deadline reminders and sales follow-up drafts with opt-in schedules.
4. **Agent orchestration:** server-side dispatcher, specialist agent contracts, approval gates, and execution logs.
5. **Integrations:** connect only the separate company accounts selected by the partners; verify each integration in a sandbox before production actions.

## Current status

The architecture is a proposal. The existing app has workspace pages and browser-local preview data. The finance migration in this repository is not applied to any database. No agent API, automated email, scheduled job, or external action should be described as active until it is implemented, configured, and tested.
