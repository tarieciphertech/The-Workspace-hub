# Governance foundation

This stage adds database-side building blocks for approval workflows and audit history. It is a schema foundation, not a finished governance screen or a claim of production security certification.

## Included in the migration

- `workspace_approval_requests`: organization-scoped requests for finance, external messages, access changes, purchases, deployments, data changes, or other actions.
- Approval creation is limited to active workspace members and new requests must start as pending.
- `review_workspace_approval(request_id, decision, note)`: controlled review function. Only workspace managers (founder/admin/partner under the current role model) can approve or reject, and a requester cannot approve their own request.
- `workspace_audit_events`: metadata-only audit events for inserts, updates, and deletes across tasks, sales opportunities, projects, QA defects, decisions, finance entries, and approval requests.
- Audit reads are limited to workspace managers. Client roles receive no direct write grants on the audit table.
- Audit records retain action, table, record identifier, actor, timestamp, and changed field names—not complete before/after row values.

## Important boundaries

- The migration has **not** been run against any database. Review and apply it only after the partners connect the new company's separate Supabase project.
- The current application does not yet include an approvals screen, audit-history screen, or UI calls to the review RPC.
- Existing role definitions are still coarse-grained. The current manager rule treats `founder`, `admin`, and `partner` as workspace managers; the partners should agree on whether IT leads may approve particular request types before production.
- Database backups, restore drills, authentication hardening, and a full permissions review are still required before storing confidential or material financial records.
- The audit triggers record changes only after this migration is applied. Changes made before that are not backfilled.
- This is not a substitute for an external security review. Test policies and the review function with separate test users before production use.

## Suggested verification after the separate project is ready

1. Apply the foundation migration, finance migration, then this governance migration in chronological order.
2. Test with a founder/partner, an IT lead, a regular member, and two users to verify that a requester cannot review their own request.
3. Create/update/delete a test task and finance entry; confirm manager-only audit visibility and ensure no sensitive field values are stored in the audit trail.
4. Verify rejected/approved requests cannot be reviewed a second time and regular members cannot directly update review fields.
5. Only after the tests pass, build the UI around the approval queue and audit events.
