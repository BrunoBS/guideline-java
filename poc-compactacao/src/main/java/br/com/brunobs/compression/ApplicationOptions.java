package br.com.brunobs.compression;

import java.nio.file.Path;
import java.util.Locale;

/** Converts CLI tokens into validated command options. */
final class ApplicationOptions {
    private static final long BYTES_PER_MIB = 1024L * 1024L;

    private ApplicationOptions() { }

    record Generate(String template, Path output, JsonDatasetGenerator.Profile profile,
                    long sizeMiB, Long seed) { }

    record TrainDictionary(Path samples, Path dictionary, int sampleCapacityBytes,
                           int dictionarySizeBytes) { }

    record Compress(CompressionAlgorithm algorithm, int setting, int bufferSize,
                    Path input, Path output) { }

    record Decompress(CompressionAlgorithm algorithm, int bufferSize,
                      Path input, Path output) { }

    static Generate generate(String[] args) {
        requireLength(args, 5, 6,
                "generate <modelo-ConfigurationData> <dataset.json> <repetitive|realistic> <tamanho-MiB> [seed]");
        var profile = JsonDatasetGenerator.Profile.valueOf(args[3].toUpperCase(Locale.ROOT));
        Long seed = args.length == 6 ? Long.parseLong(args[5]) : null;
        return new Generate(args[1], Path.of(args[2]), profile, Long.parseLong(args[4]), seed);
    }

    static TrainDictionary trainDictionary(String[] args) {
        requireLength(args, 3, 5,
                "train-dictionary <amostras.json> <dictionary.zdict> [capacidade-amostras-MiB] [dicionario-KiB]");
        int sampleCapacityMiB = args.length >= 4 ? Integer.parseInt(args[3]) : 4;
        int dictionaryKiB = args.length >= 5 ? Integer.parseInt(args[4]) : 32;
        if (sampleCapacityMiB < 1) throw new IllegalArgumentException("A capacidade de amostras deve ser positiva.");
        if (dictionaryKiB < 1) throw new IllegalArgumentException("O tamanho do dicionário deve ser positivo.");
        int sampleCapacityBytes = Math.toIntExact(Math.multiplyExact((long) sampleCapacityMiB, BYTES_PER_MIB));
        int dictionarySizeBytes = Math.multiplyExact(dictionaryKiB, 1024);
        return new TrainDictionary(Path.of(args[1]), Path.of(args[2]),
                sampleCapacityBytes, dictionarySizeBytes);
    }

    static Compress compress(String[] args) {
        if (args.length == 5) {
            return compress(CompressionAlgorithm.ZSTD, args[1], args[2], args[3], args[4]);
        }
        if (args.length == 6) {
            return compress(CompressionAlgorithm.fromCommand(args[1]), args[2], args[3], args[4], args[5]);
        }
        throw new IllegalArgumentException(
                "Uso: compress <algoritmo> <nível/qualidade/preset> <buffer-KiB> <entrada> <saída>");
    }

    static Decompress decompress(String[] args) {
        if (args.length == 4) {
            return decompress(CompressionAlgorithm.ZSTD, args[1], args[2], args[3]);
        }
        if (args.length == 5) {
            return decompress(CompressionAlgorithm.fromCommand(args[1]), args[2], args[3], args[4]);
        }
        throw new IllegalArgumentException(
                "Uso: decompress <algoritmo> <buffer-KiB> <entrada-comprimida> <saída-json>");
    }

    private static Compress compress(CompressionAlgorithm algorithm, String setting, String bufferKiB,
                                    String input, String output) {
        int bufferSize = bufferSize(bufferKiB);
        return new Compress(algorithm, Integer.parseInt(setting), bufferSize,
                Path.of(input), Path.of(output));
    }

    private static Decompress decompress(CompressionAlgorithm algorithm, String bufferKiB,
                                         String input, String output) {
        return new Decompress(algorithm, bufferSize(bufferKiB), Path.of(input), Path.of(output));
    }

    private static int bufferSize(String value) {
        int bufferKiB = Integer.parseInt(value);
        if (bufferKiB < 1) throw new IllegalArgumentException("O buffer deve ser maior que zero.");
        return Math.multiplyExact(bufferKiB, 1024);
    }

    private static void requireLength(String[] args, int minimum, int maximum, String usage) {
        if (args.length < minimum || args.length > maximum) {
            throw new IllegalArgumentException("Uso: " + usage);
        }
    }
}
