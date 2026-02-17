package com.pacote.features.contascompartilhadas.repository;

import com.pacote.features.contascompartilhadas.model.ContaCompartilhada;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.Map;

@Repository
public class ContaCompartilhadaRepository {
    private final Map<Long, ContaCompartilhada> db = new HashMap<>();
    private long seq = 1L;

    public ContaCompartilhada save(ContaCompartilhada c) {
        c.id = seq++;
        db.put(c.id, c);
        return c;
    }
}
