# Synexis Workspace API

Initial backend service for the Synexis Workspace Hub.

## Endpoints

- `GET /health` — process health check; does not require the database.
- `GET /health/ready` — checks PostgreSQL connectivity and reports the database name and application role.
- `GET /` — service metadata.

This initial deployment deliberately provides health and connectivity verification only. Workspace business routes and authentication must be implemented and tested before the frontend is switched to this API.

## Oracle deployment

The Compose file is `compose.api.yml`. It attaches to the existing external Docker network `synexis-workspace-private` and publishes the API only on `127.0.0.1:4000`. It does not publish or recreate PostgreSQL.

Create `/opt/synexis-workspace/api.env` on the server with:

```dotenv
DB_PASSWORD=<the existing SYNEXIS_APP_DB_PASSWORD value>
```

Keep this file out of Git. Set ownership to root and permissions to 600.

From a checkout of this repository on the server:

```bash
cd /opt/synexis-workspace/repo/api
sudo docker compose -f compose.api.yml up -d --build
```

Check:

```bash
curl -fsS http://127.0.0.1:4000/health
curl -fsS http://127.0.0.1:4000/health/ready
sudo docker logs --tail=100 synexis-workspace-api
```

Do not configure Nginx or point the frontend at this API until both health endpoints have been tested successfully.
