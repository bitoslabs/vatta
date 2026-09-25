#!/usr/bin/env bash
# Zip, upload, and cleanly redeploy the static site to the vatta.bitos.space server.
set -euo pipefail

# ---- explicit target: a local build must never imply a production destination ----
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.env"
if [[ -f "$ENV_FILE" ]]; then
  _REMOTE_HOST="${REMOTE_HOST-}"
  _REMOTE_USER="${REMOTE_USER-}"
  _REMOTE_PORT="${REMOTE_PORT-}"
  _REMOTE_DIR="${REMOTE_DIR-}"
  _REMOTE_PATH="${REMOTE_PATH-}"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  [[ -n "$_REMOTE_HOST" ]] && REMOTE_HOST="$_REMOTE_HOST"
  [[ -n "$_REMOTE_USER" ]] && REMOTE_USER="$_REMOTE_USER"
  [[ -n "$_REMOTE_PORT" ]] && REMOTE_PORT="$_REMOTE_PORT"
  [[ -n "$_REMOTE_DIR" ]] && REMOTE_DIR="$_REMOTE_DIR"
  [[ -n "$_REMOTE_PATH" ]] && REMOTE_PATH="$_REMOTE_PATH"
  unset _REMOTE_HOST _REMOTE_USER _REMOTE_PORT _REMOTE_DIR _REMOTE_PATH
fi

REMOTE_HOST="${REMOTE_HOST:?Set REMOTE_HOST in deploy/.env or the environment}"
REMOTE_USER="${REMOTE_USER:?Set REMOTE_USER in deploy/.env or the environment}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-${REMOTE_PATH:?Set REMOTE_DIR or REMOTE_PATH in deploy/.env or the environment}}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_NAME="vatta-deploy.zip"
LOCAL_ZIP="$ROOT_DIR/deploy/$ZIP_NAME"
REMOTE_TMP_ZIP="/tmp/$ZIP_NAME"

# files/folders that make up the deployed site
DEPLOY_PATHS=(.)

log() { printf '\033[1;36m==>\033[0m %s\n' "$1"; }

cd "$ROOT_DIR"

log "Checking production build"
npm run build:check
npm run deploy:check
log "Packing $ZIP_NAME from dist/"
rm -f "$LOCAL_ZIP"
(cd "$ROOT_DIR/dist" && zip -rq "$LOCAL_ZIP" "${DEPLOY_PATHS[@]}" -x '*.DS_Store')

log "Uploading to $REMOTE_USER@$REMOTE_HOST:$REMOTE_TMP_ZIP"
scp -P "$REMOTE_PORT" "$LOCAL_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_TMP_ZIP"

log "Unzipping and cleaning up on server"
# shellcheck disable=SC2087
ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" bash -s <<REMOTE_SCRIPT
set -euo pipefail
REMOTE_DIR="$REMOTE_DIR"
REMOTE_TMP_ZIP="$REMOTE_TMP_ZIP"

mkdir -p "\$REMOTE_DIR"

# backup current deploy before wiping it
if [ -n "\$(ls -A "\$REMOTE_DIR" 2>/dev/null)" ]; then
  BACKUP="/var/backups/vatta-\$(date +%Y%m%d%H%M%S).tar.gz"
  mkdir -p /var/backups
  tar -czf "\$BACKUP" -C "\$REMOTE_DIR" .
  echo "Backed up previous deploy to \$BACKUP"
fi

# Keep prior hashed chunks while open browser tabs finish loading them.
# New HTML replaces the old entry point; clean old assets on a later maintenance run.
unzip -oq "\$REMOTE_TMP_ZIP" -d "\$REMOTE_DIR"
rm -f "\$REMOTE_TMP_ZIP"

chown -R www-data:www-data "\$REMOTE_DIR" 2>/dev/null || true
find "\$REMOTE_DIR" -type d -exec chmod 755 {} \;
find "\$REMOTE_DIR" -type f -exec chmod 644 {} \;

if command -v nginx >/dev/null 2>&1; then
  nginx -t && systemctl reload nginx
fi
REMOTE_SCRIPT

log "Cleaning up local zip"
rm -f "$LOCAL_ZIP"

log "Deploy complete: https://vatta.bitos.space"
