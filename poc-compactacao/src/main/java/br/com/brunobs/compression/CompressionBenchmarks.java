package br.com.brunobs.compression;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Runs the file-based compression benchmarks independently from CLI parsing. */
final class CompressionBenchmarks {
    private static final int[] LEVELS = {1, 3, 6};
    private static final int[] BUFFERS = {32, 64, 128, 256};
    private static final long BYTES_PER_MIB = 1024L * 1024L;

    private CompressionBenchmarks() { }

    static void runAlgorithms(BenchmarkOptions.Algorithms options) throws IOException {
        Path input = options.input();
        Path report = options.report();
        int bufferKiB = options.bufferKiB();
        int repetitions = options.repetitions();
        CompressionAlgorithm[] algorithms = CompressionAlgorithm.values();
        int bufferSize = Math.multiplyExact(bufferKiB, 1024);
        String sourceHash = sha256(input);
        Runtime runtime = Runtime.getRuntime();
        Path work = Files.createTempDirectory("compression-algorithms-");
        Path compressed = work.resolve("dataset.compressed");
        Path restored = work.resolve("dataset-restored.json");

        try (BufferedWriter csv = Files.newBufferedWriter(report, StandardCharsets.UTF_8)) {
            csv.write("run,algorithm,setting_name,setting_value,buffer_kib,original_bytes,compressed_bytes,reduction_percent,compress_ms,compress_mib_s,decompress_ms,decompress_mib_s,sha256_match,heap_used_before_bytes,heap_used_after_bytes");
            csv.newLine();

            System.out.printf("Aquecendo %d algoritmos; buffer %d KiB; %d rodadas medidas.%n",
                    algorithms.length, bufferKiB, repetitions);
            for (CompressionAlgorithm algorithm : algorithms) {
                measureAlgorithm(input, compressed, restored, algorithm, bufferSize, sourceHash, runtime);
                System.out.printf("Aquecimento %s concluído.%n", algorithm.commandName());
            }

            for (int run = 1; run <= repetitions; run++) {
                for (int offset = 0; offset < algorithms.length; offset++) {
                    CompressionAlgorithm algorithm = algorithms[(offset + run - 1) % algorithms.length];
                    AlgorithmMeasurement measurement = measureAlgorithm(
                            input, compressed, restored, algorithm, bufferSize, sourceHash, runtime);
                    var compression = measurement.compression();
                    var decompression = measurement.decompression();
                    double reduction = 100d * (compression.originalBytes() - compression.compressedBytes())
                            / compression.originalBytes();
                    csv.write(String.format(java.util.Locale.ROOT,
                            "%d,%s,%s,%d,%d,%d,%d,%.3f,%.3f,%.3f,%.3f,%.3f,%s,%d,%d",
                            run, algorithm.commandName(), algorithm.settingName(), algorithm.defaultSetting(),
                            bufferKiB, compression.originalBytes(), compression.compressedBytes(), reduction,
                            compression.elapsedNanos() / 1_000_000d,
                            mibPerSecond(compression.originalBytes(), compression.elapsedNanos()),
                            decompression.elapsedNanos() / 1_000_000d,
                            mibPerSecond(decompression.decompressedBytes(), decompression.elapsedNanos()),
                            true, measurement.heapBefore(), measurement.heapAfter()));
                    csv.newLine();
                    csv.flush();
                    System.out.printf("Rodada %d/%d — %s (%s %d): %.3f%%; %d bytes; %.3f ms.%n",
                            run, repetitions, algorithm.commandName(), algorithm.settingName(),
                            algorithm.defaultSetting(), reduction, compression.compressedBytes(),
                            compression.elapsedNanos() / 1_000_000d);
                }
            }
        } finally {
            Files.deleteIfExists(compressed);
            Files.deleteIfExists(restored);
            Files.deleteIfExists(work);
        }
        System.out.printf("Benchmark dos algoritmos concluído: %s%n", report);
    
    }

    static void runBasic(BenchmarkOptions.Basic options) throws IOException {
        Path input = options.input();
        Path report = options.report();
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

    static void runLevels(BenchmarkOptions.Levels options) throws IOException {
        Path input = options.input();
        Path report = options.report();
        int[] levels = options.levels();
        int bufferKiB = options.bufferKiB();
        int repetitions = options.repetitions();
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

    static void runDictionary(BenchmarkOptions.Dictionary options) throws IOException {
        Path input = options.input();
        Path dictionaryFile = options.dictionary();
        Path report = options.report();
        int level = options.level();
        int bufferKiB = options.bufferKiB();
        int repetitions = options.repetitions();
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

    private static AlgorithmMeasurement measureAlgorithm(Path input, Path compressed, Path restored,
                                                          CompressionAlgorithm algorithm, int bufferSize,
                                                          String sourceHash, Runtime runtime) throws IOException {
        long heapBefore = usedHeap(runtime);
        var compression = algorithm.engine().compress(Files.newInputStream(input),
                Files.newOutputStream(compressed), algorithm.defaultSetting(), bufferSize);
        long heapAfterCompress = usedHeap(runtime);
        var decompression = algorithm.engine().decompress(Files.newInputStream(compressed),
                Files.newOutputStream(restored), bufferSize);
        long heapAfter = usedHeap(runtime);
        if (!sourceHash.equals(sha256(restored))) {
            throw new IOException("SHA-256 diferente no algoritmo " + algorithm.commandName()
                    + "; benchmark interrompido.");
        }
        return new AlgorithmMeasurement(compression, decompression, heapBefore,
                Math.max(heapAfterCompress, heapAfter));
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

    private record DictionaryMeasurement(
            CompressionEngine.CompressionResult compression,
            CompressionEngine.DecompressionResult decompression,
            long heapBefore,
            long heapAfter) { }

    private record BenchmarkMeasurement(
            CompressionEngine.CompressionResult compression,
            CompressionEngine.DecompressionResult decompression,
            long heapBefore,
            long heapAfter) { }

    private record AlgorithmMeasurement(
            CompressionEngine.CompressionResult compression,
            CompressionEngine.DecompressionResult decompression,
            long heapBefore,
            long heapAfter) { }
}
