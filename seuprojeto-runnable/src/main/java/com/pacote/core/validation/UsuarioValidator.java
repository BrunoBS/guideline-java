package com.pacote.core.validation;

import com.pacote.core.dto.request.CriarUsuarioRequest;
import com.pacote.shared.validation.ValidationResult;
import com.pacote.shared.validation.Validator;
import org.springframework.stereotype.Component;

@Component
public class UsuarioValidator implements Validator<CriarUsuarioRequest> {
    public ValidationResult validate(CriarUsuarioRequest r) {
        ValidationResult vr = new ValidationResult();
        if (r == null || r.nome == null || r.nome.isBlank())
            vr.addError("usuario", "nome obrigatorio");
        return vr;
    }
}
