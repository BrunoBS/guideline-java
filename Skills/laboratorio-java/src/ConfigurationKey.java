import java.util.Objects;

public record ConfigurationKey(String value) {
    public ConfigurationKey {
        Objects.requireNonNull(value, "value");
        if (value.isBlank() || value.length() > 80
                || !value.matches("[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*")) {
            throw new IllegalArgumentException("Invalid configuration key");
        }
    }
}
