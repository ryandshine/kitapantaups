# CI/CD

This repository includes a GitHub Actions pipeline in `.github/workflows/ci-cd.yml`.

## What It Does

- Runs on pull requests to `main`, pushes to `main`, and manual `workflow_dispatch`.
- Installs and builds the frontend.
- Installs, tests, and builds the API in `server/`.
- Builds both Docker images as a CI validation step.
- On push to `main`, SSHes into the VPS and runs `scripts/deploy-dokploy.sh`.

## Required GitHub Secrets

Add these in GitHub repository settings under `Secrets and variables > Actions`.

Secrets:

- `VPS_HOST`: VPS hostname or IP address.
- `VPS_USER`: SSH user, for example `ryandshinevps`.
- `VPS_PORT`: SSH port. Optional, defaults to `22`.
- `VPS_SSH_KEY`: Private SSH key allowed to access the VPS.
- `DOKPLOY_API_WEBHOOK_URL`: Dokploy deploy webhook URL for the API application.
- `DOKPLOY_FRONTEND_WEBHOOK_URL`: Dokploy deploy webhook URL for the frontend application.

Variables:

- `APP_DIR`: Server checkout path. Optional, defaults to `/home/ryandshinevps/kitapantaups`.

## Server Requirements

The deploy user needs to run `sudo rsync` without an interactive password for
the Dokploy application directories:

- `/etc/dokploy/applications/kitapantaups-kitapantaupsapi-vhzzlo/code`
- `/etc/dokploy/applications/kitapantaups-kitapantaupsfrontend-ffacpy/code`

The server checkout should be clean enough for:

```bash
git pull --ff-only origin main
```

If the server has local uncommitted edits, deployment will stop instead of
overwriting them.

## Notes

Frontend lint is not enabled in CI yet because the repository uses ESLint 9 but
does not currently include an `eslint.config.js` flat-config file. Add the config
first, then re-enable `npm run lint` in the workflow.

## Manual Server Deploy

After configuring webhook URLs, the same deploy script can be run manually:

```bash
cd /home/ryandshinevps/kitapantaups
DOKPLOY_API_WEBHOOK_URL='https://...' \
DOKPLOY_FRONTEND_WEBHOOK_URL='https://...' \
./scripts/deploy-dokploy.sh
```
