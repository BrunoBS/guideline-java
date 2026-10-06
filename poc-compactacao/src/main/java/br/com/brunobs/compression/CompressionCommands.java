package br.com.brunobs.compression;

import java.io.IOException;
import java.nio.file.Files;

final class CompressionCommands {
    private static final long BYTES_PER_MIB = 1024L * 1024L;

    private CompressionCommands() { }

    static void generate(ApplicationOptions.Generate options) throws IOException {
        long bytes = options.seed() == null
                ? JsonDatasetGenerator.generate(options.template(), options.sizeMiB(),
                        options.output(), options.profile())
                : JsonDatasetGenerator.generate(options.template(), options.sizeMiB(),
                        options.output(), options.profile(), options.seed());
        System.out.printf("Arquivo gerado: %s (%d bytes; alvo %d MiB)%n",
                options.output(), bytes, options.sizeMiB());
    }

    static void trainDictionary(ApplicationOptions.TrainDictionary options) throws IOException {
        long started = System.nanoTime();
        JsonDictionaryTrainer.TrainingResult result = JsonDictionaryTrainer.train(
                options.samples(), options.dictionary(),
                options.sampleCapacityBytes(), options.dictionarySizeBytes());
        System.out.printf("Dicionário treinado: %s; amostras: %d; bytes de amostras: %d; bytes do dicionário: %d; tempo: %.3f ms%n",
                options.dictionary(), result.sampleCount(), result.sampleBytes(), result.dictionaryBytes(),
                (System.nanoTime() - started) / 1_000_000d);
    }

    static void compress(ApplicationOptions.Compress options) throws IOException {
        var result = options.algorithm().engine().compress(
                Files.newInputStream(options.input()), Files.newOutputStream(options.output()),
                options.setting(), options.bufferSize());
        System.out.printf("%s: original %d bytes; comprimido %d bytes; tempo %.3f ms%n",
                options.algorithm().commandName(), result.originalBytes(), result.compressedBytes(),
                result.elapsedNanos() / 1_000_000d);
    }

    static void decompress(ApplicationOptions.Decompress options) throws IOException {
        var result = options.algorithm().engine().decompress(
                Files.newInputStream(options.input()), Files.newOutputStream(options.output()),
                options.bufferSize());
        System.out.printf("%s: comprimido %d bytes; restaurado %d bytes; tempo %.3f ms%n",
                options.algorithm().commandName(), result.compressedBytes(), result.decompressedBytes(),
                result.elapsedNanos() / 1_000_000d);
    }
}
