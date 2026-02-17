package com.pacote.features.providers.controller;

import com.pacote.features.providers.dto.request.CriarProviderRequest;
import com.pacote.features.providers.dto.response.ProviderResponse;
import com.pacote.features.providers.mapper.ProviderMapper;
import com.pacote.features.providers.service.ProviderService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/providers")
public class ProviderController {
    private final ProviderService service;

    public ProviderController(ProviderService service) {
        this.service = service;
    }

    @PostMapping
    public ProviderResponse criar(@RequestBody CriarProviderRequest req) {
        var p = service.criar(ProviderMapper.toEntity(req));
        return ProviderMapper.toResponse(p);
    }

    @GetMapping("/ping")
    public String ping() {
        return "provider-ok";
    }
}
