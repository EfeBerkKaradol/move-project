package com.tasiyoruz.api.identity.internal;

import com.tasiyoruz.api.identity.domain.PhoneVerification;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, UUID> {

    /** Kullanıcının en son açık denemesi; kod her zaman sonuncusuna karşı doğrulanır. */
    Optional<PhoneVerification> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(String userId);

    /** Saatlik istek sayısı — aynı numaraya arka arkaya SMS yağdırılmasını engelliyor. */
    @Query("select count(v) from PhoneVerification v where v.userId = :userId and v.createdAt > :since")
    long countSince(@Param("userId") String userId, @Param("since") Instant since);
}
