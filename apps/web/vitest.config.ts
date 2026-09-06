import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Saf mantık testleri.
 *
 * <p>Bileşen render'ı kapsam dışı: bu projede kırılan şey render değil, biçimlendirme
 * ve süzme kuralları oldu (telefon normalizasyonu, plaka şablonu, il kilidi). Testler
 * oraya konuldu; DOM ortamı kurmak bugün kazanç getirmiyordu.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
