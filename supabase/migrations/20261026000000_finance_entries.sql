create table public.finance_entries (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null,
 entry_type text not null check (entry_type in ('budget','expense','invoice','income')),
 amount numeric(14,2) not null check (amount > 0),
 currency text not null default 'BWP' check (currency in ('BWP','USD','ZWL','ZAR')),
 status text not null default 'open' check (status in ('draft','approved','open','paid','overdue','closed','cancelled')),
 counterparty text,
 notes text,
 due_date date,
 owner_name text,
 created_by uuid references auth.users(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index finance_entries_org_type_idx on public.finance_entries(organization_id, entry_type);
create index finance_entries_org_status_idx on public.finance_entries(organization_id, status);
create index finance_entries_org_due_idx on public.finance_entries(organization_id, due_date);
alter table public.finance_entries enable row level security;
create policy finance_entries_member_access on public.finance_entries
 for all to authenticated
 using (public.is_workspace_member(organization_id))
 with check (public.is_workspace_member(organization_id));
grant select, insert, update, delete on public.finance_entries to authenticated;
