package org.example.skills;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfigurationService {
    private final ConfigurationRepository repository;

    public ConfigurationService(ConfigurationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void createThenFail(Long workspaceId, String name) {
        repository.saveAndFlush(new ConfigurationEntity(workspaceId, name));
        throw new IllegalStateException("Simulated failure after SQL flush");
    }
}
