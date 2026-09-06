package com.tasiyoruz.api.shared.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Nesne deposu ayarları.
 *
 * @param endpoint      S3 uç noktası; boş bırakılırsa gerçek AWS varsayılanı kullanılır
 * @param region        bölge adı
 * @param bucket        kova adı
 * @param accessKey     erişim anahtarı
 * @param secretKey     gizli anahtar
 * @param pathStyle     MinIO yol biçimli erişim ister; sanal-host biçimi localhost'ta çalışmaz
 * @param createBucket  açılışta kova yoksa oluşturulsun mu (yerel geliştirme kolaylığı)
 */
@ConfigurationProperties(prefix = "tasiyoruz.storage")
public record StorageProperties(
        String endpoint,
        String region,
        String bucket,
        String accessKey,
        String secretKey,
        boolean pathStyle,
        boolean createBucket) {

    public StorageProperties {
        region = region == null || region.isBlank() ? "us-east-1" : region;
        bucket = bucket == null || bucket.isBlank() ? "tasiyoruz-belgeler" : bucket;
    }

    /** Anahtarlar verilmemişse depo yapılandırılmamıştır; belge yükleme kapalı çalışır. */
    public boolean configured() {
        return accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank();
    }
}
