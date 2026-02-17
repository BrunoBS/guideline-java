package com.pacote.features.providers.repository;

import com.pacote.features.providers.model.Provider;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.Map;

@Repository
public class ProviderRepository {
    private final Map<Long, Provider> db = new HashMap<>();
    private long seq = 1L;

    public Provider save(Provider p) {
        p.id = seq++;
        db.put(p.id, p);
        return p;
    }
}
