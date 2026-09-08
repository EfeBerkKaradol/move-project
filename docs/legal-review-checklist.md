# Yayın öncesi hukuk kontrol listesi

Bu paketteki hukuki metinler **mühendislik tarafından hazırlandı ve hukukçu
incelemesinden geçmedi**. Aşağıdaki maddeler tamamlanmadan üretime alınmamalı.

Mimari ve gerekçeler: [legal-compliance.md](legal-compliance.md)

## Şirket bilgileri

- [ ] `COMPANY_LEGAL_NAME` (ticaret unvanı)
- [ ] `TRADE_NAME` (işletme adı)
- [ ] `COMPANY_ADDRESS`
- [ ] `COMPANY_EMAIL`
- [ ] `COMPANY_PHONE`
- [ ] `MERSIS_NO`
- [ ] `KEP_ADDRESS`
- [ ] `TAX_NUMBER`
- [ ] `DPO_CONTACT` (KVKK başvuru adresi)
- [ ] `SUPPORT_EMAIL`

Kontrol: `/legal` altındaki sayfalarda sarı zeminle işaretli `{{...}}` kalmamalı.

## Metin incelemesi

- [ ] Kullanıcı sözleşmesi incelendi
- [ ] Gönderici sözleşmesi incelendi
- [ ] Taşıyıcı sözleşmesi incelendi
- [ ] Yasaklı eşya listesi incelendi
- [ ] Hukuka aykırı kullanım politikası incelendi
- [ ] Mesafeli hizmet sözleşmesi incelendi (bkz. açık soru 2)
- [ ] İptal ve iade koşulları incelendi
- [ ] İhlal bildirimi süreci incelendi

## KVKK

- [ ] Aydınlatma metni hukukçu tarafından incelendi
- [ ] Her işleme faaliyeti için hukuki dayanak belirlendi (işleme envanteri)
- [ ] Açık rıza gerektiren işlemeler tespit edildi ve yalnızca onlar rızaya bağlandı
- [ ] Veri kategorileri gerçek toplanan veriyle karşılaştırıldı
- [ ] Veri aktarım listesi (altyapı sağlayıcıları dâhil) çıkarıldı
- [ ] IP ve tarayıcı bilgisinin rıza ispatı için işlenmesi değerlendirildi
- [ ] KVKK başvuru süreci ve cevap süresi tanımlandı
- [ ] VERBİS yükümlülüğü değerlendirildi

## Saklama

- [ ] `USER_ACCOUNT_DATA_RETENTION` belirlendi
- [ ] `TRANSACTION_DATA_RETENTION` belirlendi
- [ ] `AUDIT_LOG_RETENTION` belirlendi
- [ ] `CONSENT_RECORD_RETENTION` belirlendi
- [ ] `FINANCIAL_RECORD_RETENTION` belirlendi
- [ ] Hesap silme talebinde silinecek/tutulacak kayıtlar ayrıştırıldı

## Ticari ileti ve çerez

- [ ] Ticari ileti metni ve izin akışı incelendi
- [ ] İYS (İleti Yönetim Sistemi) yükümlülüğü değerlendirildi
- [ ] Çerez politikası, gerçekte kullanılan çerezlerle karşılaştırıldı
- [ ] Zorunlu olmayan çerez eklendiğinde onay akışının devreye gireceği doğrulandı

## Sektör ve ödeme

- [ ] Taşıma/lojistik mevzuatı açısından platformun konumu değerlendirildi
- [ ] Taşıyıcıdan istenen belge listesinin yeterliliği incelendi
- [ ] Tüketici hukuku açısından metinler incelendi
- [ ] Ödeme modeli (teslimatta, doğrudan taşıyıcıya) hukuken değerlendirildi
- [ ] Platform üzerinden ödeme açılırsa iade koşulları yeniden yazılacak

## Süreç

- [ ] Yetkili makam talebi süreci tanımlandı (kim, hangi sürede, hangi onayla)
- [ ] Hesap kısıtlaması itiraz süreci tanımlandı
- [ ] Uyum ekibi rolü ve yetkileri kuruma göre atandı

## Son kontrol

- [ ] Production deployment öncesi son hukuk kontrolü yapıldı
- [ ] Belgelerin sürüm ve yürürlük tarihleri güncellendi
