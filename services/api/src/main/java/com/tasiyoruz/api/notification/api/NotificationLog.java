package com.tasiyoruz.api.notification.api;

import java.util.List;

/** Bildirim geçmişi (operasyon paneli). */
public interface NotificationLog {
    List<NotificationView> recent(int limit);
    List<NotificationView> forRecipient(String recipientId);
}
