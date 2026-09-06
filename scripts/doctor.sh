#!/usr/bin/env bash
# Yerel ortamın hazır olup olmadığını söyler ve eksikse ne yapılacağını yazar.
# Kullanım: pnpm doctor
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
check() { # başlık, komut, çözüm
  if eval "$2" >/dev/null 2>&1; then printf "  \033[32m✓\033[0m %s\n" "$1"
  else printf "  \033[31m✗\033[0m %-32s → %s\n" "$1" "$3"; fail=$((fail+1)); fi
}

echo "Taşıyoruz — yerel ortam kontrolü"
echo
check "Docker çalışıyor"        "docker info"                                              "Docker Desktop'ı aç"
check "PostgreSQL"              "docker exec tasiyoruz-postgres pg_isready -U tasiyoruz"    "pnpm infra:up"
check "Redis"                   "docker exec tasiyoruz-redis redis-cli ping"               "pnpm infra:up"
check "Keycloak (8081)"         "curl -sf http://localhost:8081/realms/tasiyoruz/.well-known/openid-configuration" "pnpm infra:up — ilk açılış ~30 sn"
check "API (8080)"              "curl -sf http://localhost:8080/actuator/health"           "pnpm api"
check "Web (3000)"              "curl -sf http://localhost:3000/"                          "pnpm dev"
check "apps/web/.env.local"     "test -f apps/web/.env.local"                              "cp apps/web/.env.example apps/web/.env.local"

echo
if [ "$fail" -eq 0 ]; then
  echo "Hazır → http://localhost:3000"
  echo
  echo "Test kullanıcıları (şifre: tasiyoruz)"
  echo "  musteri@tasiyoruz.local     yük veren   → /panel"
  echo "  nakliyeci@tasiyoruz.local   araç sahibi → /nakliyeci"
else
  echo "$fail eksik. Hepsini birden başlatmak için: pnpm start"
fi
