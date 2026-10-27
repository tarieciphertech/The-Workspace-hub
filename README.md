# Synexis Technologies — Workspace Hub

**Brand:** Synexis Technologies  
**Tagline:** Beyond the Expected.  
**Visual identity:** near-black / midnight backgrounds, luminous violet and purple accents, silver-white wordmark, restrained glow effects.

The Workspace Hub is the internal operations workspace for Synexis Technologies, the new multi-partner umbrella company being registered in Zimbabwe. The app will use the existing Oracle host as its deployment platform, with a separately isolated Synexis application service, database, credentials, backups and domain configuration. It must not reuse Cypher Technologies application data or disrupt existing services.

The platform is designed for three founding partners, with Cipher and Shelton leading IT, and supports multiple business lines under one company workspace. Product and company-facing copy should use **Synexis Technologies**; “Workspace Hub” remains the name of the internal product.

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
- React + Vite frontend
- Planned Oracle-hosted API and PostgreSQL database, isolated for Synexis
- Server-side authentication and organization-scoped authorization (to be implemented)
- GitHub Actions for build validation

The frontend only uses the Supabase publishable/anon key. Never put a service-role key, database password or other secret in Vite variables or the browser bundle.

## Run locally

1. Install dependencies with `npm install`.
2. Start development with `npm run dev`.
3. Verify the production build with `npm run build`.
4. The current connected-data layer still contains Supabase-specific code and is not yet switched to the Oracle API. Until that migration is implemented, use Preview mode only.

Without Supabase variables, the app opens in **Preview mode** using sample records. Preview changes are saved in the current browser's local storage so they survive refreshes, but they are not shared with other partners and are not a backup. Clearing browser storage or using another browser/device will not carry those changes over.

## Oracle deployment plan

Oracle is the selected hosting and database platform; Supabase is no longer the target for new deployment work. The existing Supabase client and SQL migrations are legacy implementation artifacts to be reviewed and migrated—not applied to a Supabase project.

1. Keep the current Oracle host and its existing services intact; do not rebuild the host.
2. Deploy Synexis as a separately named service with its own environment file, network rules, domain/HTTPS configuration and logs.
3. Use a dedicated PostgreSQL database and database role for Synexis, separate from all other applications and credentials.
4. Implement a server-side API and authentication/authorization before connecting real company records.
5. Port the schema and policies from the existing migration files into reviewed PostgreSQL migrations suitable for the chosen authentication model. The Supabase-specific `auth.users`, RLS policies and RPC patterns must not be copied blindly.
6. Configure encrypted/off-host backups and test a restore before production data is entered.
7. Verify that existing services remain healthy and test with separate partner accounts before launch.

The Oracle API is **not implemented or deployed yet**. Until the frontend is migrated from Supabase to the API, use Preview mode only.

## Legacy Supabase migration files

These files document the first data model and are retained as migration references only:
- `supabase/migrations/20261020000000_workspace_hub_foundation.sql`
- `supabase/migrations/20261026000000_finance_entries.sql`
- `supabase/migrations/20261027000000_governance_foundation.sql`

Do not apply these migrations to a Supabase instance as part of the Oracle plan. Review and port their schema, constraints and authorization rules to the dedicated Synexis database. The earlier Supabase-specific founder setup instructions are no longer the deployment procedure.

1. Create the first partner's user in the future Oracle-backed authentication system.
2. Create the Synexis organization and initial founder membership through a controlled setup procedure. Do not hard-code credentials in source control.

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
- The governance migration adds an approval-review function and metadata-only audit triggers; the approval and audit UI is present but requires the migration and separate company database to operate in connected mode.
- The audit trail begins only after its migration is applied; it does not backfill prior activity.
- Backup/recovery procedures and a restore drill are not yet implemented. Complete these before production use of important company records.
- The finance view is not a full accounting ledger, tax report, or audited profitability statement.
- AI agent orchestration is a proposal in `docs/AI_AGENT_ARCHITECTURE.md`; no agent API, automated email, scheduled job, or external action is active.
- Keep OpenAI and integration secrets server-side. Require human approval for financial, external, destructive or company-representing actions until the partners explicitly agree otherwise.

## Deployment

The repository currently focuses on the application foundation and build validation. Configure the chosen hosting and domain after the company name and deployment approach are agreed. The production site should use the isolated Synexis API and database on the Oracle host, HTTPS, server-side secrets and tested backups.

## Implementation status

- [x] Synexis Technologies branding applied to the app shell, document metadata and visual theme
- [x] Dashboard visual refresh: purple ambient lighting, branded hero panel, responsive quick actions, motion-safe micro-interactions and richer panel styling
- [x] React + Vite foundation and responsive operations dashboard
- [x] Preview mode with browser-local persistence for supported records
- [x] Initial Supabase-oriented schema reference (legacy; not applied)
- [ ] Oracle-backed API, authentication and authorization
- [ ] Port and test organization-scoped database permissions
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
