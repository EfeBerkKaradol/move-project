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
  command -v psql >/dev/null || {
    echo "psql bulunamadı. Kur: brew install libpq && brew link --force libpq" >&2
    exit 1
  }
  echo "Uzak veritabanına basılıyor…"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql"
else
  echo "Yerel docker veritabanına basılıyor…"
  docker exec -i tasiyoruz-postgres psql -U tasiyoruz -d tasiyoruz -v ON_ERROR_STOP=1 < "$sql"
fi
