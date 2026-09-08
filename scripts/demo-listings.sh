#!/usr/bin/env bash
# Örnek açık ilanları veritabanına basar.
#
# Yerelde argümansız çalışır (docker'daki postgres kabına bağlanır). Uzak bir
# veritabanı için bağlantı adresi verilir:
#
#   pnpm demo:listings
#   DATABASE_URL='postgresql://kullanici:parola@host/veritabani?sslmode=require' pnpm demo:listings
#
# UYARI: Bu veri gerçek değil. Herkese açık bir ortama basıldığında ziyaretçiler
# onu gerçek ilan sanır — demo olduğu bilinerek ve geçici olarak kullanılmalı.
# Temizlemek için: DELETE FROM load_listings WHERE shipper_id = 'demo-shipper';
set -euo pipefail

sql="$(dirname "$0")/demo-listings.sql"

if [ -n "${DATABASE_URL:-}" ]; then
  case "$DATABASE_URL" in
    jdbc:*)
      echo "DATABASE_URL jdbc: önekiyle başlıyor. psql bu biçimi anlamaz — Render'daki" >&2
      echo "değeri değil, Neon'un verdiği postgresql://kullanici:parola@host/db biçimini" >&2
      echo "kullan (kullanıcı adı ve parola URL'in içinde olmalı)." >&2
      exit 1 ;;
  esac
  echo "Uzak veritabanına basılıyor…"
  if command -v psql >/dev/null; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql"
  elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qx tasiyoruz-postgres; then
    # psql her makinede kurulu değil; yerel postgres kabında zaten var. Kap uzak
    # veritabanına çıkabiliyor, tek ihtiyacımız istemci.
    echo "  (psql kurulu değil; yerel postgres kabındaki istemci kullanılıyor)"
    docker exec -i tasiyoruz-postgres psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "$sql"
  else
    echo "psql bulunamadı ve yerel postgres kabı da çalışmıyor." >&2
    echo "Ya 'pnpm infra:up' ile kabı başlat, ya da: brew install libpq && brew link --force libpq" >&2
    exit 1
  fi
else
  echo "Yerel docker veritabanına basılıyor…"
  docker exec -i tasiyoruz-postgres psql -U tasiyoruz -d tasiyoruz -v ON_ERROR_STOP=1 < "$sql"
fi
