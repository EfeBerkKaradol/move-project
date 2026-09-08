package com.tasiyoruz.api.compliance.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** İlgili kişinin KVKK kapsamındaki başvurusu. */
@Entity
@Table(name = "data_requests")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class DataRequest {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 64) private String userId;
    @Column(nullable = false, length = 32) private String requestType;
    @Column(columnDefinition = "text") private String detail;
    @Column(nullable = false, length = 16) private String status;
    @Column(nullable = false) private Instant createdAt;
    private Instant handledAt;
    @Column(length = 64) private String handledBy;
    @Column(columnDefinition = "text") private String response;

    public static DataRequest of(String userId, String requestType, String detail, Instant now) {
        var d = new DataRequest();
        d.userId = userId;
        d.requestType = requestType;
        d.detail = detail;
        d.status = "OPEN";
        d.createdAt = now;
        return d;
    }

    void handle(String status, String response, String handledBy, Instant now) {
        this.status = status;
        this.response = response;
        this.handledBy = handledBy;
        this.handledAt = now;
    }
}
