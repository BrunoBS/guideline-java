package com.pacote.features.contascompartilhadas.mapper;

import com.pacote.features.contascompartilhadas.dto.request.CriarContaRequest;
import com.pacote.features.contascompartilhadas.dto.response.ContaResponse;
import com.pacote.features.contascompartilhadas.model.ContaCompartilhada;

public class ContaMapper {
    public static ContaCompartilhada toEntity(CriarContaRequest r) {
        var c = new ContaCompartilhada();
        c.descricao = r.descricao;
        return c;
    }

    public static ContaResponse toResponse(ContaCompartilhada c) {
        var r = new ContaResponse();
        r.id = c.id;
        r.descricao = c.descricao;
        return r;
    }
}
