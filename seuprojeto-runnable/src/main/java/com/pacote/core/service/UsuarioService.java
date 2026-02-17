package com.pacote.core.service;

import com.pacote.core.dto.request.CriarUsuarioRequest;
import com.pacote.core.mapper.UsuarioMapper;
import com.pacote.core.model.Usuario;
import com.pacote.core.repository.UsuarioRepository;
import com.pacote.exception.ValidationException;
import com.pacote.shared.validation.ValidationPipeline;
import com.pacote.shared.validation.ValidationResult;
import com.pacote.shared.validation.Validator;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {
    private final UsuarioRepository repo;
    private final ValidationPipeline<CriarUsuarioRequest> validationPipeline;

    public UsuarioService(UsuarioRepository repo,
                          ValidationPipeline<CriarUsuarioRequest> validationPipeline) {
        this.repo = repo;
        this.validationPipeline = validationPipeline;
    }

    public Usuario criar(CriarUsuarioRequest criarUsuarioRequest) {
        ValidationResult finalResult = new ValidationResult();
        finalResult = validationPipeline.validate(criarUsuarioRequest);
        if (finalResult.hasErrors()) {
            throw new ValidationException(finalResult);
        }

        Usuario u = UsuarioMapper.toEntity(criarUsuarioRequest);
        return repo.save(u);
    }

    public List<Usuario> listar() {
        return repo.findAll();
    }
}
