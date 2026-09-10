package com.tasiyoruz.api.ordering.internal;

import static com.tasiyoruz.api.ordering.internal.MarketplaceExceptions.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tasiyoruz.api.catalog.api.CargoCatalog;
import com.tasiyoruz.api.compliance.api.CargoScreening;
import com.tasiyoruz.api.compliance.api.ComplianceGuard;
import com.tasiyoruz.api.compliance.api.ConsentService;
import com.tasiyoruz.api.compliance.api.ConsentType;
import com.tasiyoruz.api.compliance.api.LegalDocType;
import com.tasiyoruz.api.compliance.api.RecordConsent;
import com.tasiyoruz.api.catalog.api.CargoItemView;
import com.tasiyoruz.api.fleet.api.CarrierDirectory;
import com.tasiyoruz.api.geo.api.District;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.*;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingAwarded;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingExpired;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingPublished;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.OfferSubmitted;
import com.tasiyoruz.api.ordering.domain.CarrierOffer;
import com.tasiyoruz.api.ordering.domain.ListingPhoto;
import com.tasiyoruz.api.ordering.domain.DomainAccess;
import com.tasiyoruz.api.ordering.domain.LoadListing;
import com.tasiyoruz.api.pricing.api.Money;
import com.tasiyoruz.api.pricing.api.PricingService;
import com.tasiyoruz.api.pricing.api.QuoteRequest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tek turlu teklif pazarı.
 *
 * <p>Fiyat tahmini istemciden alınmaz; ilan yayınlanırken tarife sunucuda yeniden
 * hesaplanır ve snapshot olarak yazılır. Kabul işlemi {@code @Version} ile korunur:
 * aynı ilana iki kabul ya da kabul+iptal yarışında ikinci yazan 409 alır.
 */
@Service
@Transactional
class DefaultMarketplaceService implements MarketplaceService {

    /** Anlık ilan bu süre teklif toplar; planlıda pencere başlangıcına kadar (docs/11). */
    static final Duration INSTANT_TTL = Duration.ofHours(6);
    static final Duration SCHEDULED_FALLBACK_TTL = Duration.ofHours(72);

    private final LoadListingRepository listings;
    private final CarrierOfferRepository offers;
    private final CarrierDirectory carriers;
    private final com.tasiyoruz.api.identity.api.UserDirectory users;
    private final com.tasiyoruz.api.identity.api.PhoneDirectory phones;
    private final GeoService geo;
    private final PricingService pricing;
    private final CargoCatalog cargoCatalog;
    private final ListingPhotoService photos;
    private final CarrierVisibility visibility;
    private final ComplianceGuard compliance;
    private final ConsentService consents;
    private final CargoScreening screening;
    private final ApplicationEventPublisher events;
    private final ObjectMapper mapper;
    private final Clock clock;

    DefaultMarketplaceService(LoadListingRepository listings, CarrierOfferRepository offers,
                              CarrierDirectory carriers,
                              com.tasiyoruz.api.identity.api.UserDirectory users,
                              com.tasiyoruz.api.identity.api.PhoneDirectory phones,
                              GeoService geo,
                              PricingService pricing, CargoCatalog cargoCatalog, ListingPhotoService photos,
                              CarrierVisibility visibility, ComplianceGuard compliance, ConsentService consents,
                              CargoScreening screening, ApplicationEventPublisher events, ObjectMapper mapper,
                              Clock clock) {
        this.listings = listings;
        this.offers = offers;
        this.carriers = carriers;
        this.users = users;
        this.phones = phones;
        this.geo = geo;
        this.pricing = pricing;
        this.cargoCatalog = cargoCatalog;
        this.photos = photos;
        this.visibility = visibility;
        this.compliance = compliance;
        this.consents = consents;
        this.screening = screening;
        this.events = events;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Override
    public ListingView publish(String shipperId, CreateListingRequest r) {
        // İstekteki @NotEmpty yalnızca HTTP ucunda çalışıyor; bu servis modülün dışa
        // açık arayüzü ve beyansız ilan bir kural ihlali, bir form hatası değil
        if (r.cargoItems() == null || r.cargoItems().isEmpty()) throw badRequest("Yükünü kalem kalem seçmelisin.");
        if (r.photoIds() == null || r.photoIds().isEmpty()) {
            throw badRequest("Yükünün en az bir fotoğrafını yüklemelisin.");
        }
        if (!r.lawfulnessDeclared()) {
            throw badRequest("Eşyanın hukuka uygunluğuna dair beyanı onaylaman gerekiyor.");
        }
        // Kısıtlı hesap yeni ilan açamaz. Kontrol serviste: yalnızca arayüzde
        // gizlenen bir kısıtlama, doğrudan API çağrısıyla aşılabilirdi.
        compliance.requireCanTransact(shipperId);

        var pickup = geo.district(r.pickup().districtId()).orElseThrow(() -> badRequest("Alış ilçesi tanınmadı."));
        var dropoff = geo.district(r.dropoff().districtId()).orElseThrow(() -> badRequest("Teslim ilçesi tanınmadı."));
        if (r.pickupWindowStart() != null && r.pickupWindowEnd() != null
                && r.pickupWindowEnd().isBefore(r.pickupWindowStart())) {
            throw badRequest("Alış penceresinin bitişi başlangıçtan önce olamaz.");
        }
        // Geçmiş pencereyle yayınlanan ilan anında süresi dolmuş sayılırdı ve beş dakika
        // içinde kapanırdı; kullanıcı ne olduğunu anlamazdı
        if (r.pickupWindowEnd() != null && r.pickupWindowEnd().isBefore(Instant.now(clock))) {
            throw badRequest("Alış penceresi geçmişte olamaz.");
        }

        // Referans fiyat sunucuda hesaplanır — istemcinin gönderdiği tutara güvenilmez
        var quote = pricing.quote(new QuoteRequest(
                r.serviceModel(), r.vehicleTypeCode(),
                List.of(new QuoteRequest.Stop(pickup.id(), r.pickup().floor(), r.pickup().hasElevator()),
                        new QuoteRequest.Stop(dropoff.id(), r.dropoff().floor(), r.dropoff().hasElevator())),
                r.extraServicesOrEmpty(), null));

        var now = Instant.now(clock);
        var expiresAt = "SCHEDULED".equals(r.serviceModel())
                ? Optional.ofNullable(r.pickupWindowStart()).orElse(now.plus(SCHEDULED_FALLBACK_TTL))
                : now.plus(INSTANT_TTL);

        var number = "TS-%d-%06d".formatted(now.atZone(ZoneOffset.UTC).getYear(), listings.nextListingNumber());
        Map<String, Object> snapshot = mapper.convertValue(quote, new TypeReference<>() {});

        var listing = listings.save(LoadListing.publish(number, shipperId, r.serviceModel(), r.vehicleTypeCode(),
                UUID.fromString(pickup.id()), UUID.fromString(dropoff.id()),
                r.pickup().floor(), r.pickup().hasElevator(), r.dropoff().floor(), r.dropoff().hasElevator(),
                r.extraServicesOrEmpty(), declare(r.cargoItems()), r.cargoDescription(),
                r.pickupWindowStart(), r.pickupWindowEnd(),
                snapshot, quote.totalAmount().amount(), now, expiresAt)
                .withNeighborhoods(r.pickup().neighborhood(), r.dropoff().neighborhood()));

        var attached = photos.attach(shipperId, listing.getId(), r.photoIds(), now);

        // Beyan ilana bağlanıyor: ihtilafta "bu yük için ne beyan edilmişti"
        // sorusunun cevabı, ilanın kendisiyle aynı yerde duruyor.
        consents.record(shipperId, RecordConsent.declaration(
                ConsentType.SHIPPER_DECLARATION, "LISTING_CREATE", listing.getId().toString(),
                LegalDocType.SHIPPER_TERMS, null));

        // Tarama ilanı ENGELLEMİYOR, gerekirse insan incelemesi açıyor: kelime
        // eşleşmesi bağlamı bilmiyor ve masum bir ilanı durdurmak, gerçek bir
        // ihlali yakalamaktan daha sık olurdu.
        screening.screenListing(shipperId, listing.getId().toString(), r.cargoDescription(),
                listing.getDeclaredItems().stream().map(DeclaredItem::displayName).toList());

        events.publishEvent(new ListingPublished(listing.getId().toString(), listing.getVehicleTypeCode(),
                pickup.id(), dropoff.id(), listing.getEstimatedAmount()));
        return view(listing, attached);
    }

    /**
     * Beyanı katalogdan çözer ve ilana kopyalanacak hâline getirir.
     *
     * <p>Hacim ve ağırlık istemciden alınmıyor: alınsaydı kullanıcı yükünü olduğundan
     * küçük göstererek daha ucuz araca sığdırabilirdi. Kod tanınmıyorsa istek reddediliyor
     * — bilinmeyen bir kalemi sessizce atmak, beyanı eksik bir ilan üretirdi.
     */
    private java.util.List<DeclaredItem> declare(java.util.List<CreateListingRequest.ItemLine> lines) {
        var codes = lines.stream().map(CreateListingRequest.ItemLine::cargoItemCode).distinct().toList();
        var byCode = cargoCatalog.items(codes).stream()
                .collect(java.util.stream.Collectors.toMap(CargoItemView::code, i -> i));
        var missing = codes.stream().filter(c -> !byCode.containsKey(c)).toList();
        if (!missing.isEmpty()) throw badRequest("Şu eşya kodları tanınmadı: " + String.join(", ", missing));

        // Aynı kalem birden çok satırda gelebilir (arayüzde iki kez eklenmiş); adetler
        // toplanıyor, yoksa ilanda "2 koli" ve "3 koli" diye iki satır görünürdü
        var quantities = new java.util.LinkedHashMap<String, Integer>();
        for (var line : lines) quantities.merge(line.cargoItemCode(), line.quantity(), Integer::sum);

        return quantities.entrySet().stream().map(e -> {
            var item = byCode.get(e.getKey());
            return new DeclaredItem(item.code(), item.displayName(), e.getValue(), item.volumeM3(), item.weightKg());
        }).toList();
    }

    /** Ortalamanın yayınlanabilmesi için gereken en az ilan sayısı. */
    static final int MIN_FIRST_OFFER_SAMPLE = 5;

    @Override
    @Transactional(readOnly = true)
    public long openListingCount() {
        return listings.countByStatus(ListingStatus.OPEN);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Duration> averageTimeToFirstOffer() {
        var row = listings.firstOfferStats();
        if (row == null || row.length < 2) return Optional.empty();
        long sample = ((Number) row[0]).longValue();
        if (sample < MIN_FIRST_OFFER_SAMPLE) return Optional.empty();
        return Optional.of(Duration.ofSeconds(((Number) row[1]).longValue()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ListingView> allListings(ListingStatus status) {
        var all = status == null
                ? listings.findAll(org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "publishedAt"))
                : listings.findByStatusInOrderByPublishedAtDesc(List.of(status));
        return views(all);
    }

    @Override
    public ListingView cancelAsOperations(String listingId, String reason) {
        if (reason == null || reason.isBlank()) throw badRequest("İptal gerekçesi zorunlu.");
        var listing = parse(listingId).flatMap(listings::findById).orElseThrow(() -> notFound("İlan"));
        if (listing.getStatus() != ListingStatus.OPEN) {
            throw conflict("Yalnızca açık ilan iptal edilebilir.");
        }
        var now = Instant.now(clock);
        DomainAccess.cancel(listing, reason, now);
        for (var offer : offers.findByListingIdOrderBySubmittedAtAsc(listing.getId())) {
            if (offer.getStatus() == OfferStatus.SUBMITTED) respond(offer, OfferStatus.REJECTED, now);
        }
        return view(listing);
    }

    @Override
    public int expireOverdueListings() {
        var now = Instant.now(clock);
        var overdue = listings.findByStatusAndExpiresAtBefore(ListingStatus.OPEN, now);
        for (var listing : overdue) {
            DomainAccess.expire(listing);
            // Bekleyen teklifler de kapanır; aksi hâlde taşıyıcı "bekliyor" görünen
            // ama artık kabul edilemeyecek bir teklifle kalırdı
            for (var offer : offers.findByListingIdOrderBySubmittedAtAsc(listing.getId())) {
                if (offer.getStatus() == OfferStatus.SUBMITTED) {
                    respond(offer, OfferStatus.REJECTED, now);
                }
            }
            events.publishEvent(new ListingExpired(listing.getId().toString(), listing.getListingNumber(),
                    route(listing), listing.getShipperId()));
        }
        return overdue.size();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ListingView> listing(String listingId) {
        return parse(listingId).flatMap(listings::findById).map(this::view);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ListingView> listingForCarrier(String carrierId, String listingId) {
        return parse(listingId).flatMap(listings::findById)
                .filter(l -> visibility.maySee(l, carrierId))
                // İletişim yalnızca detayda: liste ekranında yüz ilanın adı ve
                // numarası tek istekte dışarı çıkardı
                .map(l -> view(l).forCarrier(shipperContact(l.getShipperId())));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ListingView> listingsOf(String shipperId) {
        return views(listings.findByShipperIdOrderByPublishedAtDesc(shipperId));
    }

    @Override
    public ListingView cancel(String shipperId, String listingId, String reason) {
        var listing = owned(shipperId, listingId);
        if (listing.getStatus() != ListingStatus.OPEN) {
            throw conflict("Yalnızca açık ilan iptal edilebilir.");
        }
        var now = Instant.now(clock);
        DomainAccess.cancel(listing, reason, now);
        offers.findByListingIdOrderBySubmittedAtAsc(listing.getId()).stream()
                .filter(o -> o.getStatus() == OfferStatus.SUBMITTED)
                .forEach(o -> respond(o, OfferStatus.REJECTED, now));
        return view(listing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ListingView> openListings(String vehicleTypeCode, String cityCode) {
        List<UUID> districtIds = cityCode == null ? null
                : geo.districtsOf(cityCode).stream().map(d -> UUID.fromString(d.id())).toList();
        if (districtIds != null && districtIds.isEmpty()) return List.of();
        return views(listings.findOpen(ListingStatus.OPEN, Instant.now(clock), vehicleTypeCode, districtIds)).stream()
                .map(ListingView::forCarrier)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CorridorSummary> openCorridors() {
        var open = listings.findOpen(ListingStatus.OPEN, Instant.now(clock), null, null);
        // İlçe → il: ilan yalnızca ilçe kimliği tutuyor, il adı katalogdan geliyor.
        var counts = new java.util.LinkedHashMap<java.util.List<String>, Integer>();
        for (var listing : open) {
            var from = geo.district(listing.getPickupDistrictId().toString());
            var to = geo.district(listing.getDropoffDistrictId().toString());
            if (from.isEmpty() || to.isEmpty()) continue;
            var key = List.of(from.get().cityName(), to.get().cityName());
            counts.merge(key, 1, Integer::sum);
        }
        return counts.entrySet().stream()
                .map(e -> new CorridorSummary(e.getKey().get(0), e.getKey().get(1), e.getValue()))
                .sorted(java.util.Comparator.comparingInt(CorridorSummary::listingCount).reversed())
                .toList();
    }

    @Override
    public OfferView submitOffer(String carrierId, String carrierDisplayName, String listingId,
                                 SubmitOfferRequest r) {
        var listing = parse(listingId).flatMap(listings::findById).orElseThrow(() -> notFound("İlan"));
        var now = Instant.now(clock);
        if (!listing.isOpen(now)) {
            throw conflict("İlan artık teklif almıyor.");
        }
        if (listing.isOwnedBy(carrierId)) {
            throw conflict("Kendi ilanınıza teklif veremezsiniz.");
        }
        // Belge doğrulamasının yaptırımı burada. Bu kontrol olmadan onay kuyruğu,
        // süre takibi ve askıya alma tamamen süs olurdu: belgesi dolmuş taşıyıcı
        // iş almaya devam ederdi.
        if (!carriers.canTakeWork(carrierId)) {
            throw forbidden("Teklif verebilmek için taşıyıcı başvurunuzun onaylı olması gerekiyor.");
        }

        var existing = offers.findByListingIdAndCarrierId(listing.getId(), carrierId);
        CarrierOffer offer;
        if (existing.isPresent()) {
            offer = existing.get();
            if (offer.getStatus() != OfferStatus.WITHDRAWN) {
                // Tek tur: mevcut teklif değiştirilemez, ancak geri çekilip yeniden verilebilir
                throw conflict("Bu ilana zaten teklif verdiniz.");
            }
            resubmit(offer, r, now);
        } else {
            offer = offers.save(CarrierOffer.submit(listing.getId(), carrierId, carrierDisplayName,
                    r.amount(), r.note(), r.estimatedPickupAt(), now));
        }

        events.publishEvent(new OfferSubmitted(listingId, listing.getListingNumber(), route(listing),
                listing.getShipperId(), offer.getId().toString(), carrierId, offerName(carrierId, carrierDisplayName),
                r.amount()));
        return view(offer);
    }

    @Override
    public OfferView withdrawOffer(String carrierId, String offerId) {
        var offer = parse(offerId).flatMap(offers::findById).orElseThrow(() -> notFound("Teklif"));
        if (!offer.getCarrierId().equals(carrierId)) throw forbidden();
        if (offer.getStatus() != OfferStatus.SUBMITTED) {
            throw conflict("Yalnızca bekleyen teklif geri çekilebilir.");
        }
        respond(offer, OfferStatus.WITHDRAWN, Instant.now(clock));
        return view(offer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferView> offersOf(String carrierId) {
        return offers.findByCarrierIdOrderBySubmittedAtDesc(carrierId).stream().map(this::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferView> offersForListing(String shipperId, String listingId) {
        var listing = owned(shipperId, listingId);
        return offers.findByListingIdOrderBySubmittedAtAsc(listing.getId()).stream().map(this::view).toList();
    }

    @Override
    public ListingView acceptOffer(String shipperId, String listingId, String offerId) {
        var listing = owned(shipperId, listingId);
        var now = Instant.now(clock);
        if (!listing.isOpen(now)) {
            throw conflict("İlan artık açık değil.");
        }
        var chosen = parse(offerId).flatMap(offers::findById)
                .filter(o -> o.getListingId().equals(listing.getId()))
                .orElseThrow(() -> notFound("Teklif"));
        if (chosen.getStatus() != OfferStatus.SUBMITTED) {
            throw conflict("Bu teklif artık geçerli değil.");
        }

        for (var o : offers.findByListingIdOrderBySubmittedAtAsc(listing.getId())) {
            if (o.getStatus() != OfferStatus.SUBMITTED) continue;
            respond(o, o.getId().equals(chosen.getId()) ? OfferStatus.ACCEPTED : OfferStatus.REJECTED, now);
        }
        award(listing, chosen.getId());
        // @Version: aynı anda ikinci kabul/iptal gelirse commit'te
        // ObjectOptimisticLockingFailureException → 409

        events.publishEvent(new ListingAwarded(listingId, listing.getListingNumber(), route(listing), offerId,
                chosen.getCarrierId(), shipperId, chosen.getAmount()));
        return view(listing);
    }

    // --- yardımcılar ---

    private LoadListing owned(String shipperId, String listingId) {
        var listing = parse(listingId).flatMap(listings::findById).orElseThrow(() -> notFound("İlan"));
        if (!listing.isOwnedBy(shipperId)) throw forbidden();
        return listing;
    }

    private static Optional<UUID> parse(String id) {
        try {
            return Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /** Bildirim metni için: "İstanbul, Kadıköy → Ankara, Çankaya". */
    private String route(LoadListing l) {
        var from = geo.district(l.getPickupDistrictId().toString());
        var to = geo.district(l.getDropoffDistrictId().toString());
        return from.map(d -> d.cityName() + ", " + d.name()).orElse("?")
                + " → " + to.map(d -> d.cityName() + ", " + d.name()).orElse("?");
    }

    private ListingView view(LoadListing l) {
        return view(l, photos.of(l.getId()));
    }

    /**
     * Liste ekranları için: fotoğraflar tek sorguda toplanıp burada dağıtılıyor.
     * İlan başına ayrı okuma, açık ilan akışında sorgu sayısını ilan sayısı kadar
     * artırırdı.
     */
    private java.util.List<ListingView> views(java.util.List<LoadListing> all) {
        var byListing = photos.byListing(all.stream().map(LoadListing::getId).toList());
        return all.stream().map(l -> view(l, byListing.getOrDefault(l.getId(), java.util.List.of()))).toList();
    }

    private ListingView view(LoadListing l, java.util.List<ListingPhoto> listingPhotos) {
        return new ListingView(l.getId().toString(), l.getListingNumber(), l.getShipperId(),
                l.getServiceModel(), l.getVehicleTypeCode(),
                place(l.getPickupDistrictId(), l.getPickupNeighborhood(), l.getPickupFloor(), l.getPickupHasElevator()),
                place(l.getDropoffDistrictId(), l.getDropoffNeighborhood(), l.getDropoffFloor(), l.getDropoffHasElevator()),
                l.getExtraServices(), l.getDeclaredItems(),
                listingPhotos.stream().map(ListingPhotoService::view).toList(),
                l.getCargoDescription(), l.getPickupWindowStart(), l.getPickupWindowEnd(),
                Money.tryOf(l.getEstimatedAmount()), l.getEstimateSnapshot(), l.getStatus(),
                l.getAwardedOfferId() == null ? null : l.getAwardedOfferId().toString(),
                offers.countByListingIdAndStatus(l.getId(), OfferStatus.SUBMITTED),
                l.getPublishedAt(), l.getExpiresAt(), null);
    }

    private ListingView.Place place(UUID districtId, String neighborhood, Integer floor, Boolean elevator) {
        var d = geo.district(districtId.toString());
        return new ListingView.Place(districtId.toString(),
                d.map(District::cityName).orElse(null), d.map(District::name).orElse(null),
                neighborhood, floor, elevator);
    }

    /**
     * Teklif aşamasındaki araç sahibinin gördüğü iletişim.
     *
     * <p>Numara kimlik modülünden <em>maskeli</em> alınıyor; ham hâli bu modüle
     * hiç girmiyor. Sızdıramayacağımız bir veriyi korumak zorunda değiliz.
     */
    private ListingView.ShipperContact shipperContact(String shipperId) {
        // displayName() ad yoksa e-postaya düşüyor; teklif aşamasındaki araç
        // sahibine müşterinin e-postasını göstermek istemiyoruz — adı yoksa yok
        var ad = users.user(shipperId)
                .map(u -> ((u.firstName() == null ? "" : u.firstName()) + " "
                        + (u.lastName() == null ? "" : u.lastName())).trim())
                .filter(a -> !a.isEmpty())
                .orElse(null);
        var telefon = phones.maskedVerifiedPhone(shipperId).orElse(null);
        return ad == null && telefon == null ? null : new ListingView.ShipperContact(ad, telefon);
    }

    /**
     * Teklifte görünen ad doğrulanmış profilden geliyor; teklif kaydındaki ad yalnızca
     * profil bulunamazsa (eski kayıt) yedek. Ana sayfa "doğrulanmış araç sahibi" diyor,
     * teklif kartı kullanıcının kendi yazdığı adı gösteremez.
     */
    private String offerName(String carrierId, String fallback) {
        return carriers.summary(carrierId).map(s -> s.publicName()).orElse(fallback);
    }

    private OfferView view(CarrierOffer o) {
        var profile = carriers.summary(o.getCarrierId());
        return new OfferView(o.getId().toString(), o.getListingId().toString(), o.getCarrierId(),
                profile.map(p -> p.publicName()).orElse(o.getCarrierDisplayName()),
                profile.map(p -> p.vehicleTypeCode()).orElse(null),
                profile.map(p -> p.plate()).orElse(null),
                profile.map(p -> p.status() == com.tasiyoruz.api.fleet.api.CarrierStatus.APPROVED).orElse(false),
                Money.tryOf(o.getAmount()), o.getNote(), o.getEstimatedPickupAt(),
                o.getStatus(), o.getSubmittedAt(), o.getRespondedAt());
    }

    // Domain'in paket-özel mutasyonlarına erişim (aynı modül, farklı paket)
    private static void respond(CarrierOffer o, OfferStatus s, Instant now) { DomainAccess.respond(o, s, now); }
    private static void resubmit(CarrierOffer o, SubmitOfferRequest r, Instant now) {
        DomainAccess.resubmit(o, r.amount(), r.note(), r.estimatedPickupAt(), now);
    }
    private static void award(LoadListing l, UUID offerId) { DomainAccess.award(l, offerId); }
}
