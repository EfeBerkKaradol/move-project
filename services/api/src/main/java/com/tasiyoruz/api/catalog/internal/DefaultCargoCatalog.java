package com.tasiyoruz.api.catalog.internal;

import com.tasiyoruz.api.catalog.api.CargoCatalog;
import com.tasiyoruz.api.catalog.api.CargoItemView;
import com.tasiyoruz.api.catalog.domain.CargoItem;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Katalog okumaları önbellekten geçiyor; sorgu başına tur atmıyor. */
@Service
class DefaultCargoCatalog implements CargoCatalog {

    private final CatalogCache cache;

    DefaultCargoCatalog(CatalogCache cache) {
        this.cache = cache;
    }

    @Override
    public Optional<CargoItemView> item(String code) {
        return Optional.ofNullable(cache.itemsByCode().get(code)).map(DefaultCargoCatalog::view);
    }

    @Override
    public List<CargoItemView> items(Collection<String> codes) {
        var byCode = cache.itemsByCode();
        return codes.stream().map(byCode::get).filter(java.util.Objects::nonNull).map(DefaultCargoCatalog::view).toList();
    }

    private static CargoItemView view(CargoItem i) {
        return new CargoItemView(i.getCode(), i.getCategoryCode(), i.getDisplayName(),
                i.getVolumeM3(), i.getWeightKg(), i.getLongestEdgeCm());
    }
}
