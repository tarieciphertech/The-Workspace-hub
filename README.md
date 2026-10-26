# The Workspace Hub

A company-neutral operations workspace for a new multi-partner umbrella company being registered in Zimbabwe. The company name is intentionally configurable and has not been hard-coded.

The platform is designed for three founding partners, with Cipher and Shelton leading IT, and supports multiple business lines under one company workspace.

## Initial product areas

- **Partner overview:** open work, overdue items, opportunities, active projects, QA defects and decisions needing attention.
- **Tasks and workflow:** priorities, departments, deadlines, status and clear ownership.
- **Growth and sales:** school-system opportunities, software testing/QA prospects, follow-ups and pipeline stages.
- **Finance:** browser-preview tracking for budgets, expenses, customer invoices and income, with currency-separated summaries and an indicative cash-basis surplus. The database migration is in the repository but has not been applied to any account.
- **Projects:** shared initiatives with status, progress, business-line association and deadlines.
- **Quality assurance:** defect register with severity, status, reproduction notes and retesting stages; test-case storage is included in the database foundation.
- **Decisions:** a record of partner decisions, context, status and review date.
- **Business units:** a database foundation for adding more business lines later.

## Tech stack

- React + Vite
- Supabase Auth and PostgreSQL
- Row Level Security (RLS) for organization-scoped access
- GitHub Actions for build validation

The frontend only uses the Supabase publishable/anon key. Never put a service-role key, database password or other secret in Vite variables or the browser bundle.

## Run locally

1. Copy .env.example to .env.local.
2. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your Supabase project values.
3. Install dependencies with npm install.
4. Start development with npm run dev.
5. Verify the production build with npm run build.

Without Supabase variables, the app opens in **Preview mode** using sample records. Preview changes are saved in the current browser's local storage so they survive refreshes, but they are not shared with other partners and are not a backup. Clearing browser storage or using another browser/device will not carry those changes over.

## Supabase setup

1. Create a dedicated Supabase project for the new company. Do not reuse Cypher Technologies' existing database.
2. In Supabase SQL Editor, run `supabase/migrations/20261020000000_workspace_hub_foundation.sql`, then `supabase/migrations/20261026000000_finance_entries.sql`. Do this only after connecting the separate account for the new company; no existing Supabase account has been changed.
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

6. Add Shelton and the third partner as Supabase Auth users, then add one membership row for each user using the same organization UUID. Use roles such as it_lead for Shelton and partner for the third partner. The founder/partner membership can manage workspace membership; ordinary members cannot.
7. Set the two Vite variables in .env.local and restart Vite.

### Security notes

- Each operational record belongs to an organization_id.
- RLS policies check that the authenticated user is an active member of the record's organization.
- Partner-level membership management is protected separately from day-to-day records.
- Do not expose a Supabase service-role key in GitHub Actions variables prefixed with VITE_.
- The finance view is a planning aid, not a full accounting ledger, tax report, or audited profitability statement.
- The initial schema is a foundation. Before using real confidential financial data, review finance permissions, add immutable audit history, approval controls, and documented backup/recovery procedures.
- The AI agent orchestration concept is documented in `docs/AI_AGENT_ARCHITECTURE.md`. It is a proposed architecture; no agent API or automated external action is active.

## Deployment

The repository currently focuses on the application foundation and build validation. Configure the chosen hosting and domain after the company name and deployment approach are agreed. The production site should use its own Supabase project and HTTPS.

## Current implementation status

- [x] Initialize a clean, company-neutral repository
- [x] Responsive operations dashboard and navigation
- [x] Preview mode with temporary sample records
- [x] Supabase Auth sign-in foundation
- [x] Organization and membership model
- [x] RLS-protected tasks, opportunities, projects, QA records and decisions
- [ ] Apply migration to the new Supabase project and bootstrap founder account
- [ ] Invite all three partners and verify role boundaries
- [ ] Add assignment UX, project creation, test-case execution and activity/audit history
- [ ] Configure CI deployment after hosting is chosen
