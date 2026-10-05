package br.com.brunobs.compression;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Generates a JSON array by repeating one caller-supplied object. */
public final class JsonDatasetGenerator {
    private static final long BYTES_PER_MIB = 1024L * 1024L;
    private static final byte[] OPEN = "[".getBytes(StandardCharsets.UTF_8);
    private static final byte[] CLOSE = "]".getBytes(StandardCharsets.UTF_8);
    private static final byte[] SEPARATOR = ",\n".getBytes(StandardCharsets.UTF_8);

    private JsonDatasetGenerator() { }

    public static long generate(String templateJson, long targetMiB, Path destination) throws IOException {
        if (targetMiB < 1) {
            throw new IllegalArgumentException("O tamanho deve ser de pelo menos 1 MiB.");
        }
        byte[] template = templateJson.getBytes(StandardCharsets.UTF_8);
        validateObjectTemplate(templateJson);
        long targetBytes = Math.multiplyExact(targetMiB, BYTES_PER_MIB);
        long objectCount = Math.max(1, (targetBytes - OPEN.length - CLOSE.length + SEPARATOR.length)
                / (template.length + (long) SEPARATOR.length));
        while (estimatedSize(template.length, objectCount) < targetBytes) {
            objectCount++;
        }

        try (OutputStream output = new BufferedOutputStream(Files.newOutputStream(destination))) {
            output.write(OPEN);
            for (long index = 0; index < objectCount; index++) {
                if (index > 0) {
                    output.write(SEPARATOR);
                }
                output.write(template);
            }
            output.write(CLOSE);
        }
        return Files.size(destination);
    }

    private static long estimatedSize(int objectBytes, long count) {
        return OPEN.length + CLOSE.length + count * objectBytes + Math.max(0, count - 1) * SEPARATOR.length;
    }

    private static void validateObjectTemplate(String json) {
        String trimmed = json.trim();
        if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
            throw new IllegalArgumentException("O template precisa ser um objeto JSON completo.");
        }
    }
}
