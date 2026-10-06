package br.com.brunobs.compression.application;

import br.com.brunobs.compression.dataset.JsonDatasetGenerator;
import br.com.brunobs.compression.engine.CompressionAlgorithm;

import java.nio.file.Path;
import java.util.Locale;

/** Converts CLI tokens into validated command options. */
public final class ApplicationOptions {
    private ApplicationOptions() { }

    public record Generate(String template, Path output, JsonDatasetGenerator.Profile profile,
                    long sizeMiB, Long seed) { }

    public record Compress(CompressionAlgorithm algorithm, int setting, int bufferSize,
                    Path input, Path output) { }

    public record Decompress(CompressionAlgorithm algorithm, int bufferSize,
                      Path input, Path output) { }

    public record RoundTrip(CompressionAlgorithm algorithm, int setting, int bufferSize,
                     Path input, Path compressed, Path restored, Path analysisCsv) { }

    public record Compare(Path input, Path outputDirectory, Path analysisCsv, int bufferSize) { }

    public static Generate generate(String[] args) {
        requireLength(args, 5, 6,
                "generate <modelo-JSON> <dataset.json> <repetitive|realistic> <tamanho-MiB> [seed]");
        var profile = JsonDatasetGenerator.Profile.valueOf(args[3].toUpperCase(Locale.ROOT));
        Long seed = args.length == 6 ? Long.parseLong(args[5]) : null;
        return new Generate(args[1], Path.of(args[2]), profile, Long.parseLong(args[4]), seed);
    }

    public static Compress compress(String[] args) {
        if (args.length == 5) {
            return compress(CompressionAlgorithm.ZSTD, args[1], args[2], args[3], args[4]);
        }
        if (args.length == 6) {
            return compress(CompressionAlgorithm.fromCommand(args[1]), args[2], args[3], args[4], args[5]);
        }
        throw new IllegalArgumentException(
                "Uso: compress <algoritmo> <nível/qualidade/preset> <buffer-KiB> <entrada> <saída>");
    }

    public static Decompress decompress(String[] args) {
        if (args.length == 4) {
            return decompress(CompressionAlgorithm.ZSTD, args[1], args[2], args[3]);
        }
        if (args.length == 5) {
            return decompress(CompressionAlgorithm.fromCommand(args[1]), args[2], args[3], args[4]);
        }
        throw new IllegalArgumentException(
                "Uso: decompress <algoritmo> <buffer-KiB> <entrada-comprimida> <saída-json>");
    }

    public static RoundTrip roundTrip(String[] args) {
        if (args.length != 7 && args.length != 9) {
            throw new IllegalArgumentException(
                    "Uso: roundtrip <algoritmo> <nível/qualidade/preset> <buffer-KiB> "
                            + "<entrada> <compactado> <restaurado> [--analysis <relatorio.csv>]");
        }
        Path analysisCsv = null;
        if (args.length == 9) {
            if (!"--analysis".equals(args[7])) {
                throw new IllegalArgumentException("O argumento opcional esperado é --analysis <relatorio.csv>.");
            }
            analysisCsv = Path.of(args[8]);
        }
        return new RoundTrip(CompressionAlgorithm.fromCommand(args[1]), Integer.parseInt(args[2]),
                bufferSize(args[3]), Path.of(args[4]), Path.of(args[5]), Path.of(args[6]), analysisCsv);
    }

    public static Compare compare(String[] args) {
        requireLength(args, 2, 3, "compare <entrada.json> [buffer-KiB]");
        int bufferSize = bufferSize(args.length == 3 ? args[2] : "128");
        Path outputDirectory = Path.of("comparacao-algoritmos");
        return new Compare(Path.of(args[1]), outputDirectory,
                outputDirectory.resolve("comparacao.csv"), bufferSize);
    }

    private static Compress compress(CompressionAlgorithm algorithm, String setting, String bufferKiB,
                                    String input, String output) {
        return new Compress(algorithm, Integer.parseInt(setting), bufferSize(bufferKiB),
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
