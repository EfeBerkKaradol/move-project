package com.tasiyoruz.api.shared.mail;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Kendi posta bean'imiz Spring Boot'unkiyle çakışmamalı.
 *
 * <p>Bean metodunun adı {@code mailSender} olduğunda, Boot'un posta yapılandırması
 * aynı adla bir {@code JavaMailSender} üretiyor ve uygulama
 * {@code BeanDefinitionOverrideException} ile hiç açılmıyor.
 *
 * <p>Sinsi tarafı ortama bağlı olması: Boot bu bean'i yalnızca
 * {@code spring.mail.host} tanımlıyken üretiyor. Test yapılandırmasında o değer
 * boş olduğu için çakışma yerelde ve testlerde hiç görünmüyor, yalnızca SMTP
 * tanımlı olan üretimde ortaya çıkıyordu. Bu yüzden test adresi açıkça veriyor.
 */
class MailBeanNameTest {

    @Test
    void smtpAdresiTanimliyken_baglamAcilir() {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(MailSenderAutoConfiguration.class))
                .withUserConfiguration(MailConfig.class)
                .withPropertyValues("spring.mail.host=smtp.ornek.com")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(MailSender.class);
                });
    }
}
