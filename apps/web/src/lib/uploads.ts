/**
 * Yük fotoğrafı kabul kuralları — sunucudaki {@code UploadValidation} ile aynı.
 *
 * <p>Tek yerde duruyor çünkü fotoğraf artık iki ayrı ekrandan seçiliyor (fiyat
 * adımı ve ilan formu) ve üçüncü bir kopya, birinde sıkılaştırılan kuralın
 * diğerinde gevşek kalması demekti.
 *
 * <p>Sunucu kuralı yine de zorunlu: buradaki kontrol istemcide, atlanabilir.
 * Buradaki kontrolün işi güvenlik değil <em>zamanlama</em> — kullanıcı reddi,
 * üye olduktan sonra yayınlama anında değil, dosyayı seçtiği anda görsün.
 */

/** Sunucunun kabul ettiği fotoğraf tipleri (PDF yük fotoğrafı için anlamsız). */
export const KABUL_EDILEN_TIPLER = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
];

/** 8 MB — sunucudaki MAX_SIZE_BYTES ile aynı. */
export const EN_BUYUK_BAYT = 8 * 1024 * 1024;

/** Bir ilana bu kadar kare yetiyor; ötesi teklif verenin işini kolaylaştırmıyor. */
export const EN_FAZLA_FOTOGRAF = 10;

/** Dosya kabul edilebilir mi; değilse kullanıcıya gösterilecek sebep. */
export function fotografSorunu(file: { name: string; type: string; size: number }): string | null {
  // Bazı Android tarayıcıları HEIC için boş tip gönderiyor; uzantıya bakmak
  // yerine sunucuya bırakılıyor, burada yalnızca bilinen kötü durum eleniyor
  if (file.type && !KABUL_EDILEN_TIPLER.includes(file.type.toLowerCase())) {
    return `${file.name} bir fotoğraf değil (JPEG, PNG, HEIC ya da WebP olmalı).`;
  }
  if (file.size <= 0) return `${file.name} boş.`;
  if (file.size > EN_BUYUK_BAYT) {
    return `${file.name} ${EN_BUYUK_BAYT / 1024 / 1024} MB'tan büyük.`;
  }
  return null;
}
