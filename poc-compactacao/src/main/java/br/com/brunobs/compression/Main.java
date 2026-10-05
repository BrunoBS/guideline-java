package br.com.brunobs.compression;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class Main {
    private static final int[] LEVELS = {1, 3, 6};
    private static final int[] BUFFERS = {32, 64, 128, 256};
    private static final long BYTES_PER_MIB = 1024L * 1024L;

    private Main() { }

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            printUsage();
            return;
        }
        switch (args[0]) {
            case "generate" -> generate(args);
            case "compress" -> compress(args);
            case "decompress" -> decompress(args);
            case "benchmark" -> benchmark(args);
            default -> throw new IllegalArgumentException("Comando desconhecido: " + args[0]);
        }
    }

    private static void generate(String[] args) throws IOException {
        if (args.length < 4 || args.length > 5) {
            throw new IllegalArgumentException(
                    "Uso: generate <tamanho-MiB> <modelo-ConfigurationData> <arquivo-saida> [repetitive|realistic]");
        }
        long size = Long.parseLong(args[1]);
        JsonDatasetGenerator.Profile profile = args.length == 5
                ? JsonDatasetGenerator.Profile.valueOf(args[4].toUpperCase(java.util.Locale.ROOT))
                : JsonDatasetGenerator.Profile.REPETITIVE;
        long bytes = JsonDatasetGenerator.generate(args[2], size, Path.of(args[3]), profile);
        System.out.printf("Arquivo gerado: %s (%d bytes; alvo %d MiB)%n", args[3], bytes, size);
    }

    private static void compress(String[] args) throws IOException {
        requireArgs(args, 5, "compress <nível> <buffer-KiB> <entrada> <saída.zst>");
        int level = Integer.parseInt(args[1]);
        int bufferSize = Math.multiplyExact(Integer.parseInt(args[2]), 1024);
        var result = new ZstdCompressionEngine().compress(
                Files.newInputStream(Path.of(args[3])), Files.newOutputStream(Path.of(args[4])), level, bufferSize);
        System.out.printf("Original: %d bytes; comprimido: %d bytes; tempo: %.3f ms%n",
                result.originalBytes(), result.compressedBytes(), result.elapsedNanos() / 1_000_000d);
    }

    private static void decompress(String[] args) throws IOException {
        requireArgs(args, 4, "decompress <buffer-KiB> <entrada.zst> <saída.json>");
        int bufferSize = Math.multiplyExact(Integer.parseInt(args[1]), 1024);
        var result = new ZstdCompressionEngine().decompress(
                Files.newInputStream(Path.of(args[2])), Files.newOutputStream(Path.of(args[3])), bufferSize);
        System.out.printf("Comprimido: %d bytes; descomprimido: %d bytes; tempo: %.3f ms%n",
                result.compressedBytes(), result.decompressedBytes(), result.elapsedNanos() / 1_000_000d);
    }

    private static void benchmark(String[] args) throws IOException {
        requireArgs(args, 3, "benchmark <entrada.json> <relatorio.csv>");
        Path input = Path.of(args[1]).toAbsolutePath();
        Path report = Path.of(args[2]).toAbsolutePath();
        Path work = Files.createTempDirectory("compression-poc-");
        String sourceHash = sha256(input);
        Runtime runtime = Runtime.getRuntime();
        try (BufferedWriter csv = Files.newBufferedWriter(report, StandardCharsets.UTF_8)) {
            csv.write("level,buffer_kib,original_bytes,compressed_bytes,reduction_percent,compress_ms,compress_mib_s,decompress_ms,decompress_mib_s,sha256_match,heap_used_before_bytes,heap_used_after_bytes");
            csv.newLine();
            for (int level : LEVELS) {
                for (int bufferKiB : BUFFERS) {
                    Path compressed = work.resolve("dataset.zst");
                    Path restored = work.resolve("dataset-restored.json");
                    long heapBefore = usedHeap(runtime);
                    var c = new ZstdCompressionEngine().compress(Files.newInputStream(input),
                            Files.newOutputStream(compressed), level, bufferKiB * 1024);
                    long heapAfterCompress = usedHeap(runtime);
                    var d = new ZstdCompressionEngine().decompress(Files.newInputStream(compressed),
                            Files.newOutputStream(restored), bufferKiB * 1024);
                    long heapAfter = usedHeap(runtime);
                    boolean hashMatches = sourceHash.equals(sha256(restored));
                    if (!hashMatches) {
                        throw new IOException("SHA-256 diferente após round-trip; benchmark interrompido.");
                    }
                    double reduction = 100d * (c.originalBytes() - c.compressedBytes()) / c.originalBytes();
                    csv.write(String.format(java.util.Locale.ROOT,
                            "%d,%d,%d,%d,%.3f,%.3f,%.3f,%.3f,%.3f,%s,%d,%d",
                            level, bufferKiB, c.originalBytes(), c.compressedBytes(), reduction,
                            c.elapsedNanos() / 1_000_000d, mibPerSecond(c.originalBytes(), c.elapsedNanos()),
                            d.elapsedNanos() / 1_000_000d,
                            mibPerSecond(d.decompressedBytes(), d.elapsedNanos()), hashMatches,
                            heapBefore, Math.max(heapAfterCompress, heapAfter)));
                    csv.newLine();
                    csv.flush();
                    Files.deleteIfExists(compressed);
                    Files.deleteIfExists(restored);
                }
            }
        } finally {
            Files.deleteIfExists(work);
        }
        System.out.printf("Benchmark concluído: %s%n", report);
    }

    private static long usedHeap(Runtime runtime) {
        return runtime.totalMemory() - runtime.freeMemory();
    }

    private static double mibPerSecond(long bytes, long nanos) {
        return bytes / (double) BYTES_PER_MIB / (nanos / 1_000_000_000d);
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

    private static void requireArgs(String[] args, int expected, String usage) {
        if (args.length != expected) throw new IllegalArgumentException("Uso: " + usage);
    }

    private static void printUsage() {
        System.out.println("Comandos: generate, compress, decompress, benchmark");
        System.out.println("Ex.: generate 1 '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset.json");
    }
}
