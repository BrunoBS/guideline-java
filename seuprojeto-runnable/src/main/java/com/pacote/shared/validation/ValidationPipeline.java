package com.pacote.shared.validation;

import org.springframework.stereotype.Component;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ResolvableType;


@Component
public class ValidationPipeline<T> {

    private static final Logger log = LoggerFactory.getLogger(ValidationPipeline.class);

    private final List<Validator<?>> validators;

    public ValidationPipeline(List<Validator<?>> validators) {
        this.validators = validators;
    }

    /**
     * Valida um DTO usando todos os validators compatíveis.
     *
     * @param target objeto a ser validado
     * @return ValidationResult com todos os erros encontrados
     */
    public ValidationResult validate(T target) {
        if (target == null) {
            throw new IllegalArgumentException("Target object cannot be null");
        }

        ValidationResult result = new ValidationResult();
        Class<?> dtoClass = target.getClass();

        validators.stream()
                .filter(v -> supports(v, dtoClass))
                .map(v -> (Validator<T>) v)
                .forEach(v -> {
                    log.debug("Applying validator {} to {}", v.getClass().getSimpleName(), dtoClass.getSimpleName());
                    result.merge(v.validate(target));
                });

        return result;
    }

    /**
     * Verifica se o validator suporta o tipo do DTO
     *
     * @param validator Validator a ser testado
     * @param dtoClass  Classe do DTO
     * @return true se o validator é aplicável
     */
    private boolean supports(Validator<?> validator, Class<?> dtoClass) {
        // Usa ResolvableType para lidar com proxies e heranças
        ResolvableType type = ResolvableType.forClass(validator.getClass()).as(Validator.class);
        Class<?> validatedClass = type.getGeneric(0).resolve();

        boolean isSupported = validatedClass != null && validatedClass.isAssignableFrom(dtoClass);

        log.trace("Validator {} supports {}: {}", validator.getClass().getSimpleName(), dtoClass.getSimpleName(), isSupported);

        return isSupported;
    }
}
