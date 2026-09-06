package com.tasiyoruz.api.tracking.api;

/** Taşıma sırasında çekilen kare türü. */
public enum TripPhotoKind {
    /** Yükleme anı — yükün taşıyıcıya hangi durumda teslim edildiği. */
    PICKUP("Yükleme"),
    /** Teslim anı — teslim kanıtının kendisi. */
    DELIVERY("Teslim"),
    /** Hasar kaydı; hem taşıyıcı hem yük sahibi yükleyebilir. */
    DAMAGE("Hasar");

    private final String displayName;

    TripPhotoKind(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }
}
