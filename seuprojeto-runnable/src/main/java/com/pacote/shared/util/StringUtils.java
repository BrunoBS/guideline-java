package com.pacote.shared.util;

public final class StringUtils {
    private StringUtils() {
    }

    public static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
