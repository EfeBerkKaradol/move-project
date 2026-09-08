package com.tasiyoruz.api.ordering.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Yük fotoğrafı.
 *
 * <p>İlandan önce yükleniyor ve yayın anında ona iliştiriliyor: kullanıcı kareleri
 * seçerken görsün, yanlışını silsin istiyoruz — ilan ise ancak geçerli bir beyanla
 * oluşuyor. Bu yüzden {@code listingId} bir süre boş kalıyor. Hiç iliştirilmeyen
 * kayıtları süpürme işi topluyor.
 */
@Entity
@Table(name = "listing_photos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ListingPhoto {

    @Id @GeneratedValue private UUID id;
    private UUID listingId;
    @Column(nullable = false, length = 64) private String ownerId;
    @Column(nullable = false) private String storageKey;
    @Column(nullable = false, length = 80) private String contentType;
    @Column(nullable = false) private long sizeBytes;
    @Column(nullable = false) private Instant uploadedAt;
    private Instant attachedAt;

    public static ListingPhoto uploaded(String ownerId, String storageKey, String contentType,
                                        long sizeBytes, Instant now) {
        var p = new ListingPhoto();
        p.ownerId = ownerId;
        p.storageKey = storageKey;
        p.contentType = contentType;
        p.sizeBytes = sizeBytes;
        p.uploadedAt = now;
        return p;
    }

    public boolean isOwnedBy(String userId) {
        return ownerId.equals(userId);
    }

    public boolean isAttached() {
        return listingId != null;
    }

    void attachTo(UUID listingId, Instant now) {
        this.listingId = listingId;
        this.attachedAt = now;
    }
}
