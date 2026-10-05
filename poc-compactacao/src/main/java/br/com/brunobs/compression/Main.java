package br.com.brunobs.compression;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.Set;

public final class Main {
    private static final int[] LEVELS = {1, 3, 6};
    private static final int[] BUFFERS = {32, 64, 128, 256};
    private static final int[] LEVELS_FOR_COMPARISON = {1, 3, 6, 9, 12, 15, 19};
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
            case "benchmark-levels" -> benchmarkLevels(args);
            case "train-dictionary" -> trainDictionary(args);
            case "benchmark-dictionary" -> benchmarkDictionary(args);
            default -> throw new IllegalArgumentException("Comando desconhecido: " + args[0]);
        }
    }

    private static void generate(String[] args) throws IOException {
        if (args.length < 5 || args.length > 6) {
            throw new IllegalArgumentException(
                    "Uso: generate <modelo-ConfigurationData> <dataset.json> <repetitive|realistic> <tamanho-MiB> [seed]");
        }
        long size = Long.parseLong(args[4]);
        JsonDatasetGenerator.Profile profile = JsonDatasetGenerator.Profile.valueOf(
                args[3].toUpperCase(java.util.Locale.ROOT));
        long bytes = args.length == 6
                ? JsonDatasetGenerator.generate(args[1], size, Path.of(args[2]), profile, Long.parseLong(args[5]))
                : JsonDatasetGenerator.generate(args[1], size, Path.of(args[2]), profile);
        System.out.printf("Arquivo gerado: %s (%d bytes; alvo %d MiB)%n", args[2], bytes, size);
    }

    private static void trainDictionary(String[] args) throws IOException {
        if (args.length < 3 || args.length > 5) {
            throw new IllegalArgumentException(
                    "Uso: train-dictionary <amostras.json> <dictionary.zdict> [capacidade-amostras-MiB] [dicionario-KiB]");
        }
        int sampleCapacityMiB = args.length >= 4 ? Integer.parseInt(args[3]) : 4;
        int dictionaryKiB = args.length >= 5 ? Integer.parseInt(args[4]) : 32;
        if (sampleCapacityMiB < 1) throw new IllegalArgumentException("A capacidade de amostras deve ser positiva.");
        if (dictionaryKiB < 1) throw new IllegalArgumentException("O tamanho do dicionário deve ser positivo.");

        long started = System.nanoTime();
        JsonDictionaryTrainer.TrainingResult result = JsonDictionaryTrainer.train(
                Path.of(args[1]), Path.of(args[2]),
                Math.toIntExact(Math.multiplyExact((long) sampleCapacityMiB, BYTES_PER_MIB)),
                Math.multiplyExact(dictionaryKiB, 1024));
        System.out.printf("Dicionário treinado: %s; amostras: %d; bytes de amostras: %d; bytes do dicionário: %d; tempo: %.3f ms%n",
                args[2], result.sampleCount(), result.sampleBytes(), result.dictionaryBytes(),
                (System.nanoTime() - started) / 1_000_000d);
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

    private static void benchmarkLevels(String[] args) throws IOException {
        if (args.length < 3 || args.length > 6) {
            throw new IllegalArgumentException(
                    "Uso: benchmark-levels <entrada.json> <relatorio.csv> [níveis] [buffer-KiB] [rodadas]");
        }
        Path input = Path.of(args[1]).toAbsolutePath();
        Path report = Path.of(args[2]).toAbsolutePath();
        int[] levels = args.length >= 4 ? parseLevels(args[3]) : LEVELS_FOR_COMPARISON.clone();
        int bufferKiB = args.length >= 5 ? Integer.parseInt(args[4]) : 128;
        int repetitions = args.length >= 6 ? Integer.parseInt(args[5]) : 3;
        if (bufferKiB < 1) throw new IllegalArgumentException("O buffer deve ser maior que zero.");
        if (repetitions < 1) throw new IllegalArgumentException("O número de rodadas deve ser maior que zero.");

        int bufferSize = Math.multiplyExact(bufferKiB, 1024);
        String sourceHash = sha256(input);
        Runtime runtime = Runtime.getRuntime();
        Path work = Files.createTempDirectory("compression-levels-");
        Path compressed = work.resolve("dataset.zst");
        Path restored = work.resolve("dataset-restored.json");

        try (BufferedWriter csv = Files.newBufferedWriter(report, StandardCharsets.UTF_8)) {
            csv.write("run,level,buffer_kib,original_bytes,compressed_bytes,reduction_percent,compress_ms,compress_mib_s,decompress_ms,decompress_mib_s,sha256_match,heap_used_before_bytes,heap_used_after_bytes");
            csv.newLine();

            System.out.printf("Aquecendo cada nível uma vez; buffer %d KiB; %d rodadas medidas.%n",
                    bufferKiB, repetitions);
            for (int level : levels) {
                measure(input, compressed, restored, level, bufferSize, sourceHash, runtime);
                System.out.printf("Aquecimento do nível %d concluído.%n", level);
            }

            for (int run = 1; run <= repetitions; run++) {
                for (int offset = 0; offset < levels.length; offset++) {
                    int level = levels[(offset + run - 1) % levels.length];
                    BenchmarkMeasurement measurement =
                            measure(input, compressed, restored, level, bufferSize, sourceHash, runtime);
                    var c = measurement.compression();
                    var d = measurement.decompression();
                    double reduction = 100d * (c.originalBytes() - c.compressedBytes()) / c.originalBytes();
                    csv.write(String.format(java.util.Locale.ROOT,
                            "%d,%d,%d,%d,%d,%.3f,%.3f,%.3f,%.3f,%.3f,%s,%d,%d",
                            run, level, bufferKiB, c.originalBytes(), c.compressedBytes(), reduction,
                            c.elapsedNanos() / 1_000_000d, mibPerSecond(c.originalBytes(), c.elapsedNanos()),
                            d.elapsedNanos() / 1_000_000d,
                            mibPerSecond(d.decompressedBytes(), d.elapsedNanos()), true,
                            measurement.heapBefore(), measurement.heapAfter()));
                    csv.newLine();
                    csv.flush();
                    System.out.printf("Rodada %d/%d — nível %d: %.3f%% de redução, %.3f ms.%n",
                            run, repetitions, level, reduction, c.elapsedNanos() / 1_000_000d);
                }
            }
        } finally {
            Files.deleteIfExists(compressed);
            Files.deleteIfExists(restored);
            Files.deleteIfExists(work);
        }
        System.out.printf("Benchmark de níveis concluído: %s%n", report);
    }

    private static void benchmarkDictionary(String[] args) throws IOException {
        if (args.length < 4 || args.length > 7) {
            throw new IllegalArgumentException(
                    "Uso: benchmark-dictionary <entrada.json> <dictionary.zdict> <relatorio.csv> [nível] [buffer-KiB] [rodadas]");
        }
        Path input = Path.of(args[1]).toAbsolutePath();
        Path dictionaryFile = Path.of(args[2]).toAbsolutePath();
        Path report = Path.of(args[3]).toAbsolutePath();
        int level = args.length >= 5 ? parseLevels(args[4])[0] : 19;
        int bufferKiB = args.length >= 6 ? Integer.parseInt(args[5]) : 128;
        int repetitions = args.length >= 7 ? Integer.parseInt(args[6]) : 3;
        if (bufferKiB < 1) throw new IllegalArgumentException("O buffer deve ser maior que zero.");
        if (repetitions < 1) throw new IllegalArgumentException("O número de rodadas deve ser maior que zero.");

        byte[] dictionary = Files.readAllBytes(dictionaryFile);
        if (dictionary.length == 0) throw new IOException("O arquivo de dicionário está vazio.");
        int bufferSize = Math.multiplyExact(bufferKiB, 1024);
        String sourceHash = sha256(input);
        Runtime runtime = Runtime.getRuntime();
        Path work = Files.createTempDirectory("compression-dictionary-");
        Path compressed = work.resolve("dataset.zst");
        Path restored = work.resolve("dataset-restored.json");

        try (BufferedWriter csv = Files.newBufferedWriter(report, StandardCharsets.UTF_8)) {
            csv.write("run,mode,level,original_bytes,compressed_bytes,dictionary_bytes,total_stored_bytes,reduction_percent,compress_ms,compress_mib_s,decompress_ms,decompress_mib_s,sha256_match,heap_used_before_bytes,heap_used_after_bytes");
            csv.newLine();

            System.out.printf("Aquecendo nível %d com e sem dicionário; buffer %d KiB; dicionário %d bytes.%n",
                    level, bufferKiB, dictionary.length);
            measureDictionary(input, compressed, restored, level, bufferSize, null, sourceHash, runtime);
            measureDictionary(input, compressed, restored, level, bufferSize, dictionary, sourceHash, runtime);

            for (int run = 1; run <= repetitions; run++) {
                for (int order = 0; order < 2; order++) {
                    boolean useDictionary = (run + order) % 2 == 0;
                    DictionaryMeasurement measurement = measureDictionary(
                            input, compressed, restored, level, bufferSize,
                            useDictionary ? dictionary : null, sourceHash, runtime);
                    var c = measurement.compression();
                    var d = measurement.decompression();
                    long dictionaryBytes = useDictionary ? dictionary.length : 0;
                    long totalStoredBytes = c.compressedBytes() + dictionaryBytes;
                    double reduction = 100d * (c.originalBytes() - totalStoredBytes) / c.originalBytes();
                    String mode = useDictionary ? "with_dictionary" : "without_dictionary";
                    csv.write(String.format(java.util.Locale.ROOT,
                            "%d,%s,%d,%d,%d,%d,%d,%.3f,%.3f,%.3f,%.3f,%.3f,%s,%d,%d",
                            run, mode, level, c.originalBytes(), c.compressedBytes(), dictionaryBytes,
                            totalStoredBytes, reduction, c.elapsedNanos() / 1_000_000d,
                            mibPerSecond(c.originalBytes(), c.elapsedNanos()),
                            d.elapsedNanos() / 1_000_000d,
                            mibPerSecond(d.decompressedBytes(), d.elapsedNanos()), true,
                            measurement.heapBefore(), measurement.heapAfter()));
                    csv.newLine();
                    csv.flush();
                    System.out.printf("Rodada %d/%d — %s: %.3f%%; compactado %d bytes; tempo %.3f ms.%n",
                            run, repetitions, mode, reduction, c.compressedBytes(),
                            c.elapsedNanos() / 1_000_000d);
                }
            }
        } finally {
            Files.deleteIfExists(compressed);
            Files.deleteIfExists(restored);
            Files.deleteIfExists(work);
        }
        System.out.printf("Benchmark com dicionário concluído: %s%n", report);
    }

    private static DictionaryMeasurement measureDictionary(Path input, Path compressed, Path restored,
                                                            int level, int bufferSize, byte[] dictionary,
                                                            String sourceHash, Runtime runtime)
            throws IOException {
        long heapBefore = usedHeap(runtime);
        ZstdCompressionEngine engine = new ZstdCompressionEngine();
        var compression = engine.compress(Files.newInputStream(input), Files.newOutputStream(compressed),
                level, bufferSize, dictionary);
        long heapAfterCompress = usedHeap(runtime);
        var decompression = engine.decompress(Files.newInputStream(compressed), Files.newOutputStream(restored),
                bufferSize, dictionary);
        long heapAfter = usedHeap(runtime);
        if (!sourceHash.equals(sha256(restored))) {
            throw new IOException("SHA-256 diferente no benchmark com dicionário; benchmark interrompido.");
        }
        return new DictionaryMeasurement(compression, decompression, heapBefore,
                Math.max(heapAfterCompress, heapAfter));
    }

    private record DictionaryMeasurement(
            CompressionEngine.CompressionResult compression,
            CompressionEngine.DecompressionResult decompression,
            long heapBefore,
            long heapAfter) { }

    private static BenchmarkMeasurement measure(Path input, Path compressed, Path restored, int level,
                                                int bufferSize, String sourceHash, Runtime runtime)
            throws IOException {
        long heapBefore = usedHeap(runtime);
        var compression = new ZstdCompressionEngine().compress(Files.newInputStream(input),
                Files.newOutputStream(compressed), level, bufferSize);
        long heapAfterCompress = usedHeap(runtime);
        var decompression = new ZstdCompressionEngine().decompress(Files.newInputStream(compressed),
                Files.newOutputStream(restored), bufferSize);
        long heapAfter = usedHeap(runtime);
        if (!sourceHash.equals(sha256(restored))) {
            throw new IOException("SHA-256 diferente no nível " + level + "; benchmark interrompido.");
        }
        return new BenchmarkMeasurement(compression, decompression, heapBefore,
                Math.max(heapAfterCompress, heapAfter));
    }

    private static int[] parseLevels(String value) {
        String[] parts = value.split(",", -1);
        int[] levels = new int[parts.length];
        Set<Integer> unique = new HashSet<>();
        for (int i = 0; i < parts.length; i++) {
            int level;
            try {
                level = Integer.parseInt(parts[i].trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Níveis devem ser números separados por vírgula: " + value, e);
            }
            if (level < 1 || level > 19) {
                throw new IllegalArgumentException("Níveis aceitos neste benchmark: de 1 a 19.");
            }
            if (!unique.add(level)) throw new IllegalArgumentException("Nível repetido: " + level);
            levels[i] = level;
        }
        return levels;
    }

    private record BenchmarkMeasurement(
            CompressionEngine.CompressionResult compression,
            CompressionEngine.DecompressionResult decompression,
            long heapBefore,
            long heapAfter) { }

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
        System.out.println("Comandos: generate, compress, decompress, benchmark, benchmark-levels, train-dictionary, benchmark-dictionary");
        System.out.println("Ex.: generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset.json repetitive 1");
        System.out.println("Ex.: train-dictionary amostras.json dictionary.zdict");
        System.out.println("Ex.: benchmark-dictionary dataset.json dictionary.zdict benchmark-dictionary.csv");
    }
}
