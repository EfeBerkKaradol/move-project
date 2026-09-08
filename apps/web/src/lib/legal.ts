import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Hukuki metinler.
 *
 * <p>Metin veritabanında değil depoda: hukuk metni gözden geçirilerek değişir ve
 * değişikliğin okunabilir olması gerekir. Dosyada her düzeltme diff olarak
 * inceleniyor; migration'a gömülen kırk sayfalık metin ne okunabiliyor ne
 * karşılaştırılabiliyor. Denetlenebilirlik kaybolmuyor — rıza kaydı belgenin
 * tipini ve sürümünü tutuyor, o sürümün metni git geçmişinde değişmez duruyor.
 *
 * <p>Sürüm ve yürürlük tarihi API'den geliyor ({@code /public/legal-documents});
 * kabul kaydına yazılan sürüm ile sayfada görünen sürüm tek kaynaktan.
 */

const DIR = path.join(process.cwd(), 'src/content/legal');

/**
 * Şirket bilgileri henüz yok; metinlerde yer tutucu duruyor ve buradan
 * dolduruluyor. Uydurma unvan ya da MERSİS numarası yazmak, sözleşmeyi
 * kullanılamaz hâle getirirdi.
 */
const PLACEHOLDERS: Record<string, string | undefined> = {
  COMPANY_LEGAL_NAME: process.env.COMPANY_LEGAL_NAME,
  TRADE_NAME: process.env.TRADE_NAME ?? 'Karınca',
  COMPANY_ADDRESS: process.env.COMPANY_ADDRESS,
  COMPANY_EMAIL: process.env.COMPANY_EMAIL,
  COMPANY_PHONE: process.env.COMPANY_PHONE,
  MERSIS_NO: process.env.MERSIS_NO,
  KEP_ADDRESS: process.env.KEP_ADDRESS,
  TAX_NUMBER: process.env.TAX_NUMBER,
  DPO_CONTACT: process.env.DPO_CONTACT,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
};

/**
 * Doldurulmamış yer tutucu, ekranda ham `{{...}}` olarak KALIYOR.
 *
 * <p>Bilerek: boş bırakmak ya da "-" koymak, eksik şirket bilgisini görünmez
 * yapar ve metin eksikliğiyle yayına çıkar. Ham yer tutucu göze batar ve
 * yayın öncesi kontrol listesinde yakalanır (docs/legal-review-checklist.md).
 */
export function fillPlaceholders(text: string): string {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (raw, key: string) => PLACEHOLDERS[key] ?? raw);
}

export type LegalContent = { slug: string; body: string };

export async function readLegal(slug: string): Promise<LegalContent | null> {
  // Yol geçişi: slug adresten geliyor, dosya sistemine doğrudan verilmez
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const body = await fs.readFile(path.join(DIR, `${slug}.md`), 'utf8');
    return { slug, body: fillPlaceholders(body) };
  } catch {
    return null;
  }
}

export async function legalSlugs(): Promise<string[]> {
  const files = await fs.readdir(DIR);
  return files.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
}
