package com.pacote.features.providers.controller;

import com.pacote.features.providers.service.ProviderBatchService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/providers/batch")
public class ProviderBatchController {
    private final ProviderBatchService service;

    public ProviderBatchController(ProviderBatchService service) {
        this.service = service;
    }

    @PostMapping("/processar")
    public String processar() {
        service.processarLote();
        return "lote-iniciado";
    }
}
