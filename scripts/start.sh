#!/usr/bin/env bash
# Altyapı + API + web'i sırayla ayağa kaldırır, hazır olana kadar bekler.
# API ve web arka planda çalışır; loglar .logs/ altında.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p .logs

wait_for() { # ad, url, deneme sayısı
  printf "  %-9s" "$1"
  for _ in $(seq 1 "$3"); do
    if curl -sf "$2" >/dev/null 2>&1; then printf " \033[32mhazır\033[0m\n"; return 0; fi
    printf "."; sleep 1
  done
  printf " \033[31mzaman aşımı\033[0m — log: .logs/\n"; return 1
}

if ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop kapalı, açılıyor…"
  open -a Docker 2>/dev/null || { echo "Docker Desktop'ı elle açıp tekrar dene."; exit 1; }
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
fi

echo "Altyapı…"
pnpm infra:up >/dev/null
wait_for "Keycloak" "http://localhost:8081/realms/tasiyoruz/.well-known/openid-configuration" 90

if curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
  echo "  API       zaten çalışıyor"
else
  echo "API…"; (pnpm api > .logs/api.log 2>&1 &)
  wait_for "API" "http://localhost:8080/actuator/health" 120
fi

if curl -sf http://localhost:3000/ >/dev/null 2>&1; then
  echo "  Web       zaten çalışıyor"
else
  echo "Web…"; (pnpm dev > .logs/web.log 2>&1 &)
  wait_for "Web" "http://localhost:3000/" 60
fi

echo
echo "Site: http://localhost:3000   ·   Keycloak: http://localhost:8081 (admin/admin)"
echo
echo "Test kullanıcıları (şifre: tasiyoruz)"
echo "  musteri@tasiyoruz.local     → /panel      ilan ver, teklif seç, teslimatı onayla"
echo "  nakliyeci@tasiyoruz.local   → /nakliyeci  teklif ver, aşama ilerlet, teslim et"
