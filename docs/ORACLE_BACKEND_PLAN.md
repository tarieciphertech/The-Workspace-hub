# Synexis Workspace Hub — Oracle Backend Plan

## Decision

Synexis Technologies will use the existing Oracle host as its deployment platform instead of relying on Supabase free-tier resources.

**Isolation rule:** reuse the host, not another application's data or credentials. Synexis must have a separately named application service, dedicated PostgreSQL database and database role, separate environment file/secrets, independent backups, and explicit HTTPS/domain configuration. Do not rebuild the host or modify existing services as part of this work.

## Target shape

```text
Partner browsers
      |
      | HTTPS
      v
Synexis Workspace Hub frontend
      |
      | HTTPS / JSON API
      v
Synexis API service (server-side auth + authorization)
      |
      v
Dedicated Synexis PostgreSQL database
      |
      +-- workspace, memberships, business units
      +-- tasks, projects, growth pipeline, QA, decisions
      +-- finance entries, approvals, audit events

Secrets and database credentials remain server-side.
AI integrations are added later behind the same permission and approval checks.
```

## Deployment boundaries

- Keep the current Oracle host and its existing applications intact.
- Use a unique service/container name, Compose definition, network configuration, environment file and logs for Synexis.
- Use a dedicated database and least-privilege database role; never share another application's database user or password.
- Configure a separate subdomain and TLS certificate only after DNS and reverse-proxy routing are agreed.
- Do not expose PostgreSQL publicly. The database should only be reachable by the required private service/network.
- Configure backups outside the host and complete a restore test before storing company-critical data.
- Check existing services and disk/RAM usage before deploying; do not assume capacity or ports without inspection.

## Migration from the current code

The frontend currently has Supabase-specific client integration and the repository contains three Supabase-oriented SQL migration files. They are reference material, not an instruction to provision or apply Supabase.

1. Inventory the current data calls and auth assumptions in the frontend.
2. Define the Oracle API contract for sign-in/session, organization membership, tasks, projects, growth, QA, decisions, finance, approvals and audit history.
3. Build the API and database migrations with a supported server framework and PostgreSQL driver.
4. Port tables, constraints, indexes and audit triggers. Replace Supabase-specific `auth.users`, `auth.uid()`, RLS and RPC assumptions with a reviewed authentication/authorization design. Do not copy those objects blindly.
5. Move the frontend to the API behind a single data-access layer; retain browser preview mode as a clearly labelled demo mode.
6. Add tests for authorization, cross-organization access, approval self-review prevention, audit integrity, input validation and session expiry.
7. Deploy to a staging service/database first. Verify existing host services remain healthy.
8. Test with separate founder/partner accounts, backups and restore before production launch.

## Security requirements

- Hash passwords using a modern password-hashing algorithm; never store plaintext passwords.
- Use secure, HttpOnly, SameSite cookies or another reviewed session approach; protect state-changing requests against CSRF when cookie sessions are used.
- Validate every API request on the server. Hiding a UI control is not authorization.
- Use parameterized database queries and least-privilege credentials.
- Keep API, database and AI-provider secrets out of frontend code and Git.
- Require a human approval for financial, external, destructive or company-representing actions until partners explicitly approve narrower policies.
- Record security-relevant actions in an append-only or tightly controlled audit trail.
- Define retention, off-host backup, restore and incident-response procedures.

## Current status

- **Selected:** Oracle host as the deployment platform.
- **Not done yet:** Oracle API, Synexis database, authentication, frontend API migration, production deployment and restore test.
- **Still usable:** local Vite app in browser-preview mode.
- **Not authorized:** applying Supabase migrations, connecting a Supabase account, or modifying existing Cypher Technologies application data/services.

## Definition of demo readiness

A local preview is available for UI review. A shared Oracle demo is ready only after the isolated service and database are deployed, the frontend uses the Oracle API, separate partner logins work, the HTTPS route is verified, and the staging environment has passed authorization and regression checks.
