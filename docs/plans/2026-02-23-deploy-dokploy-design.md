# Design: Deploy SIPANTAUPS ke Dokploy

**Tanggal:** 2026-02-23
**Status:** Disetujui

## Keputusan

- **Backend:** Docker container via Dokploy, build dari `server/Dockerfile`
- **Frontend:** Static files di-serve via `serve` (npx serve) di host, dikelola systemd, Traefik proxy ke localhost
- **Domain backend:** `api.kitapantaups.ditpps.com`
- **Domain frontend:** `kitapantaups.ditpps.com`

## Infrastruktur Existing

- Dokploy v0.27.1 di port 3000
- Traefik v3.6.7 di port 80/443 (reverse proxy)
- DB PostgreSQL shared: container `gealgeolgeo-postgis`, host port 5433

## Komponen

### Backend (Docker via Dokploy)

- Service: `sipantaups-api`
- Build dari `server/Dockerfile` (multi-stage, output `dist/`)
- Port internal: 3000
- Env vars di Dokploy:
  - `DATABASE_URL` — pakai `host.docker.internal:5433` agar bisa akses DB di host
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - `PORT=3000`
  - `CORS_ORIGIN=https://kitapantaups.ditpps.com`
  - `BASE_URL=https://api.kitapantaups.ditpps.com`
- Dockerfile perlu tambah: `uploads/` volume mount agar file upload persisten

### Frontend (Static + systemd)

- `.env.production`: `VITE_API_URL=https://api.kitapantaups.ditpps.com`
- Build: `npm run build` → `dist/`
- Serve: `serve` package (atau `npx serve`) di port `4173`
- Systemd service: `/etc/systemd/system/sipantaups-frontend.service`
- Traefik file provider: `/etc/traefik/dynamic/kitapantaups.yml` → route `kitapantaups.ditpps.com` → `localhost:4173`

### Uploads Volume

Folder `server/uploads/` harus persisten. Di Dokploy, tambahkan volume mount:
- Container path: `/app/uploads`
- Host path: `/opt/sipantaups/uploads`
