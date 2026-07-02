#!/bin/bash
grep -q $'\r' "$0" 2>/dev/null && sed -i 's/\r$//' "$0" && exec bash "$0" "$@"

# Corrige acesso na porta 80 + publica loja React
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_ENV="${SCRIPT_DIR}/.env.deploy"

# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
DEPLOY_AAPANEL_DIR="$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}AVISO:${NC} $*"; }

load_deploy_env "$DEPLOY_ENV"

diagnose_access

log "1/3 Liberando firewall..."
open_firewall_ports

log "2/3 Publicando frontend em ${SITE_ROOT}..."
if [ -d "${APP_DIR}/dist" ]; then
  publish_frontend "${APP_DIR}/dist" "$SITE_ROOT" || warn "dist/ inválido — rode: bash deploy/aapanel/fix-homepage.sh"
else
  warn "dist/ não encontrado — rode: bash ${APP_DIR}/deploy/aapanel/fix-homepage.sh"
fi

log "3/3 Subindo Docker..."
if [ -f "${APP_DIR}/deploy/aapanel/docker-compose.backend.yml" ]; then
  docker compose -f "${APP_DIR}/deploy/aapanel/docker-compose.backend.yml" up -d 2>/dev/null || true
fi

diagnose_access

echo ""
echo "=============================================================================="
echo -e "${GREEN}Correção aplicada.${NC}"
echo ""
echo "Teste: curl -I $(site_public_url)/"
echo "Site root: ${SITE_ROOT}"
echo ""
echo "Configure o Nginx manualmente no aaPanel:"
echo "  - root → ${SITE_ROOT}"
echo "  - location /api → proxy_pass http://127.0.0.1:3001"
echo ""
echo "Se curl local (127.0.0.1) funcionar mas externo falhar:"
echo "  → Locaweb Cloud → Firewall → TCP 80 e 443"
echo "  → aaPanel → Security → Firewall → portas 80/443 Allow"
echo "=============================================================================="
