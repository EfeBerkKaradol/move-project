package com.tasiyoruz.api.notification.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Tek bir gönderimin kaydı. Başarısız olsa da yazılır; hata metni kayıtta durur. */
@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    public enum Status { SENT, FAILED, SKIPPED }

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 64) private String recipientId;
    @Column(length = 255) private String recipient;
    @Column(nullable = false, length = 16) private String channel;
    @Column(nullable = false, length = 40) private String kind;
    @Column(nullable = false, length = 200) private String subject;
    @Column(nullable = false, columnDefinition = "text") private String body;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private Status status;
    @Column(columnDefinition = "text") private String error;
    @Column(nullable = false) private Instant createdAt;
    private Instant sentAt;

    public static Notification email(String recipientId, String recipient, String kind, String subject, String body,
                                     Status status, String error, Instant now) {
        var n = new Notification();
        n.recipientId = recipientId;
        n.recipient = recipient;
        n.channel = "EMAIL";
        n.kind = kind;
        n.subject = subject;
        n.body = body;
        n.status = status;
        n.error = error;
        n.createdAt = now;
        n.sentAt = status == Status.SENT ? now : null;
        return n;
    }
}
