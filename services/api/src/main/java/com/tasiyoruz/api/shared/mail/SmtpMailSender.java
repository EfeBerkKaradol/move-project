package com.tasiyoruz.api.shared.mail;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/** Klasik SMTP gönderimi; giden portun açık olduğu ortamlarda. */
class SmtpMailSender implements MailSender {

    private final JavaMailSender sender;

    SmtpMailSender(JavaMailSender sender) {
        this.sender = sender;
    }

    @Override
    public void send(MailMessage message) {
        var msg = new SimpleMailMessage();
        msg.setFrom(message.from());
        msg.setTo(message.to());
        msg.setSubject(message.subject());
        msg.setText(message.body());
        sender.send(msg);
    }

    @Override
    public boolean available() {
        return true;
    }
}
