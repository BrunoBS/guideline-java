package com.pacote.core.mapper;

import com.pacote.core.dto.request.CriarUsuarioRequest;
import com.pacote.core.dto.response.UsuarioResponse;
import com.pacote.core.model.Usuario;

public class UsuarioMapper {
    public static Usuario toEntity(CriarUsuarioRequest r) {
        Usuario u = new Usuario();
        u.nome = r.nome;
        return u;
    }

    public static UsuarioResponse toResponse(Usuario u) {
        UsuarioResponse r = new UsuarioResponse();
        r.id = u.id;
        r.nome = u.nome;
        return r;
    }
}
