package com.tasiyoruz.api.corridor.internal;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;

/**
 * Eşleşme puanı (docs/11 §3).
 *
 * <p>Doküman puanı {@code w1·(1/sapmaKm) + w2·zamanUyumu + w3·taşıyıcıPuanı + w4·tutar}
 * olarak yazıyor. Ham {@code 1/sapmaKm} kullanılmadı: sapma sıfıra yaklaşınca sonsuza
 * gidiyor ve tek bir bileşen diğerlerini eziyor. Bunun yerine her bileşen 0-1 aralığına
 * çekildi, ağırlıklar toplamı 1; böylece puan koridorlar arasında karşılaştırılabilir
 * ve veritabanında {@code CHECK (score BETWEEN 0 AND 1)} ile doğrulanabiliyor.
 *
 * <p><strong>Taşıyıcı puanı bileşeni yok.</strong> Değerlendirme modülü henüz boş;
 * olmayan bir veriyi sabit 1 ile doldurmak puanı sessizce bozardı. Modül geldiğinde
 * ağırlıklar yeniden dağıtılacak.
 */
final class MatchScoring {

    /** Sapma en ağır bileşen: koridorun varlık sebebi rotayı bozmadan yük bulmak. */
    static final double W_DETOUR = 0.50;
    static final double W_TIME = 0.30;
    static final double W_VALUE = 0.20;

    /**
     * Tutar bileşeninin yarı doyum noktası: sapma kilometresi başına bu kadar TL
     * kazandıran iş 0,5 alır. Gerçek veriyle kalibre edilecek başlangıç değeri;
     * mutlak değeri değil, işler arası sıralaması önemli.
     */
    static final double REFERENCE_TRY_PER_KM = 120.0;

    /** Sapmasız iş için kilometre başına kazanç hesabında kullanılan taban. */
    private static final double MIN_DETOUR_KM = 1.0;

    private MatchScoring() {}

    /**
     * @param detourKm    ilanın koridora eklediği ekstra yol
     * @param toleranceKm taşıyıcının kabul ettiği en fazla sapma
     */
    static double detourFit(double detourKm, int toleranceKm) {
        if (toleranceKm <= 0) return detourKm <= 0 ? 1.0 : 0.0;
        return clamp(1.0 - detourKm / toleranceKm);
    }

    /**
     * İlanın alış penceresiyle koridorun kalkış penceresinin örtüşme oranı.
     * Payda ilanın penceresi: taşıyıcının geniş penceresi, dar pencereli bir ilanı
     * haksız yere düşük puanlamasın.
     */
    static double timeFit(Instant listingFrom, Instant listingTo,
                          Instant corridorFrom, Instant corridorTo) {
        long listingWindow = Duration.between(listingFrom, listingTo).toSeconds();
        // Nokta zamanlı ilan (alış saati kesin verilmiş): örtüşme süresi hep sıfır
        // çıkar, oran hesaplanamaz. Kapsama sorusuna çevriliyor — aksi hâlde böyle
        // bir ilan hiçbir koridorla eşleşmezdi.
        if (listingWindow <= 0) {
            return !listingFrom.isBefore(corridorFrom) && !listingFrom.isAfter(corridorTo) ? 1.0 : 0.0;
        }
        var start = listingFrom.isAfter(corridorFrom) ? listingFrom : corridorFrom;
        var end = listingTo.isBefore(corridorTo) ? listingTo : corridorTo;
        long overlap = Duration.between(start, end).toSeconds();
        if (overlap <= 0) return 0.0;
        return clamp((double) overlap / listingWindow);
    }

    /** Sapma kilometresi başına kazanç, doyuma giden bir eğriyle 0-1 aralığında. */
    static double valueFit(BigDecimal amount, double detourKm) {
        double perKm = amount.doubleValue() / Math.max(detourKm, MIN_DETOUR_KM);
        return perKm / (perKm + REFERENCE_TRY_PER_KM);
    }

    static double score(double detourFit, double timeFit, double valueFit) {
        return clamp(W_DETOUR * detourFit + W_TIME * timeFit + W_VALUE * valueFit);
    }

    private static double clamp(double v) {
        return v < 0 ? 0 : v > 1 ? 1 : v;
    }
}
