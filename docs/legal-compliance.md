# Hukuk ve uyum mimarisi

Bu doküman, Karınca'nın aracı platform iddiasını hukuki, teknik ve operasyonel
olarak ayakta tutan sistemi anlatır.

> **Yayın öncesi:** Bu paketteki hukuki metinler mühendislik tarafından hazırlandı ve
> **hukukçu incelemesinden geçmedi**. Yayına almadan önce
> [legal-review-checklist.md](legal-review-checklist.md) tamamlanmalıdır. Bu uyarı
> bilerek kullanıcıya gösterilen metinlerin içine konmadı; orada yeri yok.

## 1. Temel yaklaşım

Sözleşme metni tek başına hiçbir şey ispat etmez. "Karınca sorumlu değildir"
yazan bir sayfa, ihtilafta kullanıcının ne beyan ettiğini, ne zaman kabul ettiğini
ve şüphe hâlinde ne yapıldığını gösteremez.

Bu yüzden sistem yedi parçadan oluşuyor ve hepsi birbirine bağlı:

```
sözleşme sürümü → kabul kaydı → işlem bazlı beyan → tarama
                                                      ↓
denetim izi ← yönetim kararı ← inceleme ← uyum olayı
```

## 2. Modül sınırı

`compliance` modülü **hiçbir modüle bağımlı değil**. Bilerek: beyan almak ve olay
üretmek ilan yayınlama ve taşıyıcı onayı akışlarının içinden çağrılıyor; bu modül
onlara bağımlı olsaydı döngü kaçınılmazdı.

- `ordering` → `compliance::api` (beyan, tarama, hesap kısıtlaması)
- `fleet` → `compliance::api` (taşıyıcı taahhüdü)
- `compliance` → (yok)

`ModularityTests` bunu CI'da doğruluyor.

## 3. Veri modeli (V20, V21)

| Tablo | İşi |
|---|---|
| `legal_documents` | Belge sürüm kaydı — metin değil künye |
| `consent_records` | Kabuller, rızalar ve işlem bazlı beyanlar |
| `account_statuses` | Hesap kısıtlamaları ve gerekçeleri |
| `compliance_events` | İncelemeye açılmış olaylar ve kararlar |
| `compliance_reports` | Kullanıcı ihlal bildirimleri |
| `audit_log` | Denetim izi (yalnızca eklenir) |
| `data_requests` | KVKK ilgili kişi başvuruları |
| `legal_requests` | Yetkili makam talepleri |

`audit_log` V1'de açılmıştı ama hiçbir kod yazmıyordu; V20 onu devraldı. İkinci bir
denetim tablosu açmak, "hangisine bakacağız?" sorusunu her incelemede yeniden
sordururdu.

## 4. Hukuki metinler nerede duruyor

**Metin depoda:** `apps/web/src/content/legal/<slug>.md`
**Sürüm veritabanında:** `legal_documents`

Gerekçe: hukuk metni gözden geçirilerek değişir ve değişikliğin okunabilir olması
gerekir. Dosyada her düzeltme diff olarak inceleniyor; migration'a gömülen kırk
sayfalık metin ne okunabiliyor ne karşılaştırılabiliyor.

Denetlenebilirlik kaybolmuyor: rıza kaydı belgenin **tipini ve sürümünü** tutuyor,
o sürümün metni git geçmişinde değişmez duruyor.

Yayınlanmış bir sürümün metni düzeltilmez; düzeltme yeni sürümdür ve yeni migration
ister.

## 5. Rıza mimarisi

### Aydınlatma ≠ açık rıza

KVKK'da aydınlatma bir bilgilendirme yükümlülüğü, açık rıza bir işleme dayanağı.
İkisini tek onay kutusunda birleştirmek rızayı sakatlar; veri modelinde de
birleşmiyorlar (`KVKK_NOTICE_SEEN` ve `EXPLICIT_CONSENT` ayrı türler).

### Kayıt eklenir, güncellenmez

Geri çekme, satırı silmek ya da güncellemek değil `withdrawn_at` damgalamak ve
ayrıca bir ret kaydı yazmak. "O tarihte izin var mıydı?" sorusunun cevabı ancak
böyle korunuyor.

### Sürüm sunucudan yazılır

İstemcinin gönderdiği sürüm yok sayılıyor; sunucu yürürlükteki sürümü yazıyor.
Aksi hâlde kullanıcı "v0.1'i kabul ettim" diyerek yürürlükteki metni atlayabilirdi.

### Onay kapısı

**Kayıt Keycloak'ta yapılıyor**, uygulamada bir kayıt formu yok. Bu yüzden sözleşme
kabulü kayıt formunda alınamıyor. Bunun yerine ilk girişte bir onay kapısı var:
`GET /api/v1/consents/pending` boş dönene kadar arayüz kullanıcıyı panele bırakmıyor.

Aynı mekanizma sürüm değişikliğinde yeniden kabulü de sağlıyor — ayrı bir akış
yazmaya gerek kalmıyor.

## 6. İşlem bazlı beyanlar

| Beyan | Nerede alınıyor | Neye bağlanıyor |
|---|---|---|
| `SHIPPER_DECLARATION` | Her ilan yayınlanırken | İlan kimliği |
| `CARRIER_DECLARATION` | Taşıyıcı başvurusunda | Taşıyıcı kimliği |

Gönderici beyanı **işlem bazında**: beyan taşınan *o* yüke ait. Bir kez kabul edilip
unutulan bir onay kutusu, hangi yük için ne beyan edildiğini söyleyemez.

Zorunluluk üç katmanda: arayüzde düğme kilitli, server action reddediyor, servis
katmanı reddediyor. İlk ikisi atlatılabilir, üçüncüsü atlatılamaz.

## 7. Tarama ve risk

`ProhibitedItemScanner` ilan metninde birkaç anahtar kelime arıyor. `RiskEngine`
bunu bildirim sayısı ve kullanıcının yakın geçmişteki olay sayısıyla birleştirip
0–100 arası bir skor üretiyor.

**Tarama ilanı engellemiyor.** Kelime eşleşmesi bağlamı bilmiyor — "silah" kelimesi
bir av tüfeği ruhsatı kadar bir oyuncakta da geçer. Masum bir ilanı durdurmak,
gerçek bir ihlali yakalamaktan daha sık olurdu. Eşik aşılınca bir **inceleme kaydı**
açılıyor, ilan yoluna devam ediyor.

Skor bir karar değil, sıralama aracı. Her katkı sinyal olarak kaydediliyor;
gerekçesini gösteremeyen bir skor, inceleyene "sistem böyle dedi"den başka bir şey
söylemez ve yanlış pozitifi fark etmeyi imkânsızlaştırır.

Kelime listesi bilinçli olarak **kısa**: uzun liste yanlış pozitifi artırır, sırayı
doldurur ve gerçek vakayı gürültüde bırakır. Asıl koruma tarama değil, beyandır.

## 8. Karar akışı

```
OPEN → UNDER_REVIEW → RESOLVED / DISMISSED
                       karar: CLEAR | RESTRICT | SUSPEND | BAN
```

- Karar gerekçesi **zorunlu** (serviste ve veritabanı kısıtında).
- `CLEAR` kararı olayı `DISMISSED` yapıyor — yanlış pozitif, "çözülmüş ihlal"
  olarak sayılmamalı.
- Otomatik sistem hiçbir zaman doğrudan `BAN` üretmiyor.

Hesap durumları: `ACTIVE`, `RESTRICTED`, `SUSPENDED`, `BANNED`. Kısıtlı hesap giriş
yapabiliyor — kendi kayıtlarına, sözleşmelerine ve KVKK başvuru haklarına
erişebilmesi gerekiyor — ama yeni işlem başlatamıyor. Kapıyı tamamen kapatmak,
kullanıcıyı itiraz edemez hâle getirirdi.

## 9. Yetkilendirme

`/api/v1/admin/compliance/**` → `COMPLIANCE` veya `ADMIN`.

Operasyon ekibi (`OPS_AGENT`) belge onay kuyruğunu yürütüyor ama uyum paneline
**erişemiyor**: hesap kapatmak, ihlal bildirimlerini okumak ve kişisel veri görmek
o işin parçası değil.

Kural `SecurityConfig`'te genel admin kuralından **önce** geliyor; ilk eşleşen kural
kazandığı için sıra bozulursa panel sessizce operasyona açılırdı. `ComplianceAccessTest`
bunu HTTP düzeyinde doğruluyor.

Yönetim ekranlarında kişisel veriler maskeleniyor (`Masking`): inceleme yapanın
çoğu zaman numaranın tamamına ihtiyacı yok.

## 10. Denetim izi

`AuditTrail` yalnızca ekliyor — güncelleme ve silme metodu **yok**. Uyumun anlamı,
geriye dönük düzeltilemeyen bir kayıttır.

Detay alanına kişisel veri ya da sır yazılmaz: kim, neyi, ne zaman yaptı yeterli.
Bildirimde bulunanın kimliği de yazılmıyor — misilleme riskini gereksiz artırır.

Kaydedilen olaylar: rıza verilmesi ve geri çekilmesi, uyum olayı açılması, inceleme
başlatma, karar, hesap durumu değişikliği, bildirim, KVKK başvurusu ve işlemi.

## 11. Saklama süreleri

**Belirlenmedi.** Kod içinde uydurma süre yok.

Her veri tipi için saklama süresi, hukuki dayanağı ve silme stratejisi hukukçu
tarafından belirlenmeli:

- `USER_ACCOUNT_DATA_RETENTION`
- `TRANSACTION_DATA_RETENTION`
- `AUDIT_LOG_RETENTION`
- `CONSENT_RECORD_RETENTION`
- `FINANCIAL_RECORD_RETENTION`

> Retention periods must be confirmed by Turkish legal counsel.

## 12. Açık sorular (hukukçuya)

1. **IP ve tarayıcı bilgisi.** Rıza ispatı için `consent_records` içinde tutuluyor.
   Hukuki dayanağı ve saklama süresi belirlenmeli.
2. **Mesafeli sözleşme kapsamı.** Ödeme teslimatta ve doğrudan taşıyıcıya yapılıyor;
   platformun hizmeti eşleştirme. Mesafeli sözleşme ve cayma hakkı düzenlemelerinin
   bu modele nasıl uygulanacağı belirlenmeli.
3. **Taşıma mevzuatı.** Taşıyıcıdan istenen belge listesinin yeterliliği ve
   platformun bu konudaki kontrol yükümlülüğü değerlendirilmeli.
4. **Yetkili makam talepleri.** `legal_requests` tablosu var ama süreç (kim cevaplar,
   hangi sürede, hangi onayla) tanımlanmadı.
5. **Hesap silme.** Hangi kayıtların silineceği, hangilerinin mevzuat gereği
   tutulacağı ayrıştırılmalı.
6. **Veri aktarım listesi.** Altyapı sağlayıcıları ve aktarılan veri kategorileri
   çıkarılmalı.
7. **Şirket bilgileri.** Metinlerdeki yer tutucular doldurulmalı (aşağıya bak).

## 13. Yer tutucular

Doldurulmamış yer tutucu ekranda ham `{{...}}` olarak **kalıyor** ve sarı zeminle
işaretleniyor. Bilerek: boş bırakmak ya da "-" koymak eksikliği görünmez yapar ve
metin eksikle yayına çıkar.

`COMPANY_LEGAL_NAME`, `TRADE_NAME`, `COMPANY_ADDRESS`, `COMPANY_EMAIL`,
`COMPANY_PHONE`, `MERSIS_NO`, `KEP_ADDRESS`, `TAX_NUMBER`, `DPO_CONTACT`,
`SUPPORT_EMAIL`

Ortam değişkeni olarak veriliyor (`apps/web/src/lib/legal.ts`).
