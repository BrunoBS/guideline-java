package com.pacote.exception;


import com.pacote.shared.validation.ValidationResult;

public class ValidationException extends RuntimeException {

    private final ValidationResult validationResult;

    public ValidationException(ValidationResult validationResult) {
        super("Validation failed with " + (validationResult != null ? validationResult.getErrors().size() : 0) + " error(s).");
        this.validationResult = validationResult;
    }

    public ValidationException(String message, ValidationResult validationResult) {
        super(message);
        this.validationResult = validationResult;
    }

    public ValidationResult getValidationResult() {
        return validationResult;
    }
}
