package com.tasiyoruz.api.identity.internal;

import com.tasiyoruz.api.shared.sms.SmsSender;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Gönderilen mesajları tutan test göndericisi; koda testten erişebilmek için. */
@TestConfiguration
class RecordingSmsSender implements SmsSender {

    record Sent(String phone, String message) {}

    private final List<Sent> sent = new ArrayList<>();

    @Bean
    @Primary
    SmsSender recordingSmsSender() {
        return this;
    }

    @Override
    public synchronized void send(String phone, String message) {
        sent.add(new Sent(phone, message));
    }

    @Override
    public boolean available() {
        return true;
    }

    synchronized void clear() { sent.clear(); }

    synchronized int count() { return sent.size(); }

    /** Son mesajdaki altı haneli kod. */
    synchronized String lastCode() {
        var m = java.util.regex.Pattern.compile("\\b(\\d{6})\\b").matcher(sent.getLast().message());
        if (!m.find()) throw new AssertionError("Mesajda kod yok: " + sent.getLast().message());
        return m.group(1);
    }

    synchronized String lastPhone() { return sent.getLast().phone(); }
}
