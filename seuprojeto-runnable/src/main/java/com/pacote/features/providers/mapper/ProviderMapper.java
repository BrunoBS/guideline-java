package com.pacote.features.providers.mapper;

import com.pacote.features.providers.dto.request.CriarProviderRequest;
import com.pacote.features.providers.dto.response.ProviderResponse;
import com.pacote.features.providers.model.Provider;

public class ProviderMapper {
    public static Provider toEntity(CriarProviderRequest r) {
        var p = new Provider();
        p.name = r.name;
        return p;
    }

    public static ProviderResponse toResponse(Provider p) {
        var r = new ProviderResponse();
        r.id = p.id;
        r.name = p.name;
        return r;
    }
}
