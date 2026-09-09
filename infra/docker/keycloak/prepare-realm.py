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
* SMTP ayarı yerel Mailhog'u gösteriyor; üretimin kendi sunucusu var.

E-posta doğrulama AÇIK bırakılıyor. Bir dönem kapatılmıştı: SMTP yokken açık
olması kimsenin kaydını tamamlayamaması demekti. Artık posta sağlayıcının HTTP
API'si üzerinden gidiyor ve tek gereken ``TASIYORUZ_MAIL_API_KEY``. Kapalı
bırakmak, doğrulamayı varsayılan olarak devre dışı bırakmak olurdu — sıfırdan
kurulan ortamlarda kimse fark etmeden doğrulanmamış hesaplar birikirdi.

Anahtar verilmezse kayıt sırasında kod gönderilemez ve kullanıcı açık bir hata
görür. Sessizce doğrulamayı atlamak yerine bu tercih edildi: gürültülü bir arıza
fark edilip düzeltilir, sessiz bir atlama fark edilmez.

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
realm["verifyEmail"] = True

json.dump(realm, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"realm hazırlandı: sslRequired=external, "
      f"{len(kaldirilan_sir)} istemci sırrı kaldırıldı ({', '.join(kaldirilan_sir)}), "
      f"{kullanici_sayisi} test kullanıcısı çıkarıldı, "
      f"e-posta doğrulama açık")
