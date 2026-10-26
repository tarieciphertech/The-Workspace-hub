# The Workspace Hub

A company-neutral operations workspace for a new multi-partner umbrella company being registered in Zimbabwe. The company name is intentionally configurable and has not been hard-coded.

The platform is designed for three founding partners, with Cipher and Shelton leading IT, and supports multiple business lines under one company workspace.

## Product areas

- **Partner overview:** open work, overdue items, opportunities, active projects, QA defects and decisions needing attention.
- **Tasks and workflow:** priorities, departments, deadlines, status and clear ownership.
- **Growth and sales:** school-system opportunities, software testing/QA prospects, follow-ups and pipeline stages.
- **Finance:** browser-preview tracking for budgets, expenses, customer invoices and income, with currency-separated summaries and an indicative cash-basis surplus. This is a planning aid, not an accounting ledger or tax report.
- **Projects:** shared initiatives with status, progress, business-line association and deadlines.
- **Quality assurance:** defect register with severity, status, reproduction notes and retesting stages; test-case storage is included in the database foundation.
- **Decisions:** a record of partner decisions, context, status and review date.
- **Approvals & audit:** the UI now includes an approval-request form, pending/reviewed request list, partner approve/reject actions, and a manager-only audit-history view. In Preview mode, requests are saved in this browser only; connected mode requires the governance migration and separate authenticated partner accounts.
- **AI agent architecture:** a proposal for specialist agents and safe orchestration is documented; no agent API or automated external action is live.
- **Business units:** a database foundation for adding more business lines later.

## Recent codebase changes

The latest governance stage adds:

1. `supabase/migrations/20261027000000_governance_foundation.sql`
   - Adds organization-scoped approval requests for finance, external messages, access changes, purchases, deployments, data changes and other actions.
   - Adds a controlled review function for authorized workspace managers. A requester cannot approve or reject their own request.
   - Adds an audit-event table and triggers for task, sales opportunity, project, QA defect, decision, finance and approval-request changes.
   - Audit events store actor, action, table, record ID, timestamp and changed field names—not full row snapshots.
   - Audit reads are limited to workspace managers; clients do not receive direct audit-table write permissions.
2. `src/App.jsx`
   - Adds the **Approvals & audit** navigation page, request submission form, review notes, approve/reject controls, audit-event table, role-aware audit visibility and local-only preview persistence.
   - Connected review actions call the `review_workspace_approval` database function; the browser does not directly update approval decisions.
3. `docs/GOVERNANCE_FOUNDATION.md`
   - Explains the schema, permission boundaries, current gaps and a verification checklist for when the separate company database is ready.
4. Earlier finance and AI architecture work remains in place:
   - `supabase/migrations/20261026000000_finance_entries.sql` defines the finance records table.
   - `docs/AI_AGENT_ARCHITECTURE.md` documents the proposed orchestration model and guardrails.

**Important:** these migrations are repository files only. They have not been applied to Supabase or any other database. The new screens are wired to the expected database schema but cannot show shared records or perform real reviews until the separate company database is configured and the migrations are applied. Preview mode is not a security test and cannot simulate distinct partner identities. Test the SQL and permissions with separate authenticated accounts before production use.

## Tech stack

- React + Vite
- Supabase Auth and PostgreSQL
- Row Level Security (RLS) for organization-scoped access
- GitHub Actions for build validation

The frontend only uses the Supabase publishable/anon key. Never put a service-role key, database password or other secret in Vite variables or the browser bundle.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the **new company's dedicated Supabase project** values when that project is ready.
3. Install dependencies with `npm install`.
4. Start development with `npm run dev`.
5. Verify the production build with `npm run build`.

Without Supabase variables, the app opens in **Preview mode** using sample records. Preview changes are saved in the current browser's local storage so they survive refreshes, but they are not shared with other partners and are not a backup. Clearing browser storage or using another browser/device will not carry those changes over.

## Supabase setup — when the partners are ready

Do not connect this project to Cypher Technologies' existing Supabase account. Use a dedicated project/account for the new company.

1. Create the separate Supabase project and confirm that the partners agree on access ownership.
2. Review and apply the migrations in chronological order:
   - `supabase/migrations/20261020000000_workspace_hub_foundation.sql`
   - `supabase/migrations/20261026000000_finance_entries.sql`
   - `supabase/migrations/20261027000000_governance_foundation.sql`
3. Create the first partner's user in Supabase Authentication.
4. Copy that user's UUID from Authentication → Users.
5. In SQL Editor, create the organization and initial founder membership. Replace the two placeholders first:

```sql
with new_org as (
  insert into public.organizations (name, status)
  values ('REPLACE_WITH_REGISTERED_OR_WORKING_COMPANY_NAME', 'setup')
  returning id
)
insert into public.organization_members
  (organization_id, user_id, full_name, role, is_active)
select
  new_org.id,
  'REPLACE_WITH_FIRST_AUTH_USER_UUID'::uuid,
  'Cipher',
  'founder',
  true
from new_org;
```

6. Add Shelton and the third partner as Supabase Auth users, then add one membership row for each user using the same organization UUID. Agree on roles before giving real access.
7. Set the two Vite variables in `.env.local` and restart Vite.
8. Test access with separate founder/partner, IT lead and member accounts before entering confidential information.

### Security and governance notes

- Each operational record belongs to an `organization_id`; RLS is intended to scope access to active workspace members.
- The current schema treats `founder`, `admin` and `partner` as workspace managers. This is a starting rule, not a complete fine-grained permission model.
- The governance migration adds an approval-review function and metadata-only audit triggers, but no approval/audit UI is wired yet.
- The audit trail begins only after its migration is applied; it does not backfill prior activity.
- Backup/recovery procedures and a restore drill are not yet implemented. Complete these before production use of important company records.
- The finance view is not a full accounting ledger, tax report, or audited profitability statement.
- AI agent orchestration is a proposal in `docs/AI_AGENT_ARCHITECTURE.md`; no agent API, automated email, scheduled job, or external action is active.
- Keep OpenAI and integration secrets server-side. Require human approval for financial, external, destructive or company-representing actions until the partners explicitly agree otherwise.

## Deployment

The repository currently focuses on the application foundation and build validation. Configure the chosen hosting and domain after the company name and deployment approach are agreed. The production site should use its own Supabase project and HTTPS.

## Implementation status

- [x] Company-neutral React + Vite foundation and responsive operations dashboard
- [x] Preview mode with browser-local persistence for supported records
- [x] Supabase Auth sign-in foundation
- [x] Organization and membership model with RLS foundation
- [x] Task, sales opportunity, project, QA defect and decision pages
- [x] Finance page and migration file
- [x] Proposed AI agent architecture and safety guardrails documented
- [x] Governance migration for approval requests and audit events prepared in GitHub
- [ ] Apply and test migrations on the new company's separate Supabase project
- [ ] Verify role boundaries with separate test accounts
- [x] Build approval queue and audit-history UI (requires connected governance schema for shared operation)
- [ ] Add fine-grained role permissions and backup/recovery runbook
- [ ] Add deadline reminders and sales follow-up drafts with explicit review/approval
- [ ] Implement server-side AI orchestration only after the governance and audit checks are tested
- [ ] Configure CI deployment after hosting is chosen
