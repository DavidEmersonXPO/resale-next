# Deployment Guide

## Prerequisites
- Debian 12 VM with Docker Engine, docker compose plugin, and Node.js 20 LTS installed.
- Postgres database running in Docker (see below) or managed service.
- `resale-next` project cloned to `/opt/resale-next` (or desired path).
- Environment variables stored in `.env` files (backend/frontend/mobile) and not checked into git.

## Directory Layout
```
resale-next/
  backend/
  frontend/
  apps/
    mobile/
  docker/
```

## Docker Setup
1. Create a `docker/.env` file with values:
```
POSTGRES_USER=resale_admin
POSTGRES_PASSWORD=change_me
POSTGRES_DB=resale_tracker
DATABASE_URL=postgresql://resale_admin:change_me@postgres:5432/resale_tracker?schema=public
BACKEND_PORT=5000
FRONTEND_PORT=4173
MEDIA_STORAGE_PATH=./storage/media
REDIS_URL=redis://redis:6379
```

2. Create `docker/docker-compose.yml`:
```
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    env_file: .env
    volumes:
      - ../data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ../backend
    env_file: .env
    depends_on:
      - postgres
    ports:
      - "${BACKEND_PORT}:5000"

  frontend:
    build:
      context: ../frontend
    env_file: .env
    environment:
      - VITE_API_URL=http://backend:5000/api
    depends_on:
      - backend
    ports:
      - "${FRONTEND_PORT}:4173"
```

3. From `docker/`, run `docker compose up -d --build`.

## Backend Environment
`backend/.env`:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://resale_admin:change_me@postgres:5432/resale_tracker?schema=public
JWT_SECRET=change_me_long
JWT_EXPIRES_IN=1d
GOODWILL_API_KEY=...
SALVATION_ARMY_API_KEY=...
MEDIA_STORAGE_PATH=./storage/media
GOODWILL_REQUEST_MAX_RETRIES=3
GOODWILL_SYNC_ENABLED=true
GOODWILL_SYNC_CRON=0 6 * * *
REDIS_URL=redis://localhost:6379
```

## Frontend Build
```
cd frontend
npm install
npm run build
```
Copy `frontend/dist` to static host or serve via Nginx.

## Mobile Build
```
cd apps/mobile
cp .env.example .env
expo prebuild
expo run:android # or run:ios
```
Images uploaded from mobile/desktop are saved under `MEDIA_STORAGE_PATH` (served at `/media/*`). Ensure the directory exists and is included in VM backups or mounted on fast storage.

## CI/CD Suggestions
- Use Jenkins or GitHub Actions to run `npm run test` and `npm run build` for backend and frontend on each commit.
- Publish Docker images to a registry (e.g., `resale/backend:latest`).

## Database Baseline / Credentials
- Database name: `resale_tracker`
- Default role: `resale_admin`
- Default password: set via `POSTGRES_PASSWORD` / `DATABASE_URL` (`change_me` in examples—replace in production).

To rebuild the database on a new host (PostgreSQL):
```
CREATE ROLE resale_admin WITH LOGIN PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE DATABASE resale_tracker OWNER resale_admin;
GRANT ALL PRIVILEGES ON DATABASE resale_tracker TO resale_admin;
```

### Updating connection details
If the PostgreSQL host or password changes, update every `DATABASE_URL` reference:
- `backend/.env`
- `docker/.env` (if using Docker Compose)

Example connection string:
```
DATABASE_URL="postgresql://resale_admin:YOUR_STRONG_PASSWORD@NEW_HOST_IP:5432/resale_tracker?schema=public"
```

Restart the backend (and rerun `npx prisma migrate deploy`) after applying the new connection info.

## eBay OAuth
Add OAuth credentials and URLs for sandbox/production using environment variables (production values are required before you can connect live):

```
FRONTEND_URL=http://localhost:5173
EBAY_ENVIRONMENT=Sandbox
EBAY_SCOPES=https://api.ebay.com/oauth/api_scope/sell.item https://api.ebay.com/oauth/api_scope/sell.inventory
EBAY_SANDBOX_CLIENT_ID=...
EBAY_SANDBOX_CLIENT_SECRET=...
EBAY_SANDBOX_REDIRECT_URI=http://localhost:5000/api/ebay/oauth/callback
EBAY_SANDBOX_AUTH_URL=https://auth.sandbox.ebay.com/oauth2/authorize
EBAY_SANDBOX_TOKEN_URL=https://api.sandbox.ebay.com/identity/v1/oauth2/token
EBAY_SANDBOX_API_BASE_URL=https://api.sandbox.ebay.com
EBAY_PRODUCTION_CLIENT_ID=...
EBAY_PRODUCTION_CLIENT_SECRET=...
EBAY_PRODUCTION_REDIRECT_URI=https://<your-domain>/api/ebay/oauth/callback
EBAY_PRODUCTION_AUTH_URL=https://auth.ebay.com/oauth2/authorize
EBAY_PRODUCTION_TOKEN_URL=https://api.ebay.com/identity/v1/oauth2/token
EBAY_PRODUCTION_API_BASE_URL=https://api.ebay.com
EBAY_SUCCESS_REDIRECT=http://localhost:5173/settings/platform-credentials?ebay_connected=true
EBAY_FAILURE_REDIRECT=http://localhost:5173/settings/platform-credentials?ebay_error=connection_failed
EBAY_POLICY_REFRESH_ENABLED=true
EBAY_POLICY_REFRESH_CRON=0 8 * * *
```

The backend exposes `/api/ebay/auth/url`, `/api/ebay/oauth/callback`, `/api/ebay/connection/status`, and `/api/ebay/connection/disconnect`. Configure the eBay app to redirect to `EBAY_*_REDIRECT_URI`, then click “Connect eBay” in the Platform Credentials page to finish the flow once the OAuth dialog appears.

### eBay policies
- Sync defaults from Seller Hub via `POST /api/ebay/policies/refresh`; query the cached values with `GET /api/ebay/policies`.
- Save account-level defaults (category, payment, fulfillment, return policy IDs) with `POST /api/ebay/policies/defaults`. The backend validates each ID against eBay before persisting.
- The Platform Credentials UI surfaces these actions and provides autocomplete powered by the stored policies. Listing Composer uses the saved defaults automatically for new eBay listings.
- A nightly cron job (default `0 8 * * *`) refreshes policies automatically when `EBAY_POLICY_REFRESH_ENABLED` is not false. Adjust the schedule with `EBAY_POLICY_REFRESH_CRON` or disable altogether by setting `EBAY_POLICY_REFRESH_ENABLED=false`.

## Listing Kits
- Endpoint: `GET /api/listings/:id/kit` (also available in Swagger docs under Listings) downloads a zip archive containing `metadata.json`, `listing.csv`, `description.md`, and any stored media files for the listing.
- The dashboard “Download kit” action now triggers the archive download directly in the browser and surfaces success or error notices inline.
- Use the kits to seed manual uploads on marketplaces that do not yet have direct automation.

## Listing Publish Queue
- BullMQ + Redis handle asynchronous publishing. Point the backend at Redis with `REDIS_URL` (or `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, and optional `REDIS_TLS`).
- Publishing now enqueues jobs via `POST /api/listings/:id/publish`, which returns queued job IDs and any validation failures.
- Monitor progress with `GET /api/listing-publisher/jobs/{jobId}` or the new `GET /api/listing-publisher/jobs?limit=10` feed. The dashboard polls these endpoints, showing real-time toast updates and a “Recent publish jobs” panel.
- Retry failed publishes with `POST /api/listing-publisher/jobs/{jobId}/retry`, and prune completed/failed jobs via `POST /api/listing-publisher/jobs/clean` (body: `{ "state": "completed", "olderThan": 86400 }`).
- For higher throughput, run additional backend instances or a dedicated worker container with the same queue configuration.
- Prometheus metrics are exposed at `GET /api/metrics` (queue depth, policy refresh counters, plus default Node metrics). Scrape this endpoint for observability dashboards.

## Goodwill Integration
- Remote CSV logins now fail fast with descriptive errors and retries. Configure retry count with `GOODWILL_REQUEST_MAX_RETRIES` (default 3).
- Automatic daily sync is handled by a Cron job (default `0 6 * * *`). Disable or change the cadence using `GOODWILL_SYNC_ENABLED=false` or `GOODWILL_SYNC_CRON=<cron>`.
- Sync outcomes update the Goodwill credential status and are logged in `goodwillSyncLog`, making it easier to alert on repeated failures.
