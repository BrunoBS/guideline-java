package br.com.brunobs.compression;

import java.io.IOException;
import java.nio.file.Files;

final class CompressionCommands {
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

    static void roundTrip(ApplicationOptions.RoundTrip options) throws IOException {
        var result = CompressionAnalysis.run(options);
        var compression = result.compression();
        var decompression = result.decompression();
        System.out.printf("%s: original %d bytes; compactado %d bytes; redução %.3f%%; "
                        + "compressão %.3f ms; descompressão %.3f ms; SHA-256 %s%n",
                options.algorithm().commandName(), compression.originalBytes(), compression.compressedBytes(),
                percentageReduced(compression.originalBytes(), compression.compressedBytes()),
                compression.elapsedNanos() / 1_000_000d, decompression.elapsedNanos() / 1_000_000d,
                result.sha256Match() ? "confere" : "diverge");
        if (options.analysisCsv() != null) {
            System.out.printf("Análise adicionada a: %s%n", options.analysisCsv());
        }
    }

    private static double percentageReduced(long originalBytes, long compressedBytes) {
        if (originalBytes == 0) return 0;
        return 100d * (originalBytes - compressedBytes) / originalBytes;
    }
}
