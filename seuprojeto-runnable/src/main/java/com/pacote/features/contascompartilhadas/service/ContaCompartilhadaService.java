package com.pacote.features.contascompartilhadas.service;

import com.pacote.features.contascompartilhadas.model.ContaCompartilhada;
import com.pacote.features.contascompartilhadas.repository.ContaCompartilhadaRepository;
import org.springframework.stereotype.Service;

@Service
public class ContaCompartilhadaService {
    private final ContaCompartilhadaRepository repo;

    public ContaCompartilhadaService(ContaCompartilhadaRepository repo) {
        this.repo = repo;
    }

    public ContaCompartilhada criar(ContaCompartilhada c) {
        return repo.save(c);
    }
}
