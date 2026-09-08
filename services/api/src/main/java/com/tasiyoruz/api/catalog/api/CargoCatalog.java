package com.tasiyoruz.api.catalog.api;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Eşya kataloğunun okunması.
 *
 * <p>Pazar yeri, ilana yazılacak yük beyanını kalem kalem doğrulamak ve kalemin adını,
 * hacmini, ağırlığını ilana anlık görüntü olarak kopyalamak için buna ihtiyaç duyuyor.
 * Kodların doğrulanması burada yapılıyor: her modül kendi listesini tutsaydı katalogdan
 * kaldırılan bir kalem birinde geçerli, diğerinde geçersiz olurdu.
 */
public interface CargoCatalog {

    Optional<CargoItemView> item(String code);

    /**
     * Verilen kodların karşılıkları. Bulunamayan kod sonuçta yer almaz — çağıran
     * eksiği karşılaştırıp kendi hata mesajını üretir.
     */
    List<CargoItemView> items(Collection<String> codes);
}
