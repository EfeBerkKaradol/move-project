package com.tasiyoruz.api.notification.internal;

import com.tasiyoruz.api.identity.api.UserDirectory;
import com.tasiyoruz.api.notification.domain.Notification;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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

    /** SMTP yapılandırılmamışsa bean yok; gönderim SKIPPED olarak kaydedilir, uygulama açılır. */
    private final ObjectProvider<JavaMailSender> sender;
    private final UserDirectory users;
    private final NotificationRepository repo;
    private final NotificationProperties props;
    private final Clock clock;

    Mailer(ObjectProvider<JavaMailSender> sender, UserDirectory users, NotificationRepository repo,
           NotificationProperties props, Clock clock) {
        this.sender = sender; this.users = users; this.repo = repo; this.props = props; this.clock = clock;
        if (sender.getIfAvailable() == null) {
            log.warn("SMTP yapılandırılmamış (spring.mail.host boş) — bildirimler yalnızca kayda yazılır (ANAHTARLAR #20)");
        }
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
        var mail = sender.getIfAvailable();
        if (!props.enabled() || mail == null) {
            repo.save(Notification.email(recipientId, user.email(), kind, subject, body,
                    Notification.Status.SKIPPED, mail == null ? "SMTP yapılandırılmamış" : "Gönderim kapalı", now));
            return;
        }
        var fullSubject = "[Taşıyoruz] " + subject;
        var fullBody = "Merhaba " + user.displayName() + ",\n\n" + body
                + "\n\n—\nTaşıyoruz · " + props.siteUrl()
                + "\nBu posta otomatik gönderildi; yanıtlar okunmuyor.";
        try {
            var msg = new SimpleMailMessage();
            msg.setFrom(props.from());
            msg.setTo(user.email());
            msg.setSubject(fullSubject);
            msg.setText(fullBody);
            mail.send(msg);
            repo.save(Notification.email(recipientId, user.email(), kind, fullSubject, fullBody,
                    Notification.Status.SENT, null, now));
        } catch (RuntimeException e) {
            repo.save(Notification.email(recipientId, user.email(), kind, fullSubject, fullBody,
                    Notification.Status.FAILED, e.getMessage(), now));
            log.error("E-posta gönderilemedi ({}) → {}: {}", kind, user.email(), e.getMessage());
        }
    }
}
