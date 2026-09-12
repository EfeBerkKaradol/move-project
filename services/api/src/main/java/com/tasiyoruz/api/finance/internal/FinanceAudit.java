package com.tasiyoruz.api.finance.internal;

import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Finansal denetim kaydı.
 *
 * <p>Komisyon, iade, hakediş durumu ve fatura iptali sessizce değişemez. Kayıt
 * doğrudan SQL ile yazılıyor: denetim satırının kendisi için bir varlık sınıfı
 * açmak, o satırın da JPA üzerinden güncellenebilmesi anlamına gelirdi.
 */
@Component
class FinanceAudit {

    private final EntityManager em;
    private final Clock clock;

    FinanceAudit(EntityManager em, Clock clock) {
        this.em = em;
        this.clock = clock;
    }

    @Transactional
    void kaydet(String actor, String action, String entity, String entityId,
                String oldValue, String newValue) {
        em.createNativeQuery("""
                        INSERT INTO finance_audit_log (actor, action, entity, entity_id, old_value, new_value, occurred_at)
                        VALUES (?1, ?2, ?3, ?4, CAST(?5 AS jsonb), CAST(?6 AS jsonb), ?7)
                        """)
                .setParameter(1, actor)
                .setParameter(2, action)
                .setParameter(3, entity)
                .setParameter(4, entityId)
                .setParameter(5, oldValue == null ? null : "{\"v\":\"" + oldValue + "\"}")
                .setParameter(6, newValue == null ? null : "{\"v\":\"" + newValue + "\"}")
                .setParameter(7, Instant.now(clock))
                .executeUpdate();
    }
}
