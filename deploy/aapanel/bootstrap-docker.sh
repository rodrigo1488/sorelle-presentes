#!/bin/bash
grep -q $'\r' "$0" 2>/dev/null && sed -i 's/\r$//' "$0" && exec bash "$0" "$@"

# Bootstrap — servidor SEM o repositório clonado
# Uso no VPS (aaPanel):
#
#   export POSTGRES_PASSWORD='Sorelle@1975'
#   curl -fsSL https://raw.githubusercontent.com/CesarBorgesDev/sorelle-presentes/main/deploy/aapanel/bootstrap-docker.sh | bash
#
# Ou, se já tiver git clone parcial:
#   bash deploy/aapanel/bootstrap-docker.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/CesarBorgesDev/sorelle-presentes.git}"
APP_DIR="${APP_DIR:-/www/server/sorelle-presentes}"
DOMAIN="${DOMAIN:-sorellepresentes.com.br}"
SITE_ROOT="${SITE_ROOT:-/www/wwwroot/${DOMAIN}}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}AVISO:${NC} $*"; }
fail() { echo -e "${RED}ERRO:${NC} $*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail "Git não encontrado. Instale pelo aaPanel → App Store."

log "Repositório: $REPO_URL"
log "Destino: $APP_DIR"

if [ -d "${APP_DIR}/.git" ]; then
  log "Repositório já existe — atualizando..."
  git -C "$APP_DIR" pull
elif [ -d "$APP_DIR" ] && [ "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
  fail "Pasta $APP_DIR existe mas não é um clone git. Remova ou defina APP_DIR diferente."
else
  log "Clonando repositório..."
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi

DEPLOY_DIR="${APP_DIR}/deploy/aapanel"
[ -f "${DEPLOY_DIR}/install-docker.sh" ] || fail "install-docker.sh não encontrado após clone. Confira REPO_URL."

if [ ! -f "${DEPLOY_DIR}/.env.deploy" ]; then
  if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    fail "Defina POSTGRES_PASSWORD antes de continuar (export POSTGRES_PASSWORD='...')"
  fi
  log "Criando ${DEPLOY_DIR}/.env.deploy ..."
  cat > "${DEPLOY_DIR}/.env.deploy" << EOF
DOMAIN=${DOMAIN}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
APP_DIR=${APP_DIR}
SITE_ROOT=${SITE_ROOT}
REPO_URL=${REPO_URL}
EOF
  warn "Revise ${DEPLOY_DIR}/.env.deploy se necessário."
fi

sed -i 's/\r$//' "${DEPLOY_DIR}"/*.sh 2>/dev/null || true

log "Iniciando install-docker.sh ..."
exec bash "${DEPLOY_DIR}/install-docker.sh"
