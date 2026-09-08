package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.ordering.domain.ListingPhoto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ListingPhotoRepository extends JpaRepository<ListingPhoto, UUID> {

    List<ListingPhoto> findByListingIdOrderByUploadedAtAsc(UUID listingId);

    List<ListingPhoto> findByListingIdInOrderByUploadedAtAsc(List<UUID> listingIds);

    /** Yayınlanmadan bırakılmış yüklemeler. */
    List<ListingPhoto> findByListingIdIsNullAndUploadedAtBefore(Instant cutoff);
}
