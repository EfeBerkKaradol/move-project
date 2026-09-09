'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BekleyenFotograf,
  fotografEkle,
  fotografSil,
  fotograflariOku,
} from '@/lib/photo-store';
import { EN_FAZLA_FOTOGRAF, fotografSorunu } from '@/lib/uploads';

type Kare = { id: string; name: string; url: string };

/**
 * Yük fotoğrafları — üye olmadan, fiyat adımında.
 *
 * <p>Zorunlu, çünkü teklifi isabetli yapan şey bu: "iki koltuk" yazan ilanla
 * gelen araç sahibi koltuğun kapıdan çıkmadığını yerinde öğreniyordu. Fotoğraf,
 * beyanın yalanlanamayan hâli.
 *
 * <p>Kareler sunucuya gitmiyor, kullanıcının kendi tarayıcısında bekliyor ve
 * ilan yayınlanırken yükleniyor — gerekçesi {@link photo-store} içinde.
 * Önizleme de o yerel kopyadan üretiliyor.
 */
export function CargoPhotoPicker({ onChange }: { onChange: (adet: number) => void }) {
  const [kareler, setKareler] = useState<Kare[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kalici, setKalici] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Adresleri bileşen sökülürken serbest bırakmak için: state'ten okusaydık
  // temizlik etkisi her değişiklikte yeniden kurulur ve hâlâ ekranda olan
  // önizlemeleri iptal ederdi.
  const adresler = useRef<string[]>([]);
  const kareyeCevir = useCallback((k: BekleyenFotograf): Kare => {
    const url = URL.createObjectURL(k.blob);
    adresler.current.push(url);
    return { id: k.id, name: k.name, url };
  }, []);

  /*
   * Girişten dönen kullanıcı fotoğraflarını yeniden seçmesin: Keycloak'a gidip
   * gelmek tam bir sayfa gezinmesi, React durumu kayboluyor, diskteki kopya
   * kalıyor.
   */
  useEffect(() => {
    let iptal = false;
    fotograflariOku()
      .then((kayitlar) => {
        if (iptal) return;
        setKareler(kayitlar.map(kareyeCevir));
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
    // Yalnızca ilk açılışta: sonraki değişiklikleri ekleme/silme yönetiyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      for (const url of adresler.current) URL.revokeObjectURL(url);
    },
    [],
  );

  /*
   * Adet üst bileşene buradan bildiriliyor. Eskiden setKareler'in güncelleyici
   * fonksiyonunun içinden çağrılıyordu; o fonksiyon render sırasında çalışıyor
   * ve React "başka bir bileşen render edilirken state değiştirilemez" diye
   * uyarıyordu. Etki, render bittikten sonra çalışıyor.
   */
  useEffect(() => {
    onChange(kareler.length);
  }, [kareler.length, onChange]);

  const ekle = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setHata(null);

    const yer = EN_FAZLA_FOTOGRAF - kareler.length;
    if (yer <= 0) {
      setHata(`En fazla ${EN_FAZLA_FOTOGRAF} fotoğraf ekleyebilirsin.`);
      return;
    }
    if (files.length > yer) {
      setHata(`Yalnızca ${yer} fotoğraflık yer kaldı; ilk ${yer} tanesi alındı.`);
    }

    const yeni: Kare[] = [];
    for (const file of [...files].slice(0, yer)) {
      const sorun = fotografSorunu(file);
      if (sorun) {
        setHata(sorun);
        continue;
      }
      const { kayit, kalici: yazildi } = await fotografEkle(file);
      if (!yazildi) setKalici(false);
      yeni.push(kareyeCevir(kayit));
    }

    if (yeni.length > 0) setKareler((oncekiler) => [...oncekiler, ...yeni]);

    // Aynı dosya art arda seçilebilsin: değer sıfırlanmazsa ikinci seçim
    // change olayı atmıyor
    if (inputRef.current) inputRef.current.value = '';
  };

  const sil = async (id: string) => {
    const kare = kareler.find((k) => k.id === id);
    if (kare) {
      URL.revokeObjectURL(kare.url);
      adresler.current = adresler.current.filter((u) => u !== kare.url);
    }
    setKareler((oncekiler) => oncekiler.filter((k) => k.id !== id));
    await fotografSil(id);
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="label-mono text-muted">Yükün fotoğrafı</span>
        <span className="label-mono text-muted">
          {kareler.length}/{EN_FAZLA_FOTOGRAF}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        En az bir kare gerekiyor. Eşyanın kendisini çek — kimlik, adres ya da yüz
        görünmesin; bu kareleri teklif veren araç sahipleri görüyor.
      </p>

      {kareler.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {kareler.map((kare) => (
            <li
              key={kare.id}
              className="relative overflow-hidden rounded-field border border-line bg-surface-2"
            >
              {/* next/image yok: dosya yerel bir blob, optimizasyon katmanı okuyamaz */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={kare.url} alt={kare.name} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => sil(kare.id)}
                aria-label={`${kare.name} fotoğrafını kaldır`}
                className="absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-ink/70 text-base leading-none font-bold text-white transition hover:bg-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* capture yok: kamerayı zorlamak, eşyasını zaten fotoğraflamış kullanıcıyı
          galerisine erişemez hâlde bırakıyordu. accept telefonda yine "Fotoğraf
          Çek" seçeneğini sunuyor, seçme hakkını da bırakıyor. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Yük fotoğrafı çek ya da seç"
        onChange={(e) => ekle(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={yukleniyor || kareler.length >= EN_FAZLA_FOTOGRAF}
        className="mt-3 min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-route hover:bg-surface-2 disabled:opacity-60"
      >
        {kareler.length === 0 ? 'Fotoğraf ekle' : 'Bir kare daha ekle'}
      </button>

      {hata && <p className="mt-2 text-sm text-[#8a2a1f]">{hata}</p>}

      <p className="mt-2 text-xs text-muted">
        Fotoğraflar bu adımda yüklenmiyor; ilanı yayınlarken gönderiliyor.
      </p>
      {/* Gizli sekmede ve site verisi kapalı tarayıcılarda disk yok. Kareler o
          sayfa açık kaldığı sürece çalışıyor ama girişten sonra kayboluyor;
          kullanıcı bunu yayınlama anında öğrenmesin. */}
      {!kalici && (
        <p className="mt-2 text-xs text-[#8a2a1f]">
          Tarayıcın dosyaları saklamıyor — girişten sonra fotoğrafları tekrar seçmen
          gerekebilir.
        </p>
      )}
    </div>
  );
}
