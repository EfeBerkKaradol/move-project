package com.tasiyoruz.api.notification.internal;

import com.tasiyoruz.api.notification.api.NotificationLog;
import com.tasiyoruz.api.notification.api.NotificationView;
import com.tasiyoruz.api.notification.domain.Notification;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
class DefaultNotificationLog implements NotificationLog {

    private final NotificationRepository repo;

    DefaultNotificationLog(NotificationRepository repo) {
        this.repo = repo;
    }

    @Override
    public List<NotificationView> recent(int limit) {
        return repo.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Math.min(Math.max(limit, 1), 200)))
                .stream().map(DefaultNotificationLog::view).toList();
    }

    @Override
    public List<NotificationView> forRecipient(String recipientId) {
        return repo.findByRecipientIdOrderByCreatedAtDesc(recipientId).stream().map(DefaultNotificationLog::view).toList();
    }

    static NotificationView view(Notification n) {
        return new NotificationView(n.getId().toString(), n.getRecipientId(), n.getRecipient(), n.getKind(),
                n.getSubject(), n.getStatus().name(), n.getError(), n.getCreatedAt(), n.getSentAt());
    }
}
