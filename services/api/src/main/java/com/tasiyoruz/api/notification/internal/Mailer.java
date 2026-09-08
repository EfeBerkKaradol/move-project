package com.tasiyoruz.api.notification.internal;

import com.tasiyoruz.api.identity.api.UserDirectory;
import com.tasiyoruz.api.notification.domain.Notification;
import com.tasiyoruz.api.shared.mail.MailMessage;
import com.tasiyoruz.api.shared.mail.MailSender;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Alıcıyı çözer, postayı gönderir, sonucu kaydeder.
 *
 * <p>Gönderim hatası yukarı fırlatılmıyor: bildirim iş akışını durdurmamalı (teklif
 * verildi ama posta gitmedi diye teklif geri alınmaz). Hata kayda yazılıyor ve
 * operasyon panelinde görünüyor. Kayıt ayrı transaction'da: dinleyici düşse bile
 * "denendi ve şu hatayı verdi" izi kalsın.
 */
@Component
@EnableConfigurationProperties(NotificationProperties.class)
class Mailer {

    private static final Logger log = LoggerFactory.getLogger(Mailer.class);

    /**
     * Sağlayıcı yapılandırılmamışsa gönderim SKIPPED olarak kaydedilir, uygulama açılır.
     *
     * <p>Taşımayı (SMTP mi HTTP mi) burası bilmiyor; {@code shared::mail} seçiyor.
     * Barındırma sağlayıcısı giden SMTP portlarını kapattığında yalnızca o seçim
     * değişiyor, bildirim mantığı aynı kalıyor.
     */
    private final MailSender sender;
    private final UserDirectory users;
    private final NotificationRepository repo;
    private final NotificationProperties props;
    private final Clock clock;

    Mailer(MailSender sender, UserDirectory users, NotificationRepository repo,
           NotificationProperties props, Clock clock) {
        this.sender = sender; this.users = users; this.repo = repo; this.props = props; this.clock = clock;
    }

    String siteUrl() {
        return props.siteUrl();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void send(String recipientId, String kind, String subject, String body) {
        var now = Instant.now(clock);
        var user = users.user(recipientId).orElse(null);
        if (user == null || user.email() == null || user.email().isBlank()) {
            repo.save(Notification.email(recipientId, null, kind, subject, body, Notification.Status.SKIPPED,
                    users.available() ? "Kullanıcının e-postası yok" : "Kimlik rehberi yapılandırılmamış", now));
            log.warn("Bildirim atlandı ({}): alıcı e-postası çözülemedi — {}", kind, recipientId);
            return;
        }
        if (!props.enabled() || !sender.available()) {
            repo.save(Notification.email(recipientId, user.email(), kind, subject, body,
                    Notification.Status.SKIPPED,
                    sender.available() ? "Gönderim kapalı" : "Posta sağlayıcısı yapılandırılmamış", now));
            return;
        }
        var fullSubject = "[KARINCA] " + subject;
        var fullBody = "Merhaba " + user.displayName() + ",\n\n" + body
                + "\n\n—\nKARINCA · " + props.siteUrl()
                + "\nBu posta otomatik gönderildi; yanıtlar okunmuyor.";
        try {
            sender.send(new MailMessage(props.from(), "KARINCA", user.email(), fullSubject, fullBody));
            repo.save(Notification.email(recipientId, user.email(), kind, fullSubject, fullBody,
                    Notification.Status.SENT, null, now));
        } catch (RuntimeException e) {
            repo.save(Notification.email(recipientId, user.email(), kind, fullSubject, fullBody,
                    Notification.Status.FAILED, e.getMessage(), now));
            log.error("E-posta gönderilemedi ({}) → {}: {}", kind, user.email(), e.getMessage());
        }
    }
}
