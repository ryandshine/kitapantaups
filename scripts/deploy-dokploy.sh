#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ryandshinevps/kitapantaups}"
DOKPLOY_API_CODE_DIR="${DOKPLOY_API_CODE_DIR:-/etc/dokploy/applications/kitapantaups-kitapantaupsapi-vhzzlo/code}"
DOKPLOY_FRONTEND_CODE_DIR="${DOKPLOY_FRONTEND_CODE_DIR:-/etc/dokploy/applications/kitapantaups-kitapantaupsfrontend-ffacpy/code}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "APP_DIR is not a git repository: $APP_DIR" >&2
  exit 1
fi

if [[ -z "${DOKPLOY_API_WEBHOOK_URL:-}" || -z "${DOKPLOY_FRONTEND_WEBHOOK_URL:-}" ]]; then
  cat >&2 <<'MSG'
Dokploy webhook secrets are not configured.

Set these GitHub Actions secrets before enabling automatic production deploy:
- DOKPLOY_API_WEBHOOK_URL
- DOKPLOY_FRONTEND_WEBHOOK_URL

The CI part can still run safely, but CD is intentionally stopped to avoid a
half-deploy where source is copied without Dokploy rebuilding/restarting it.
MSG
  exit 1
fi

echo "Syncing source to Dokploy application directories..."
sudo rsync -a --delete \
  --exclude='.git/' \
  --exclude='.github/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='server/node_modules/' \
  --exclude='server/dist/' \
  "$APP_DIR/" "$DOKPLOY_API_CODE_DIR/"

sudo rsync -a --delete \
  --exclude='.git/' \
  --exclude='.github/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='server/node_modules/' \
  --exclude='server/dist/' \
  "$APP_DIR/" "$DOKPLOY_FRONTEND_CODE_DIR/"

echo "Triggering Dokploy API deploy..."
curl -fsS -X POST "$DOKPLOY_API_WEBHOOK_URL" >/dev/null

echo "Triggering Dokploy frontend deploy..."
curl -fsS -X POST "$DOKPLOY_FRONTEND_WEBHOOK_URL" >/dev/null

echo "Deploy triggered successfully."
