package com.tasiyoruz.api.compliance.internal;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Serbest metinde yasaklı eşya işareti arar.
 *
 * <p><strong>Ne yaptığı:</strong> ilan açıklamasında geçen birkaç anahtar kelimeyi
 * bulur ve incelemeye alınmasını önerir. <strong>Ne yapmadığı:</strong> karar
 * vermez, engellemez, kimseyi suçlamaz. Kelime eşleşmesi kaba bir sinyaldir —
 * "silah" kelimesi bir av tüfeği ruhsatı kadar bir oyuncakta da geçer. Bu yüzden
 * çıktı bir bayrak değil, bir insana yönelen bir not.
 *
 * <p>Liste bilinçli olarak KISA: uzun bir kelime listesi yanlış pozitifi artırır,
 * inceleme sırasını doldurur ve gerçek vakayı gürültüde bırakır. Asıl koruma
 * kelime taraması değil, göndericinin işlem bazında verdiği beyandır.
 */
@Component
class ProhibitedItemScanner {

    /** Yasaklı eşya politikasındaki kategorilerle hizalı çekirdek işaretler. */
    private static final List<String> SIGNALS = List.of(
            "uyusturucu", "esrar", "eroin", "kokain", "metamfetamin",
            "silah", "tabanca", "tufek", "mermi", "muhimmat", "patlayici", "dinamit",
            "kacak", "kacakcilik", "calinti", "sahte urun", "replika saat",
            "tarihi eser", "sikke koleksiyon");

    /**
     * @return eşleşen işaretler; boşsa dikkat çeken bir şey yok
     */
    Set<String> scan(String... texts) {
        var found = new LinkedHashSet<String>();
        for (var text : texts) {
            if (text == null || text.isBlank()) continue;
            var normalized = normalize(text);
            for (var signal : SIGNALS) {
                if (normalized.contains(signal)) found.add(signal);
            }
        }
        return found;
    }

    /**
     * Türkçe karakterleri ve büyük/küçük harfi eşitler.
     *
     * <p>Bunsuz "UYUŞTURUCU" ve "uyuşturucu" farklı katarlar olurdu; taramanın
     * kaçırdığı en basit durum bu.
     */
    private static String normalize(String value) {
        return value.toLowerCase(java.util.Locale.forLanguageTag("tr"))
                .replace('ı', 'i').replace('ğ', 'g').replace('ü', 'u')
                .replace('ş', 's').replace('ö', 'o').replace('ç', 'c')
                .replace('â', 'a').replace('î', 'i').replace('û', 'u');
    }
}
