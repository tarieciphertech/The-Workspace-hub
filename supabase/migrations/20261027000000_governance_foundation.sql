begin;

-- Governance foundation only. This migration is committed to the repository;
-- it must be reviewed and applied only to the new company's separate database.

create table public.workspace_approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  request_type text not null check (request_type in ('finance','external_message','access_change','purchase','deployment','data_change','other')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('approved','rejected')) = (reviewed_at is not null)),
  check (status not in ('approved','rejected') or reviewed_by is not null)
);
create index workspace_approval_org_status_idx
  on public.workspace_approval_requests(organization_id, status, created_at desc);
create index workspace_approval_requester_idx
  on public.workspace_approval_requests(requested_by, created_at desc);

create table public.workspace_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  changed_fields text[] not null default '{}',
  occurred_at timestamptz not null default now()
);
create index workspace_audit_org_time_idx
  on public.workspace_audit_events(organization_id, occurred_at desc);
create index workspace_audit_actor_idx
  on public.workspace_audit_events(organization_id, actor_user_id, occurred_at desc);

alter table public.workspace_approval_requests enable row level security;
alter table public.workspace_audit_events enable row level security;

create policy workspace_approvals_member_read
  on public.workspace_approval_requests for select to authenticated
  using (public.is_workspace_member(organization_id));
create policy workspace_approvals_member_request
  on public.workspace_approval_requests for insert to authenticated
  with check (
    public.is_workspace_member(organization_id)
    and requested_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );
-- Review decisions must go through the RPC below, not direct table updates.
grant select, insert on public.workspace_approval_requests to authenticated;

create policy workspace_audit_partner_read
  on public.workspace_audit_events for select to authenticated
  using (public.can_manage_workspace(organization_id));
-- No client INSERT/UPDATE/DELETE grants: audit rows are written by trusted triggers.
grant select on public.workspace_audit_events to authenticated;

create or replace function public.review_workspace_approval(
  request_id uuid,
  decision text,
  note text default null
)
returns public.workspace_approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.workspace_approval_requests;
begin
  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into request_row
  from public.workspace_approval_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Approval request not found';
  end if;
  if not public.can_manage_workspace(request_row.organization_id) then
    raise exception 'You are not allowed to review this request';
  end if;
  if request_row.requested_by = auth.uid() then
    raise exception 'A requester cannot review their own request';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Only pending requests can be reviewed';
  end if;

  update public.workspace_approval_requests
  set status = decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      reviewer_note = note,
      updated_at = now()
  where id = request_id
  returning * into request_row;

  return request_row;
end;
$$;
revoke all on function public.review_workspace_approval(uuid, text, text) from public;
grant execute on function public.review_workspace_approval(uuid, text, text) to authenticated;

-- Audit only metadata and changed column names, never complete row contents.
create or replace function public.capture_workspace_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid;
  target_id text;
  changed text[] := '{}';
  column_name text;
  before_row jsonb;
  after_row jsonb;
begin
  if tg_op = 'DELETE' then
    before_row := to_jsonb(old);
    target_org := (before_row ->> 'organization_id')::uuid;
    target_id := before_row ->> 'id';
  elsif tg_op = 'INSERT' then
    after_row := to_jsonb(new);
    target_org := (after_row ->> 'organization_id')::uuid;
    target_id := after_row ->> 'id';
  else
    before_row := to_jsonb(old);
    after_row := to_jsonb(new);
    target_org := (after_row ->> 'organization_id')::uuid;
    target_id := after_row ->> 'id';
    for column_name in select jsonb_object_keys(after_row)
    loop
      if column_name not in ('updated_at') and before_row -> column_name is distinct from after_row -> column_name then
        changed := array_append(changed, column_name);
      end if;
    end loop;
  end if;

  if target_org is not null then
    insert into public.workspace_audit_events
      (organization_id, actor_user_id, action, table_name, record_id, changed_fields)
    values (
      target_org,
      auth.uid(),
      lower(tg_op),
      tg_table_name,
      target_id,
      case when tg_op = 'UPDATE' then changed else '{}'::text[] end
    );
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Capture changes to the core operational records plus approval decisions.
create trigger audit_workspace_tasks after insert or update or delete on public.workspace_tasks
  for each row execute function public.capture_workspace_audit_event();
create trigger audit_growth_opportunities after insert or update or delete on public.growth_opportunities
  for each row execute function public.capture_workspace_audit_event();
create trigger audit_workspace_projects after insert or update or delete on public.workspace_projects
  for each row execute function public.capture_workspace_audit_event();
create trigger audit_qa_defects after insert or update or delete on public.qa_defects
  for each row execute function public.capture_workspace_audit_event();
create trigger audit_workspace_decisions after insert or update or delete on public.workspace_decisions
  for each row execute function public.capture_workspace_audit_event();
create trigger audit_finance_entries after insert or update or delete on public.finance_entries
  for each row execute function public.capture_workspace_audit_event();
create trigger audit_workspace_approval_requests after insert or update or delete on public.workspace_approval_requests
  for each row execute function public.capture_workspace_audit_event();

grant execute on function public.capture_workspace_audit_event() to authenticated;

commit;
