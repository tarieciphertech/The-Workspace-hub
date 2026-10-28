# Synexis Workspace Hub — Deployment Status

Updated: 2026-10-28

## Frontend

- Repository: `tarieciphertech/The-Workspace-hub`, default branch `main`.
- Build: React + Vite, Node.js 22.
- GitHub Actions deployment workflow: `.github/workflows/deploy-pages.yml`.
- Build validation workflow: `.github/workflows/validate.yml`.
- Initial GitHub Pages URL: `https://tarieciphertech.github.io/The-Workspace-hub/`.
- Vite uses `/The-Workspace-hub/` for GitHub Actions builds until the custom domain is configured. Local development uses `/`.
- The custom domain target is `workspace.synexistech.co.zw`. Do not add a `CNAME` file or switch the Vite base to `/` for the custom domain until DNS and GitHub Pages custom-domain configuration are ready.

### GitHub Pages setup and verification

1. Open repository **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions** (not Jekyll or Static HTML).
3. Open **Actions → Deploy Workspace Hub to GitHub Pages** and confirm the run succeeds.
4. Verify the default Pages URL and test navigation, CSS, images and browser refreshes.
5. Only then configure the custom domain.

### DNS for the custom domain

DNS is managed at Webdev.co.zw using Webdev's authoritative nameservers. When ready, create a CNAME record:

- Host/name: `workspace`
- Type: `CNAME`
- Target/value: `tarieciphertech.github.io`
- TTL: provider default

Do not configure a root/apex record for this subdomain. After DNS resolves correctly, set `workspace.synexistech.co.zw` in Settings → Pages, add the matching `CNAME` file to the repository, verify HTTPS, then change Vite's production base to `/` and redeploy. These steps are intentionally deferred until the default Pages deployment is confirmed.

## Oracle backend and database

The dedicated Synexis PostgreSQL service is already provisioned on the existing Oracle host:

- Compose directory: `/opt/synexis-workspace`
- Database container: `synexis-workspace-db`
- Database: `synexis_workspace`
- App database role: `synexis_app` (least-privilege, non-superuser)
- Private Docker network: `synexis-workspace-private`
- Persistent volume: `synexis_workspace_pg_data`
- Environment file: `/opt/synexis-workspace/.env` (root-owned, mode 600)
- PostgreSQL has no published host port; keep it private.

Existing MeritMatrix, HomeBridge, Cypher and other host services must remain untouched.

### Not yet production-ready

- Oracle API service and HTTPS reverse proxy route are not yet implemented.
- Frontend data access has not yet been migrated from the legacy Supabase-specific client to the Oracle API.
- Database schema migrations must be reviewed and ported from the legacy SQL reference files; do not apply them to Supabase.
- Server-side authentication, session security, organization/role authorization, approval enforcement, and audit handling remain to be implemented and tested.
- Encrypted off-host backups and a restore test remain required before real company data is entered.

**Important:** A successful GitHub Pages deployment only publishes the frontend. It does not make the application multi-user or connect it to the Oracle database. Until the Oracle API and authentication are deployed and tested, use Preview mode only and do not enter confidential company information. No Supabase setup or deployment is part of this plan.
