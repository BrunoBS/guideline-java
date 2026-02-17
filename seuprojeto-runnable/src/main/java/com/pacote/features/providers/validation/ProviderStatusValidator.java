package com.pacote.features.providers.validation;

import com.pacote.features.providers.dto.request.CriarProviderRequest;
import com.pacote.shared.validation.ValidationResult;
import com.pacote.shared.validation.Validator;
import org.springframework.stereotype.Component;

@Component
public class ProviderStatusValidator implements Validator<CriarProviderRequest> {
    public ValidationResult validate(CriarProviderRequest r) {
        return new ValidationResult();
    }
}
