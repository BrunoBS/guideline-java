package com.pacote.features.contascompartilhadas.validation;

import com.pacote.features.contascompartilhadas.dto.request.CriarContaRequest;
import com.pacote.shared.validation.ValidationResult;
import com.pacote.shared.validation.Validator;
import org.springframework.stereotype.Component;

@Component
public class ContaCompartilhadaValidator implements Validator<CriarContaRequest> {
    public ValidationResult validate(CriarContaRequest r) {
        ValidationResult vr = new ValidationResult();
        if (r == null || r.descricao == null || r.descricao.isBlank())
            vr.addError("conta", "descricao obrigatoria");
        return vr;
    }
}
