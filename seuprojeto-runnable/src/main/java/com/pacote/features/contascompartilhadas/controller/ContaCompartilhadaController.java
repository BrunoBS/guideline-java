package com.pacote.features.contascompartilhadas.controller;

import com.pacote.features.contascompartilhadas.dto.request.CriarContaRequest;
import com.pacote.features.contascompartilhadas.dto.response.ContaResponse;
import com.pacote.features.contascompartilhadas.mapper.ContaMapper;
import com.pacote.features.contascompartilhadas.service.ContaCompartilhadaService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/contas-compartilhadas")
public class ContaCompartilhadaController {
    private final ContaCompartilhadaService service;

    public ContaCompartilhadaController(ContaCompartilhadaService service) {
        this.service = service;
    }

    @PostMapping
    public ContaResponse criar(@RequestBody CriarContaRequest req) {
        var c = service.criar(ContaMapper.toEntity(req));
        return ContaMapper.toResponse(c);
    }
}
