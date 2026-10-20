begin;

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'setup' check (status in ('setup','active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'member' check (role in ('founder','admin','partner','it_lead','member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members(user_id, is_active);
create index if not exists organization_members_org_idx on public.organization_members(organization_id);

create or replace function public.is_workspace_member(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

create or replace function public.can_manage_workspace(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('founder','admin','partner')
  );
$$;

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  lead_name text,
  status text not null default 'active' check (status in ('active','planning','paused','closed')),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  department text not null default 'Operations',
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done','cancelled')),
  owner_name text,
  due_date date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_tasks_org_status_idx on public.workspace_tasks(organization_id, status);
create index if not exists workspace_tasks_org_due_idx on public.workspace_tasks(organization_id, due_date);

create table if not exists public.growth_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization text not null,
  contact_name text,
  email text,
  phone text,
  segment text not null default 'Other',
  stage text not null default 'new' check (stage in ('new','contacted','meeting_booked','proposal_sent','won','lost')),
  next_follow_up date,
  estimated_value numeric(12,2),
  notes text,
  owner_name text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists growth_opportunities_org_stage_idx on public.growth_opportunities(organization_id, stage);
create index if not exists growth_opportunities_followup_idx on public.growth_opportunities(organization_id, next_follow_up);

create table if not exists public.workspace_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'planning' check (status in ('planning','in_progress','blocked','done','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  owner_name text,
  business_unit_id uuid references public.business_units(id) on delete set null,
  start_date date,
  due_date date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_projects_org_status_idx on public.workspace_projects(organization_id, status);

create table if not exists public.qa_test_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.workspace_projects(id) on delete set null,
  title text not null,
  test_type text not null default 'functional' check (test_type in ('functional','regression','usability','security','performance','acceptance','other')),
  status text not null default 'planned' check (status in ('planned','in_progress','passed','failed','blocked')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  steps text,
  expected_result text,
  actual_result text,
  evidence_url text,
  owner_name text,
  due_date date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists qa_test_cases_org_status_idx on public.qa_test_cases(organization_id, status);

create table if not exists public.qa_defects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.workspace_projects(id) on delete set null,
  test_case_id uuid references public.qa_test_cases(id) on delete set null,
  title text not null,
  description text not null,
  reproduction_steps text,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','triaged','in_progress','fixed','retest','closed','wont_fix')),
  evidence_url text,
  owner_name text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists qa_defects_org_status_idx on public.qa_defects(organization_id, status);
create index if not exists qa_defects_org_severity_idx on public.qa_defects(organization_id, severity);

create table if not exists public.workspace_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','under_review','approved','rejected','closed')),
  due_date date,
  owner_name text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_decisions_org_status_idx on public.workspace_decisions(organization_id, status);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.business_units enable row level security;
alter table public.workspace_tasks enable row level security;
alter table public.growth_opportunities enable row level security;
alter table public.workspace_projects enable row level security;
alter table public.qa_test_cases enable row level security;
alter table public.qa_defects enable row level security;
alter table public.workspace_decisions enable row level security;

drop policy if exists organizations_member_read on public.organizations;
create policy organizations_member_read on public.organizations
  for select to authenticated using (public.is_workspace_member(id));
drop policy if exists organizations_partner_update on public.organizations;
create policy organizations_partner_update on public.organizations
  for update to authenticated using (public.can_manage_workspace(id)) with check (public.can_manage_workspace(id));

drop policy if exists members_read_own_or_partner on public.organization_members;
create policy members_read_own_or_partner on public.organization_members
  for select to authenticated using (user_id = auth.uid() or public.can_manage_workspace(organization_id));
drop policy if exists members_partner_manage on public.organization_members;
create policy members_partner_manage on public.organization_members
  for all to authenticated using (public.can_manage_workspace(organization_id)) with check (public.can_manage_workspace(organization_id));

do $$
declare tbl text;
begin
  foreach tbl in array array['business_units','workspace_tasks','growth_opportunities','workspace_projects','qa_test_cases','qa_defects','workspace_decisions']
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_member_access', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_workspace_member(organization_id)) with check (public.is_workspace_member(organization_id))',
      tbl || '_member_access', tbl
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
  end loop;
end $$;

grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_manage_workspace(uuid) to authenticated;

commit;
