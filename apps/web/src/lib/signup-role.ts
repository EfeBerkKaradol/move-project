/**
 * Kayıt akışının iki yüzü.
 *
 * <p>Tek bir "Hesap oluştur" ekranı iki farklı kullanıcıyı aynı kapıdan
 * alıyordu: yükü olan kişiye belge yükleme anlatılıyor, aracı olan kişiye ise
 * sonra ne yapacağı hiç söylenmiyordu. Kimin geldiği <strong>nereden</strong>
 * geldiğinden belli — "Yük ver" düğmesi yük verenden, "Yük bul" araç
 * sahibinden gelir — ve bu bilgi URL'de taşınıyor.
 *
 * <p>Rol bir <em>yetki</em> değil bir <em>yönlendirme</em>: Keycloak yeni
 * kaydolan herkese CUSTOMER veriyor, taşıyıcılık ancak belgeler onaylanınca
 * açılıyor. Burada seçilen şey, kullanıcının kayıt sonrası nereye gideceği ve
 * ona ne anlatıldığı.
 */
export type SignupRole = 'yuk-veren' | 'tasiyici';

export type RoleCopy = {
  role: SignupRole;
  /** Giriş ekranının başlığı. */
  title: string;
  /** Hesabın neden gerektiğini tek cümlede anlatan satır. */
  lead: string;
  /** Kayıt düğmesinin metni. */
  signupLabel: string;
  /** Kayıttan sonra gidilecek yer (callbackUrl verilmediyse). */
  landing: string;
  /** Kayıttan sonra istenecekler; kullanıcı önceden bilsin. */
  next: string[];
  /** Diğer role geçiş bağlantısının metni. */
  switchLabel: string;
};

const COPY: Record<SignupRole, RoleCopy> = {
  'yuk-veren': {
    role: 'yuk-veren',
    title: 'Yük veren hesabı',
    lead: 'Fiyat görmek için hesap gerekmiyor. Hesap yalnızca ilanı yayınlarken ve teklifleri görürken lazım.',
    signupLabel: 'Yük veren olarak kaydol',
    landing: '/panel',
    next: [
      'Belge istemiyoruz — yükünü tarif etmen yeterli.',
      'İlanda yükün fotoğrafı ve kalem listesi isteniyor; adresin yalnızca işi alan araç sahibine açılıyor.',
      'Teklifler paneline düşüyor, seçimi sen yapıyorsun.',
    ],
    switchLabel: 'Aracım var, taşıyıcı olmak istiyorum',
  },
  tasiyici: {
    role: 'tasiyici',
    title: 'Araç sahibi hesabı',
    lead: 'İlanları görmek için hesap gerekmiyor. Teklif verebilmek için başvurunun onaylanması gerekiyor.',
    signupLabel: 'Araç sahibi olarak kaydol',
    landing: '/sofor-ol',
    next: [
      'Araç tipin ve plakan soruluyor.',
      'Ehliyet, ruhsat ve sigorta belgelerini yüklüyorsun.',
      'Belgeler onaylanınca teklif verme açılıyor — başvuru ücretsiz.',
    ],
    switchLabel: 'Yüküm var, taşıtmak istiyorum',
  },
};

/** Tanınmayan değerde yük verene düşüyor: çoğunluk oradan geliyor. */
export function roleCopy(raw: string | undefined | null): RoleCopy {
  return raw === 'tasiyici' ? COPY.tasiyici : COPY['yuk-veren'];
}

/** Karşı rolün aynı ekranı; "yanlış kapıdayım" diyen kullanıcı için. */
export function otherRole(role: SignupRole): RoleCopy {
  return role === 'tasiyici' ? COPY['yuk-veren'] : COPY.tasiyici;
}

/** Giriş/kayıt adresini rolüyle birlikte kurar. */
export function girisHref(role: SignupRole, callbackUrl?: string | null): string {
  const q = new URLSearchParams({ rol: role });
  if (callbackUrl) q.set('callbackUrl', callbackUrl);
  return `/giris?${q}`;
}
