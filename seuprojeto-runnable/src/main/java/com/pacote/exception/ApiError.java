package com.pacote.exception;


import com.pacote.shared.validation.FieldError;

import java.time.Instant;
import java.util.List;

public class ApiError {

    private String code;
    private String message;
    private List<FieldError> details;
    private Instant timestamp;

    public ApiError() {
        this.timestamp = Instant.now();
    }

    public ApiError(String code, String message) {
        this();
        this.code = code;
        this.message = message;
    }

    public ApiError(String code, String message, List<FieldError> details) {
        this(code, message);
        this.details = details;
    }

    // Getters e Setters
    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<FieldError> getDetails() {
        return details;
    }

    public void setDetails(List<FieldError> details) {
        this.details = details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
