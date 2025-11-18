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
