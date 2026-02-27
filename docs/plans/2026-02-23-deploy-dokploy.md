# Deploy SIPANTAUPS ke Dokploy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy SIPANTAUPS ke Dokploy — backend sebagai Docker container, frontend sebagai static files via systemd + Traefik file provider.

**Architecture:** Backend Node.js (Hono) di-build dengan `server/Dockerfile` dan di-deploy via Dokploy UI sebagai Application. Frontend Vite di-build ke `dist/`, di-serve dengan `serve` di port 4173, dikelola systemd, lalu Traefik file provider menyediakan routing HTTPS ke localhost:4173.

**Tech Stack:** Dokploy v0.27.1, Traefik v3.6.7, Docker Swarm, systemd, `serve` (Node.js static server), Let's Encrypt

---

## Catatan Infrastruktur

- Traefik entrypoints: `web` (internal 9000 → host 80), `websecure` (internal 9443 → host 443)
- Traefik file provider watch dir: `/etc/dokploy/traefik/dynamic/`
- Docker host IP dari dalam container: `172.17.0.1` (docker0 bridge)
- Dokploy network: `dokploy-network` (subnet 10.0.1.0/24)
- DB PostgreSQL: container `gealgeolgeo-postgis`, host port 5433
- `serve` sudah terinstall di `/usr/local/bin/serve`
- SSL via Let's Encrypt (certResolver: letsencrypt, HTTP challenge)

---

### Task 1: Perbaiki Dockerfile backend — tambah uploads folder

**Files:**
- Modify: `server/Dockerfile`

**Step 1: Baca Dockerfile saat ini**

```bash
cat /home/ryandshinevps/kitapantaups/server/Dockerfile
```

**Step 2: Tambahkan direktori uploads di final stage**

Tambahkan baris sebelum `CMD` di final stage:
```dockerfile
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
```

Hasil Dockerfile final stage:
```dockerfile
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Step 3: Verifikasi syntax Dockerfile valid**

```bash
docker build -f /home/ryandshinevps/kitapantaups/server/Dockerfile /home/ryandshinevps/kitapantaups/server/ --dry-run 2>/dev/null || echo "dry-run tidak support, skip"
```

**Step 4: Commit**

```bash
cd /home/ryandshinevps/kitapantaups
git add server/Dockerfile
git commit -m "feat(docker): tambah uploads volume di Dockerfile backend"
```

---

### Task 2: Buat .env.production frontend

**Files:**
- Create: `.env.production`

**Step 1: Buat file**

```bash
cat > /home/ryandshinevps/kitapantaups/.env.production << 'EOF'
VITE_API_URL=https://api.kitapantaups.ditpps.com
EOF
```

**Step 2: Verifikasi isi**

```bash
cat /home/ryandshinevps/kitapantaups/.env.production
```

Expected: `VITE_API_URL=https://api.kitapantaups.ditpps.com`

**Step 3: Commit**

```bash
cd /home/ryandshinevps/kitapantaups
git add .env.production
git commit -m "feat(frontend): tambah .env.production untuk deploy"
```

---

### Task 3: Build frontend production

**Files:** —

**Step 1: Build**

```bash
cd /home/ryandshinevps/kitapantaups && npm run build
```

Expected: folder `dist/` terbuat, tidak ada error build.

Jika ada error TypeScript/Vite, perbaiki dulu.

**Step 2: Verifikasi output**

```bash
ls /home/ryandshinevps/kitapantaups/dist/
```

Expected: `index.html`, folder `assets/`.

**Step 3: Tidak perlu commit** (dist/ ada di .gitignore)

---

### Task 4: Buat systemd service untuk frontend

**Files:**
- Create: `/etc/systemd/system/sipantaups-frontend.service`

**Step 1: Buat file service**

```bash
cat > /etc/systemd/system/sipantaups-frontend.service << 'EOF'
[Unit]
Description=SIPANTAUPS Frontend Static Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/ryandshinevps/kitapantaups
ExecStart=/usr/local/bin/serve -s dist -l 4173
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

**Step 2: Reload systemd dan enable service**

```bash
systemctl daemon-reload
systemctl enable sipantaups-frontend
systemctl start sipantaups-frontend
```

**Step 3: Verifikasi berjalan**

```bash
systemctl status sipantaups-frontend
```

Expected: `Active: active (running)`

**Step 4: Test akses lokal**

```bash
curl -s http://localhost:4173/ | head -5
```

Expected: HTML dengan `<title>` atau `<!DOCTYPE html>`

---

### Task 5: Tambah Traefik routing untuk frontend

**Files:**
- Create: `/etc/dokploy/traefik/dynamic/kitapantaups-frontend.yml`

**Step 1: Buat file routing**

```bash
cat > /etc/dokploy/traefik/dynamic/kitapantaups-frontend.yml << 'EOF'
http:
  routers:
    kitapantaups-frontend-http:
      rule: Host(`kitapantaups.ditpps.com`)
      service: kitapantaups-frontend-service
      middlewares:
        - redirect-to-https
      entryPoints:
        - web

    kitapantaups-frontend-https:
      rule: Host(`kitapantaups.ditpps.com`)
      service: kitapantaups-frontend-service
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    kitapantaups-frontend-service:
      loadBalancer:
        servers:
          - url: http://172.17.0.1:4173
        passHostHeader: true
EOF
```

**Step 2: Verifikasi Traefik reload (file provider watch otomatis)**

```bash
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://kitapantaups.ditpps.com/ 2>/dev/null || echo "DNS belum resolve, normal"
```

**Step 3: Cek Traefik dashboard apakah route terdaftar**

```bash
curl -s http://localhost:3000/api/http/routers 2>/dev/null | python3 -c "
import sys, json
routers = json.load(sys.stdin)
for r in routers:
    if 'kitapantaups' in r.get('name', ''):
        print(r['name'], '-', r.get('status'))
" 2>/dev/null || echo "Dashboard check manual di browser Dokploy"
```

---

### Task 6: Deploy backend via Dokploy UI

Ini dilakukan manual di UI Dokploy. Instruksi step-by-step:

**Step 1: Buka Dokploy UI**

Buka `http://<server-ip>:3000` atau domain Dokploy di browser.

**Step 2: Buat Application baru**

- Klik **Projects** → pilih project yang ada (atau buat baru: `kitapantaups`)
- Klik **Create Service** → pilih **Application**
- Nama: `sipantaups-api`

**Step 3: Konfigurasi Source**

- Source: **Git**
- Repository: `https://github.com/<user>/kitapantaups` atau path lokal
- Branch: `master`
- Build Type: **Dockerfile**
- Dockerfile path: `server/Dockerfile`
- Docker context: `server/`

> Jika tidak pakai Git remote, gunakan opsi **Local Path** dan arahkan ke `/home/ryandshinevps/kitapantaups/server/`

**Step 4: Konfigurasi Environment Variables**

Di tab **Environment**, tambahkan:
```
DATABASE_URL=postgresql://gealgeolgeo:Geo%40Secure2026!@172.17.0.1:5433/kitapantaups
JWT_SECRET=sipantaups-jwt-secret-2026-secure-key
JWT_REFRESH_SECRET=sipantaups-refresh-secret-2026-key
PORT=3000
CORS_ORIGIN=https://kitapantaups.ditpps.com
BASE_URL=https://api.kitapantaups.ditpps.com
NODE_ENV=production
```

> **Penting:** `DATABASE_URL` pakai `172.17.0.1:5433` agar container bisa akses DB di host. Password `@` di-encode sebagai `%40`.

**Step 5: Konfigurasi Domain**

Di tab **Domains**:
- Domain: `api.kitapantaups.ditpps.com`
- HTTPS: aktifkan (Let's Encrypt)
- Port container: `3000`

**Step 6: Konfigurasi Volumes**

Di tab **Mounts**:
- Host path: `/opt/sipantaups/uploads`
- Container path: `/app/uploads`

Buat folder host dulu:
```bash
mkdir -p /opt/sipantaups/uploads
chmod 755 /opt/sipantaups/uploads
```

**Step 7: Deploy**

Klik **Deploy**. Tunggu build selesai.

**Step 8: Verifikasi**

```bash
curl -s https://api.kitapantaups.ditpps.com/
```

Expected: `{"status":"ok","service":"SIPANTAUPS API"}`

---

### Task 7: Verifikasi end-to-end

**Step 1: Test backend HTTPS**

```bash
curl -s https://api.kitapantaups.ditpps.com/ | python3 -m json.tool
```

Expected: `{"status": "ok", "service": "SIPANTAUPS API"}`

**Step 2: Test login via API**

```bash
curl -s -X POST https://api.kitapantaups.ditpps.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sipantaups.local","password":"Admin@1234"}' | python3 -m json.tool | head -10
```

Expected: response dengan `access_token`.

**Step 3: Test frontend HTTPS**

```bash
curl -s -o /dev/null -w "%{http_code}" https://kitapantaups.ditpps.com/
```

Expected: `200`

**Step 4: Verifikasi SSL kedua domain**

```bash
curl -vI https://kitapantaups.ditpps.com/ 2>&1 | grep -E "SSL|certificate|issuer|expire"
curl -vI https://api.kitapantaups.ditpps.com/ 2>&1 | grep -E "SSL|certificate|issuer|expire"
```

**Step 5: Jika semua OK, commit catatan deploy**

```bash
cd /home/ryandshinevps/kitapantaups
git add .
git commit -m "chore: deploy production kitapantaups.ditpps.com selesai" --allow-empty
```
