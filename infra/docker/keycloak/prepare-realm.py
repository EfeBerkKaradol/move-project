#!/usr/bin/env python3
"""Yerel realm dosyasını dağıtıma hazır hâle getirir.

Yerel import dosyası geliştirme kolaylıkları taşıyor ve bunlar herkese açık bir
adrese çıkmamalı:

* ``sslRequired: NONE`` — Docker ağ geçidinden gelen HTTP'yi kabul etmek için
  konulmuştu (bkz. CLAUDE.md). Üretimde ``external`` olmalı.
* İstemci sırları repoda yazılı. Silinince Keycloak rastgele üretiyor; gerçek değeri
  Clients → Credentials ekranından alınıyor.
* Test kullanıcıları ve parolaları repoda. Herkese açık bir sunucuda, parolası
  bilinen bir ADMIN hesabı bırakmak olmaz.
* SMTP ayarı yerel Mailhog'u gösteriyor. Üretimde çözülemeyen bir sunucu +
  ``verifyEmail: true`` demek, kimsenin kaydını tamamlayamaması demek. SMTP
  ayarlanana kadar doğrulama kapatılıyor (ANAHTARLAR Adım 3).

Kalan her şey (roller, istemci tanımları, tema, e-posta doğrulama, akışlar) aynen
kalıyor; dağıtımda elle yeniden kurmak gerekmiyor.
"""
import json
import sys
from collections import OrderedDict

src, dst = sys.argv[1], sys.argv[2]
realm = json.load(open(src, encoding="utf-8"), object_pairs_hook=OrderedDict)

realm["sslRequired"] = "external"

kaldirilan_sir = []
for client in realm.get("clients", []):
    if client.pop("secret", None):
        kaldirilan_sir.append(client["clientId"])

kullanici_sayisi = len(realm.get("users", []))
realm["users"] = []

realm.pop("smtpServer", None)
realm["verifyEmail"] = False

json.dump(realm, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"realm hazırlandı: sslRequired=external, "
      f"{len(kaldirilan_sir)} istemci sırrı kaldırıldı ({', '.join(kaldirilan_sir)}), "
      f"{kullanici_sayisi} test kullanıcısı çıkarıldı, "
      f"e-posta doğrulama SMTP gelene kadar kapatıldı")
