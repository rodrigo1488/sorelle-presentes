#!/bin/bash
grep -q $'\r' "$0" 2>/dev/null && sed -i 's/\r$//' "$0" && exec bash "$0" "$@"

# Corrige /api/health retornando 404 do React (falta proxy Nginx no vhost SSL :443)
#
# Uso (na VPS, como root):
#   cd /home/deploy/sorelle-presentes
#   bash deploy/aapanel/fix-nginx-api.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_ENV="${SCRIPT_DIR}/.env.deploy"

# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
DEPLOY_AAPANEL_DIR="$SCRIPT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
log() { echo -e "${GREEN}==>${NC} $*"; }
fail() { echo -e "${RED}ERRO:${NC} $*" >&2; exit 1; }

load_deploy_env "$DEPLOY_ENV"

log "Site: ${DOMAIN} | root: ${SITE_ROOT}"
patch_nginx_api_proxy || fail "Falha ao aplicar proxy /api"
reload_nginx || true

BASE_URL="$(site_public_url)"
WWW_URL="$(site_public_url "www.${DOMAIN}")"

echo ""
echo "Testes:"
for url in "${BASE_URL}/api/health" "${WWW_URL}/api/health"; do
  code=$(curl -s -o /tmp/sorelle-api-test.json -w "%{http_code}" "$url" || echo "000")
  if [ "$code" = "200" ] && grep -q '"status"' /tmp/sorelle-api-test.json 2>/dev/null; then
    echo -e "  ${GREEN}OK${NC}  $url → $(cat /tmp/sorelle-api-test.json)"
  else
    echo -e "  ${RED}FALHA${NC} $url → HTTP $code"
    echo "        Confira: docker ps | grep sorelle-backend"
    echo "        curl -s http://127.0.0.1:3001/api/health"
  fi
done
