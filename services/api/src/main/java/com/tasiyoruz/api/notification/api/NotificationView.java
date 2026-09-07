package com.tasiyoruz.api.notification.api;

import java.time.Instant;

/** Gönderim kaydı; operasyon "posta gitti mi" sorusuna bakıyor. */
public record NotificationView(
        String id, String recipientId, String recipient, String kind, String subject,
        String status, String error, Instant createdAt, Instant sentAt) {}
