package com.pacote.core.controller;

import com.pacote.core.dto.request.CriarUsuarioRequest;
import com.pacote.core.dto.response.UsuarioResponse;
import com.pacote.core.mapper.UsuarioMapper;
import com.pacote.core.service.UsuarioService;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {
    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @PostMapping
    public UsuarioResponse criar(@RequestBody CriarUsuarioRequest req) {
        var u = service.criar(req);
        return UsuarioMapper.toResponse(u);
    }

    @GetMapping
    public java.util.List<UsuarioResponse> listar() {
        return service.listar().stream()
                .map(UsuarioMapper::toResponse)
                .collect(Collectors.toList());
    }
}
