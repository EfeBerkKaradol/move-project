package com.tasiyoruz.api.shared.mail;

/**
 * Gönderilecek posta.
 *
 * @param from     gönderen adresi; sağlayıcıda doğrulanmış olmalı
 * @param fromName gönderen görünen adı
 * @param to       alıcı adresi
 * @param subject  konu
 * @param body     düz metin gövde
 */
public record MailMessage(String from, String fromName, String to, String subject, String body) {}
