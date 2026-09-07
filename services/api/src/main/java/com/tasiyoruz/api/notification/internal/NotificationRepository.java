package com.tasiyoruz.api.notification.internal;

import com.tasiyoruz.api.notification.domain.Notification;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findAllByOrderByCreatedAtDesc(Pageable page);
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId);
}
