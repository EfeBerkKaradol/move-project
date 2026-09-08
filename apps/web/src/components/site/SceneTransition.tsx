/**
 * Koyu hero sahnesinden sıcak zemine geçiş bandı.
 *
 * <p>Kendi bileşeni, çünkü hero'ya ait — arkasından hangi bölümün geldiğine değil.
 * Önceden "üç adım" bölümünün içindeydi; o bölüm sıralamada aşağı inince gradyan
 * da onunla birlikte inip sayfanın ortasında koyu bir bant bırakırdı.
 *
 * <p>Rota çizgisi hero'dan devam ediyor: koyu sahneden açık zemine geçiş sert bir
 * kesme değil, aynı hattın sürmesi.
 *
 * <p>Alttaki boşluk bandın kendisinde: arkasından gelen bölüm ekran genişliğine göre
 * değişiyor (telefonda fiyat widget'ı, geniş ekranda koridorlar) ve payı onlara
 * koymak, sayfanın ortasında fazladan boşluk bırakırdı.
 */
export function SceneTransition() {
  return (
    <div aria-hidden className="relative mb-9 h-16 bg-gradient-to-b from-[#171a19] to-bg md:mb-12 md:h-24">
      <svg viewBox="0 0 1200 130" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M0 6C240 6 300 118 540 118S900 20 1200 20" fill="none"
          stroke="var(--route)" strokeWidth={2.5} strokeLinecap="round" opacity="0.55" />
      </svg>
    </div>
  );
}
