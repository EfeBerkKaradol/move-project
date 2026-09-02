package com.turmove.api.geo.internal;

import com.turmove.api.geo.api.District;
import com.turmove.api.geo.api.GeoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Coğrafya", description = "Hizmet bölgeleri")
class PublicGeoController {

    private final GeoService geoService;

    PublicGeoController(GeoService geoService) {
        this.geoService = geoService;
    }

    @GetMapping("/districts")
    @Operation(summary = "Hizmet verilen ilçeler")
    List<District> districts(@RequestParam(required = false) String city) {
        return city == null ? geoService.districts() : geoService.districtsOf(city);
    }
}
