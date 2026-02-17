package com.pacote.features.providers.validation;

import com.pacote.features.providers.dto.request.CriarProviderRequest;
import com.pacote.shared.validation.ValidationResult;
import com.pacote.shared.validation.Validator;
import org.springframework.stereotype.Component;

@Component
public class ProviderValidator implements Validator<CriarProviderRequest> {
    public ValidationResult validate(CriarProviderRequest r) {
        ValidationResult vr = new ValidationResult();
        if (r == null || r.name == null || r.name.isBlank())
            vr.addError("provider", "name obrigatorio");
        return vr;
    }
}
