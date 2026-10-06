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
import java.util.List;
import java.nio.file.StandardOpenOption;

/** Executes one streaming compress/decompress round-trip and optionally appends its metrics to CSV. */
final class CompressionAnalysis {
    private static final long BYTES_PER_MIB = 1024L * 1024L;
    private static final String CSV_HEADER =
            "measured_at,algorithm,setting_name,setting_value,buffer_kib,original_bytes,compressed_bytes,"
            + "reduction_percent,compress_ms,compress_mib_s,decompress_ms,decompress_mib_s,"
            + "sha256_match,heap_used_before_bytes,heap_used_after_bytes,"
            + "compress_process_cpu_ms,compress_cpu_percent_one_core,"
            + "compress_heap_before_bytes,compress_heap_peak_bytes,compress_heap_after_bytes,"
            + "compress_rss_before_bytes,compress_rss_peak_bytes,compress_rss_after_bytes,"
            + "compress_private_resident_before_bytes,compress_private_resident_peak_bytes,"
            + "compress_private_resident_after_bytes,"
            + "decompress_process_cpu_ms,decompress_cpu_percent_one_core,"
            + "decompress_heap_before_bytes,decompress_heap_peak_bytes,decompress_heap_after_bytes,"
            + "decompress_rss_before_bytes,decompress_rss_peak_bytes,decompress_rss_after_bytes,"
            + "decompress_private_resident_before_bytes,decompress_private_resident_peak_bytes,"
            + "decompress_private_resident_after_bytes";

    private CompressionAnalysis() { }

    static Result run(ApplicationOptions.RoundTrip options) throws IOException {
        long heapBefore = usedHeap();

        var compressionResources = ResourceMonitor.measure(() ->
                options.algorithm().engine().compress(
                        Files.newInputStream(options.input()), Files.newOutputStream(options.compressed()),
                        options.setting(), options.bufferSize()));
        var compression = compressionResources.value();

        var decompressionResources = ResourceMonitor.measure(() ->
                options.algorithm().engine().decompress(
                        Files.newInputStream(options.compressed()), Files.newOutputStream(options.restored()),
                        options.bufferSize()));
        var decompression = decompressionResources.value();
        long heapAfter = usedHeap();

        boolean hashMatches = sha256(options.input()).equals(sha256(options.restored()));
        if (!hashMatches) {
            throw new IOException("SHA-256 diferente após descompressão; roundtrip interrompido.");
        }

        Result result = new Result(compression, decompression, hashMatches,
                heapBefore, heapAfter, compressionResources, decompressionResources);
        if (options.analysisCsv() != null) {
            appendCsv(options, result);
        }
        return result;
    }

    private static void appendCsv(ApplicationOptions.RoundTrip options, Result result) throws IOException {
        Path csvPath = options.analysisCsv();
        boolean writeHeader = !Files.exists(csvPath) || Files.size(csvPath) == 0;
        if (!writeHeader) {
            try (var existing = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
                if (!CSV_HEADER.equals(existing.readLine())) {
                    throw new IOException("O CSV existente usa outro formato. Informe um novo caminho "
                            + "ou remova o arquivo antes de gravar novas métricas: " + csvPath);
                }
            }
        }
        try (BufferedWriter csv = Files.newBufferedWriter(csvPath, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.APPEND)) {
            if (writeHeader) {
                csv.write(CSV_HEADER);
                csv.newLine();
            }
            var compression = result.compression();
            var decompression = result.decompression();
            var compressionResources = result.compressionResources();
            var decompressionResources = result.decompressionResources();
            double reduction = percentageReduced(compression.originalBytes(), compression.compressedBytes());

            List<String> fields = List.of(
                    Instant.now().toString(),
                    options.algorithm().commandName(),
                    options.algorithm().settingName(),
                    Integer.toString(options.setting()),
                    Integer.toString(options.bufferSize() / 1024),
                    Long.toString(compression.originalBytes()),
                    Long.toString(compression.compressedBytes()),
                    format(reduction, 3),
                    format(milliseconds(compression.elapsedNanos()), 3),
                    format(mibPerSecond(compression.originalBytes(), compression.elapsedNanos()), 3),
                    format(milliseconds(decompression.elapsedNanos()), 3),
                    format(mibPerSecond(decompression.decompressedBytes(), decompression.elapsedNanos()), 3),
                    Boolean.toString(result.sha256Match()),
                    Long.toString(result.heapBefore()),
                    Long.toString(result.heapAfter()),
                    optionalMilliseconds(compressionResources.processCpuNanos()),
                    optionalPercent(compressionResources.processCpuPercentOfOneCore()),
                    Long.toString(compressionResources.heapBeforeBytes()),
                    Long.toString(compressionResources.heapPeakBytes()),
                    Long.toString(compressionResources.heapAfterBytes()),
                    optionalBytes(compressionResources.rssBeforeBytes()),
                    optionalBytes(compressionResources.rssPeakBytes()),
                    optionalBytes(compressionResources.rssAfterBytes()),
                    optionalBytes(compressionResources.privateResidentBeforeBytes()),
                    optionalBytes(compressionResources.privateResidentPeakBytes()),
                    optionalBytes(compressionResources.privateResidentAfterBytes()),
                    optionalMilliseconds(decompressionResources.processCpuNanos()),
                    optionalPercent(decompressionResources.processCpuPercentOfOneCore()),
                    Long.toString(decompressionResources.heapBeforeBytes()),
                    Long.toString(decompressionResources.heapPeakBytes()),
                    Long.toString(decompressionResources.heapAfterBytes()),
                    optionalBytes(decompressionResources.rssBeforeBytes()),
                    optionalBytes(decompressionResources.rssPeakBytes()),
                    optionalBytes(decompressionResources.rssAfterBytes()),
                    optionalBytes(decompressionResources.privateResidentBeforeBytes()),
                    optionalBytes(decompressionResources.privateResidentPeakBytes()),
                    optionalBytes(decompressionResources.privateResidentAfterBytes()));
            csv.write(String.join(",", fields));
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

    private static String format(double value, int decimals) {
        return String.format(java.util.Locale.ROOT, "%." + decimals + "f", value);
    }

    private static String optionalMilliseconds(long nanos) {
        return nanos < 0 ? "" : format(milliseconds(nanos), 3);
    }

    private static String optionalPercent(double percent) {
        return percent < 0 ? "" : format(percent, 2);
    }

    private static String optionalBytes(long bytes) {
        return bytes < 0 ? "" : Long.toString(bytes);
    }

    private static double mibPerSecond(long bytes, long nanos) {
        if (nanos <= 0) return 0;
        return bytes / (double) BYTES_PER_MIB / (nanos / 1_000_000_000d);
    }

    private static long usedHeap() {
        Runtime runtime = Runtime.getRuntime();
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
                  boolean sha256Match, long heapBefore, long heapAfter,
                  ResourceMonitor.Measurement<CompressionEngine.CompressionResult> compressionResources,
                  ResourceMonitor.Measurement<CompressionEngine.DecompressionResult> decompressionResources) { }
}
