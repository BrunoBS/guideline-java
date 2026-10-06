package br.com.brunobs.compression;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.nio.file.StandardOpenOption;

/** Executes one streaming compress/decompress round-trip and optionally appends its metrics to CSV. */
final class CompressionAnalysis {
    private static final long BYTES_PER_MIB = 1024L * 1024L;
    private static final String CSV_HEADER =
            "measured_at,algorithm,setting_name,setting_value,buffer_kib,original_bytes,compressed_bytes,"
            + "reduction_percent,compress_ms,compress_mib_s,decompress_ms,decompress_mib_s,"
            + "sha256_match,heap_used_before_bytes,heap_used_after_bytes";

    private CompressionAnalysis() { }

    static Result run(ApplicationOptions.RoundTrip options) throws IOException {
        Runtime runtime = Runtime.getRuntime();
        long heapBefore = usedHeap(runtime);

        var compression = options.algorithm().engine().compress(
                Files.newInputStream(options.input()), Files.newOutputStream(options.compressed()),
                options.setting(), options.bufferSize());
        long heapAfterCompress = usedHeap(runtime);

        var decompression = options.algorithm().engine().decompress(
                Files.newInputStream(options.compressed()), Files.newOutputStream(options.restored()),
                options.bufferSize());
        long heapAfter = usedHeap(runtime);

        boolean hashMatches = sha256(options.input()).equals(sha256(options.restored()));
        if (!hashMatches) {
            throw new IOException("SHA-256 diferente após descompressão; roundtrip interrompido.");
        }

        Result result = new Result(compression, decompression, hashMatches,
                heapBefore, Math.max(heapAfterCompress, heapAfter));
        if (options.analysisCsv() != null) {
            appendCsv(options, result);
        }
        return result;
    }

    private static void appendCsv(ApplicationOptions.RoundTrip options, Result result) throws IOException {
        Path csvPath = options.analysisCsv();
        boolean writeHeader = !Files.exists(csvPath) || Files.size(csvPath) == 0;
        try (BufferedWriter csv = Files.newBufferedWriter(csvPath, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.APPEND)) {
            if (writeHeader) {
                csv.write(CSV_HEADER);
                csv.newLine();
            }
            var compression = result.compression();
            var decompression = result.decompression();
            double reduction = percentageReduced(compression.originalBytes(), compression.compressedBytes());
            csv.write(String.format(java.util.Locale.ROOT,
                    "%s,%s,%s,%d,%d,%d,%d,%.3f,%.3f,%.3f,%.3f,%.3f,%s,%d,%d",
                    Instant.now(), options.algorithm().commandName(), options.algorithm().settingName(),
                    options.setting(), options.bufferSize() / 1024,
                    compression.originalBytes(), compression.compressedBytes(), reduction,
                    milliseconds(compression.elapsedNanos()),
                    mibPerSecond(compression.originalBytes(), compression.elapsedNanos()),
                    milliseconds(decompression.elapsedNanos()),
                    mibPerSecond(decompression.decompressedBytes(), decompression.elapsedNanos()),
                    result.sha256Match(), result.heapBefore(), result.heapAfter()));
            csv.newLine();
        }
    }

    private static double percentageReduced(long originalBytes, long compressedBytes) {
        if (originalBytes == 0) return 0;
        return 100d * (originalBytes - compressedBytes) / originalBytes;
    }

    private static double milliseconds(long nanos) {
        return nanos / 1_000_000d;
    }

    private static double mibPerSecond(long bytes, long nanos) {
        if (nanos <= 0) return 0;
        return bytes / (double) BYTES_PER_MIB / (nanos / 1_000_000_000d);
    }

    private static long usedHeap(Runtime runtime) {
        return runtime.totalMemory() - runtime.freeMemory();
    }

    private static String sha256(Path path) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (var input = Files.newInputStream(path)) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 indisponível na JVM.", impossible);
        }
    }

    record Result(CompressionEngine.CompressionResult compression,
                  CompressionEngine.DecompressionResult decompression,
                  boolean sha256Match, long heapBefore, long heapAfter) { }
}
