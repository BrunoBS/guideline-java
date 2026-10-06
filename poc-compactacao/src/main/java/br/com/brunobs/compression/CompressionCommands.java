package br.com.brunobs.compression;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

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

    static void compare(ApplicationOptions.Compare options) throws IOException {
        Files.createDirectories(options.outputDirectory());
        Files.deleteIfExists(options.analysisCsv());

        String inputName = options.input().getFileName().toString();
        for (CompressionAlgorithm algorithm : CompressionAlgorithm.values()) {
            String compressedName = inputName + "." + extension(algorithm);
            String restoredName = inputName + "." + extension(algorithm) + ".restored.json";
            Path compressed = options.outputDirectory().resolve(compressedName);
            Path restored = options.outputDirectory().resolve(restoredName);
            var run = new ApplicationOptions.RoundTrip(
                    algorithm, algorithm.defaultSetting(), options.bufferSize(),
                    options.input(), compressed, restored, options.analysisCsv());
            roundTrip(run);
        }
        System.out.printf("Comparação concluída. Arquivos e CSV em: %s%n", options.outputDirectory());
    }

    private static String extension(CompressionAlgorithm algorithm) {
        return switch (algorithm) {
            case ZSTD -> "zst";
            case GZIP -> "gz";
            case BROTLI -> "br";
            case XZ -> "xz";
        };
    }

    private static double percentageReduced(long originalBytes, long compressedBytes) {
        if (originalBytes == 0) return 0;
        return 100d * (originalBytes - compressedBytes) / originalBytes;
    }
}
