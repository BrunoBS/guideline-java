package br.com.brunobs.compression;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public final class Main {
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
            case "benchmark" -> CompressionBenchmarks.runBasic(BenchmarkOptions.basic(args));
            case "benchmark-levels" -> CompressionBenchmarks.runLevels(BenchmarkOptions.levels(args));
            case "train-dictionary" -> trainDictionary(args);
            case "benchmark-dictionary" -> CompressionBenchmarks.runDictionary(
                    BenchmarkOptions.dictionary(args));
            case "benchmark-algorithms" -> CompressionBenchmarks.runAlgorithms(
                    BenchmarkOptions.algorithms(args));
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
        CompressionAlgorithm algorithm;
        int setting;
        int bufferIndex;
        int inputIndex;
        int outputIndex;
        if (args.length == 5) {
            algorithm = CompressionAlgorithm.ZSTD; // Backward-compatible command form.
            setting = Integer.parseInt(args[1]);
            bufferIndex = 2;
            inputIndex = 3;
            outputIndex = 4;
        } else if (args.length == 6) {
            algorithm = CompressionAlgorithm.fromCommand(args[1]);
            setting = Integer.parseInt(args[2]);
            bufferIndex = 3;
            inputIndex = 4;
            outputIndex = 5;
        } else {
            throw new IllegalArgumentException(
                    "Uso: compress <algoritmo> <nível/qualidade/preset> <buffer-KiB> <entrada> <saída>");
        }
        int bufferSize = Math.multiplyExact(Integer.parseInt(args[bufferIndex]), 1024);
        var result = algorithm.engine().compress(Files.newInputStream(Path.of(args[inputIndex])),
                Files.newOutputStream(Path.of(args[outputIndex])), setting, bufferSize);
        System.out.printf("%s: original %d bytes; comprimido %d bytes; tempo %.3f ms%n",
                algorithm.commandName(), result.originalBytes(), result.compressedBytes(),
                result.elapsedNanos() / 1_000_000d);
    }

    private static void decompress(String[] args) throws IOException {
        CompressionAlgorithm algorithm;
        int bufferIndex;
        int inputIndex;
        int outputIndex;
        if (args.length == 4) {
            algorithm = CompressionAlgorithm.ZSTD; // Backward-compatible command form.
            bufferIndex = 1;
            inputIndex = 2;
            outputIndex = 3;
        } else if (args.length == 5) {
            algorithm = CompressionAlgorithm.fromCommand(args[1]);
            bufferIndex = 2;
            inputIndex = 3;
            outputIndex = 4;
        } else {
            throw new IllegalArgumentException(
                    "Uso: decompress <algoritmo> <buffer-KiB> <entrada-comprimida> <saída-json>");
        }
        int bufferSize = Math.multiplyExact(Integer.parseInt(args[bufferIndex]), 1024);
        var result = algorithm.engine().decompress(Files.newInputStream(Path.of(args[inputIndex])),
                Files.newOutputStream(Path.of(args[outputIndex])), bufferSize);
        System.out.printf("%s: comprimido %d bytes; restaurado %d bytes; tempo %.3f ms%n",
                algorithm.commandName(), result.compressedBytes(), result.decompressedBytes(),
                result.elapsedNanos() / 1_000_000d);
    }

    private static void printUsage() {
        System.out.println("Comandos: generate, compress, decompress, benchmark, benchmark-levels, benchmark-dictionary, benchmark-algorithms, train-dictionary");
        System.out.println("Ex.: generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset.json repetitive 1");
        System.out.println("Ex.: benchmark-algorithms dataset.json benchmark-algoritmos.csv 128 1");
        System.out.println("Ex.: compress xz 6 128 dataset.json dataset.json.xz");
        System.out.println("Ex.: decompress xz 128 dataset.json.xz restored.json");
        System.out.println("Ex.: train-dictionary amostras.json dictionary.zdict");
        System.out.println("Ex.: benchmark-dictionary dataset.json dictionary.zdict benchmark-dictionary.csv");
    }
}
