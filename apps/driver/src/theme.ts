/**
 * Uygulamanın tema katmanı.
 *
 * <p>Renkler {@link @tasiyoruz/theme}'den geliyor; burada yalnızca React Native'in
 * ihtiyaç duyduğu biçime (StyleSheet değerleri, font aileleri) çevriliyor. Sabit
 * renk kodu yazılmaz — web ile ayrışma testle kırılıyor.
 */
import { accent, cream, dark, radius, touch, typography } from '@tasiyoruz/theme';

export const colors = { ...accent, cream, dark } as const;
export { radius, touch };

/**
 * Yazı tipleri Google Fonts'tan paketle birlikte geliyor, çalışma anında
 * indirilmiyor: sürücünün şebekesi zayıf olabilir ve yazı tipi bekleyen bir ekran
 * boş görünür (web tarafında da fontlar self-host ediliyor, aynı gerekçe).
 */
export const fonts = {
  sans: 'Archivo_400Regular',
  sansBold: 'Archivo_700Bold',
  sansBlack: 'Archivo_800ExtraBold',
  mono: 'IBMPlexMono_400Regular',
  monoBold: 'IBMPlexMono_700Bold',
} as const;

/** Küçük büyük harfli etiket — web'deki .label-mono karşılığı. */
export const label = {
  fontFamily: fonts.mono,
  fontSize: typography.label.size,
  letterSpacing: typography.label.letterSpacing,
  textTransform: 'uppercase',
} as const;

/**
 * Türkçe büyük harf. `textTransform: 'uppercase'` yerel ayarı tanımıyor:
 * "tarife tahmini" → "TARIFE TAHMINI" oluyor, noktalı İ kayboluyor. Etiket
 * metinleri buradan geçirilir; stilin uppercase'i önceden büyütülmüş metne dokunmaz.
 */
export const buyukHarf = (metin: string) => metin.toLocaleUpperCase('tr-TR');
