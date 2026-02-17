package com.pacote.shared.validation;

public interface Validator<T> {
    ValidationResult validate(T target);
}
