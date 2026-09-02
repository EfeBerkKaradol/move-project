-- Spring Modulith olay yayın kaydı (transactional outbox — ADR-0003)
--
-- Modulith bu tabloyu kendi başına oluşturabilir, ancak şemayı Flyway yönetiyor
-- (ddl-auto: validate). Tek şema sahibi olması, migration'ların ortamlar arasında
-- öngörülebilir kalmasını sağlıyor.

CREATE TABLE event_publication (
    id                UUID          NOT NULL PRIMARY KEY,
    listener_id       TEXT          NOT NULL,
    event_type        TEXT          NOT NULL,
    serialized_event  TEXT          NOT NULL,
    publication_date  TIMESTAMPTZ   NOT NULL,
    completion_date   TIMESTAMPTZ
);

-- Tamamlanmamış yayınların yeniden denenmesi için
CREATE INDEX event_publication_by_completion_date_idx
    ON event_publication (completion_date);

CREATE INDEX event_publication_serialized_event_hash_idx
    ON event_publication USING hash (serialized_event);
