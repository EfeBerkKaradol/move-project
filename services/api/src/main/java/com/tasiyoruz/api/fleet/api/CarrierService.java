package com.tasiyoruz.api.fleet.api;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** Taşıyıcı başvurusu, belge yükleme ve operasyon incelemesi. */
public interface CarrierService {

    /** Başvuru yoksa açar, varsa günceller. Onaylı başvuru düzenlenemez. */
    CarrierProfileView apply(String carrierId, CarrierApplicationRequest request);

    Optional<CarrierProfileView> profileOf(String carrierId);

    /** Aynı türden ikinci yükleme öncekinin üzerine yazar ve onayı sıfırlar. */
    CarrierProfileView uploadDocument(String carrierId, DocumentKind kind, LocalDate expiresOn, UploadedFile file);

    /** Belgeyi hem depodan hem kayıttan siler. */
    CarrierProfileView deleteDocument(String carrierId, String documentId);

    /** Zorunlu belgeler tamamsa başvuruyu incelemeye gönderir. */
    CarrierProfileView submitForReview(String carrierId);

    /** Belge dosyasını indirir; yalnızca sahibi ya da operasyon erişebilir. */
    DocumentDownload download(String requesterId, boolean operationsRole, String documentId);

    // ── Operasyon ────────────────────────────────────────────────────

    List<CarrierProfileView> pendingReview();

    CarrierProfileView reviewDocument(String documentId, ReviewDecision decision);

    CarrierProfileView reviewProfile(String carrierId, ReviewDecision decision);

    /** Süresi dolan belgeleri işaretler ve taşıyıcıyı askıya alır (FR-2.4). */
    int expireOverdueDocuments();

    record DocumentDownload(java.io.InputStream content, String contentType, long size, String filename) {}
}
