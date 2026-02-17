package com.pacote.shared.util;

import java.time.Instant;

public final class DateUtils {
    private DateUtils() {
    }

    public static Instant now() {
        return Instant.now();
    }
}
