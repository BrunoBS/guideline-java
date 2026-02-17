package com.pacote.features.providers.service;

import com.pacote.features.providers.model.Provider;
import com.pacote.features.providers.repository.ProviderRepository;
import org.springframework.stereotype.Service;

@Service
public class ProviderService {
    private final ProviderRepository repo;

    public ProviderService(ProviderRepository repo) {
        this.repo = repo;
    }

    public Provider criar(Provider p) {
        return repo.save(p);
    }
}
