package com.tasiyoruz.api.identity.internal;

import java.util.Optional;

/**
 * Türkiye cep numarası normalleştirme.
 *
 * <p>Kullanıcı numarayı beş farklı biçimde yazıyor: {@code 0532 123 45 67},
 * {@code +90 532 ...}, {@code 90532...}, {@code 532...}. Hepsi aynı numara; ham
 * hâlleriyle saklanırsa "bu numara zaten kayıtlı" kontrolü işe yaramaz ve aynı
 * kişi farklı yazımlarla birden çok hesap doğrulayabilir.
 */
final class PhoneNumbers {

    private PhoneNumbers() {}

    /**
     * E.164 biçimine çevirir ({@code +905321234567}); geçersizse boş döner.
     *
     * <p>Yalnızca Türkiye cep numaraları kabul ediliyor: doğrulama SMS'i gönderiyoruz
     * ve sabit hatta SMS gitmiyor. Cep numaraları 5 ile başlar.
     */
    static Optional<String> normalize(String raw) {
        if (raw == null) return Optional.empty();
        var digits = raw.replaceAll("\\D", "");

        if (digits.startsWith("90") && digits.length() == 12) digits = digits.substring(2);
        else if (digits.startsWith("0") && digits.length() == 11) digits = digits.substring(1);

        if (digits.length() != 10 || !digits.startsWith("5")) return Optional.empty();
        return Optional.of("+90" + digits);
    }

    /** Kullanıcıya gösterim: {@code +90 532 123 45 67}. */
    static String display(String e164) {
        if (e164 == null || e164.length() != 13) return e164;
        var d = e164.substring(3);
        return "+90 " + d.substring(0, 3) + " " + d.substring(3, 6) + " " + d.substring(6, 8) + " " + d.substring(8);
    }

    /**
     * Maskeli gösterim: {@code +90 5** *** ** 67}.
     *
     * <p>Son iki hane duruyor çünkü teyit için o yetiyor — "aradığım numara bu
     * mu?" sorusu son hanelerle cevaplanıyor. Operatör kodu da duruyor: araç
     * sahibi numaranın gerçek bir cep numarası olduğunu görebilmeli.
     */
    static String mask(String e164) {
        var gosterim = display(e164);
        if (gosterim == null || gosterim.length() < 4) return gosterim;
        // "+90 5" korunuyor, son iki hane korunuyor, arası yıldız
        var bas = gosterim.substring(0, Math.min(5, gosterim.length()));
        var son = gosterim.substring(gosterim.length() - 2);
        var orta = gosterim.substring(bas.length(), gosterim.length() - 2)
                .replaceAll("[0-9]", "*");
        return bas + orta + son;
    }
}
