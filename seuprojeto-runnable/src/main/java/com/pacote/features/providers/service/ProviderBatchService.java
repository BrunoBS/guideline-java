package com.pacote.features.providers.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ProviderBatchService {
    @Async
    public void processarLote() {
        // processamento assíncrono simulado
    }
}
