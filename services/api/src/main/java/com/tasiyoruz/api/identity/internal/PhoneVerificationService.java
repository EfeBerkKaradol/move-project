package com.tasiyoruz.api.identity.internal;

import com.tasiyoruz.api.identity.api.PhoneDirectory;
import com.tasiyoruz.api.identity.api.PhoneView;
import com.tasiyoruz.api.identity.domain.PhoneVerification;
import com.tasiyoruz.api.identity.domain.UserPhone;
import com.tasiyoruz.api.shared.sms.SmsSender;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Telefon doğrulama akışı.
 *
 * <p>Altı haneli bir kodun tek başına güvenlik değeri yok; değeri sınırlardan
 * geliyor. Üçü birden uygulanıyor: kod beş dakikada geçersizleşiyor, yanlış deneme
 * sayısı sınırlı, ve saatte gönderilebilecek kod adedi sınırlı. Biri eksik olursa
 * diğerleri anlamsızlaşıyor — sınırsız deneme altı haneyi saniyeler içinde bulur,
 * sınırsız gönderim ise numarayı SMS'e boğar ve faturayı şişirir.
 *
 * <p>Yanlış kod istisna fırlatmıyor, sonuç döndürüyor: istisna işlemi geri alırdı ve
 * deneme sayacı hiç artmazdı — sınırın kendisi böyle sessizce işlevsiz kalırdı.
 */
@Service
class PhoneVerificationService implements PhoneDirectory {

    private static final Logger log = LoggerFactory.getLogger(PhoneVerificationService.class);
    private static final BCryptPasswordEncoder HASHER = new BCryptPasswordEncoder();
    private static final SecureRandom RANDOM = new SecureRandom();

    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_CODES_PER_HOUR = 3;

    /** Doğrulama denemesinin sonucu; HTTP karşılığını denetleyici veriyor. */
    enum Result { OK, NO_PENDING, EXPIRED, TOO_MANY_ATTEMPTS, WRONG_CODE, PHONE_TAKEN }

    private final UserPhoneRepository phones;
    private final PhoneVerificationRepository verifications;
    private final SmsSender sms;
    private final Clock clock;

    PhoneVerificationService(UserPhoneRepository phones, PhoneVerificationRepository verifications,
                             SmsSender sms, Clock clock) {
        this.phones = phones;
        this.verifications = verifications;
        this.sms = sms;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<String> verifiedPhone(String userId) {
        return phones.findById(userId).map(UserPhone::phone);
    }

    @Override
    public Optional<String> maskedVerifiedPhone(String userId) {
        return verifiedPhone(userId).map(PhoneNumbers::mask);
    }

    @Transactional(readOnly = true)
    PhoneView current(String userId) {
        return phones.findById(userId)
                .map(p -> new PhoneView(PhoneNumbers.display(p.phone()), p.verifiedAt(), sms.available()))
                .orElseGet(() -> PhoneView.none(sms.available()));
    }

    /** Kodu üretir, kaydeder ve gönderir. Sağlayıcı yoksa {@link SmsSender} 503 fırlatır. */
    @Transactional
    StartResult start(String userId, String rawPhone) {
        var phone = PhoneNumbers.normalize(rawPhone).orElse(null);
        if (phone == null) return new StartResult(StartOutcome.INVALID_PHONE, null);

        var now = Instant.now(clock);
        if (verifications.countSince(userId, now.minus(Duration.ofHours(1))) >= MAX_CODES_PER_HOUR) {
            return new StartResult(StartOutcome.TOO_MANY_REQUESTS, null);
        }
        // Numara başkasının doğrulanmış numarasıysa kod hiç gönderilmiyor: aksi hâlde
        // sistem, girilen numaranın kayıtlı olup olmadığını SMS ile sızdırırdı.
        var owner = phones.findByPhone(phone);
        if (owner.isPresent() && !owner.get().userId().equals(userId)) {
            return new StartResult(StartOutcome.PHONE_TAKEN, null);
        }

        var code = String.format("%06d", RANDOM.nextInt(1_000_000));
        verifications.save(new PhoneVerification(userId, phone, HASHER.encode(code), now, now.plus(CODE_TTL)));
        sms.send(phone, "KARINCA doğrulama kodun: " + code + " (5 dakika geçerli)");
        log.info("Telefon doğrulama kodu gönderildi: kullanıcı={} numara={}", userId, maskOf(phone));
        return new StartResult(StartOutcome.SENT, PhoneNumbers.display(phone));
    }

    @Transactional
    Result verify(String userId, String code) {
        var now = Instant.now(clock);
        var pending = verifications.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(userId).orElse(null);
        if (pending == null) return Result.NO_PENDING;
        if (!pending.usable(now)) return Result.EXPIRED;
        if (pending.attempts() >= MAX_ATTEMPTS) return Result.TOO_MANY_ATTEMPTS;

        pending.recordAttempt();
        if (!HASHER.matches(code == null ? "" : code.trim(), pending.codeHash())) return Result.WRONG_CODE;

        // Kod gönderildikten sonra numarayı başkası doğrulamış olabilir
        var owner = phones.findByPhone(pending.phone());
        if (owner.isPresent() && !owner.get().userId().equals(userId)) return Result.PHONE_TAKEN;

        pending.consume(now);
        phones.findById(userId)
                .ifPresentOrElse(existing -> existing.changeTo(pending.phone(), now),
                        () -> phones.save(new UserPhone(userId, pending.phone(), now)));
        log.info("Telefon doğrulandı: kullanıcı={} numara={}", userId, maskOf(pending.phone()));
        return Result.OK;
    }

    enum StartOutcome { SENT, INVALID_PHONE, TOO_MANY_REQUESTS, PHONE_TAKEN }

    record StartResult(StartOutcome outcome, String phone) {}

    /** Kayda tam numara yazılmıyor; sunucu kaydını gören herkes numarayı görmesin. */
    private static String maskOf(String e164) {
        return e164.substring(0, 6) + "***" + e164.substring(e164.length() - 2);
    }
}
