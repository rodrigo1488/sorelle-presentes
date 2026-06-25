#!/bin/bash
grep -q $'\r' "$0" 2>/dev/null && sed -i 's/\r$//' "$0" && exec bash "$0" "$@"

# Diagnóstico rápido da API e frontend no aaPanel
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_ENV="${SCRIPT_DIR}/.env.deploy"

if [ -f "$DEPLOY_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$DEPLOY_ENV"
  set +a
fi

DOMAIN="${DOMAIN:-191.252.205.7}"
BASE_URL="${SITE_SCHEME:-http}://${DOMAIN}"
[ "$DOMAIN" = "191.252.205.7" ] && BASE_URL="http://${DOMAIN}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
ok()   { echo -e "${GREEN}OK${NC}  $*"; }
fail() { echo -e "${RED}FALHA${NC} $*"; }
warn() { echo -e "${YELLOW}AVISO${NC} $*"; }

echo "=== Diagnóstico Sorelle — ${DOMAIN} ==="
echo ""

echo "Docker:"
if docker ps --format '  {{.Names}}: {{.Status}}' 2>/dev/null | grep -E 'sorelle-(db|backend)'; then
  ok "Containers encontrados"
else
  fail "Containers sorelle-db / sorelle-backend não estão rodando"
  echo "  → docker compose -f deploy/aapanel/docker-compose.backend.yml up -d --build"
fi
echo ""

echo "API local (127.0.0.1:3001):"
if curl -sf http://127.0.0.1:3001/api/health >/dev/null; then
  ok "$(curl -s http://127.0.0.1:3001/api/health)"
else
  fail "API não responde em 127.0.0.1:3001"
  echo "  → docker logs sorelle-backend --tail 50"
fi
echo ""

echo "API via Nginx (${BASE_URL}/api):"
HTTP_CODE=$(curl -s -o /tmp/sorelle-health.json -w "%{http_code}" "${BASE_URL}/api/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  ok "HTTP ${HTTP_CODE} — $(cat /tmp/sorelle-health.json)"
else
  fail "HTTP ${HTTP_CODE} em ${BASE_URL}/api/health"
  echo "  → bash deploy/aapanel/fix-access.sh"
fi
echo ""

echo "Frontend (${BASE_URL}/):"
FRONT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/" || echo "000")
if [ "$FRONT_CODE" = "200" ]; then
  ok "HTTP ${FRONT_CODE}"
else
  fail "HTTP ${FRONT_CODE}"
fi
echo ""

echo "Login admin (teste):"
LOGIN_CODE=$(curl -s -o /tmp/sorelle-login.json -w "%{http_code}" \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sorelle.com.br","password":"__invalid__"}' || echo "000")
if [ "$LOGIN_CODE" = "401" ]; then
  ok "HTTP 401 — API de login respondendo ($(cat /tmp/sorelle-login.json))"
elif [ "$LOGIN_CODE" = "200" ]; then
  warn "Login retornou 200 com senha inválida — verifique auth"
else
  fail "HTTP ${LOGIN_CODE} — $(cat /tmp/sorelle-login.json 2>/dev/null || echo 'sem resposta')"
fi
echo ""

echo "server/.env (DATABASE_URL):"
APP_DIR="${APP_DIR:-/www/server/sorelle-presentes}"
if [ -f "${APP_DIR}/server/.env" ]; then
  grep '^DATABASE_URL=' "${APP_DIR}/server/.env" | sed 's/:[^:@]*@/:***@/'
  if grep -q '@db:5432' "${APP_DIR}/server/.env"; then
    warn "Host 'db' no .env — use 127.0.0.1 no host VPS"
    echo "  → sed -i 's|@db:5432|@127.0.0.1:5432|' server/.env"
  fi
else
  warn "server/.env não encontrado em ${APP_DIR}"
fi

echo ""
echo "=== Fim do diagnóstico ==="
