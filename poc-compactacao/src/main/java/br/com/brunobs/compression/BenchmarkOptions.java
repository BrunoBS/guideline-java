package br.com.brunobs.compression;

import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;

/** Parses benchmark CLI arguments once and exposes typed options to the runners. */
final class BenchmarkOptions {
    private static final int[] DEFAULT_LEVELS = {1, 3, 6, 9, 12, 15, 19};

    private BenchmarkOptions() { }

    record Basic(Path input, Path report) { }

    record Algorithms(Path input, Path report, int bufferKiB, int repetitions) { }

    record Levels(Path input, Path report, int[] levels, int bufferKiB, int repetitions) {
        Levels {
            levels = levels.clone();
        }

        @Override
        public int[] levels() {
            return levels.clone();
        }
    }

    record Dictionary(Path input, Path dictionary, Path report, int level,
                      int bufferKiB, int repetitions) { }

    static Basic basic(String[] args) {
        requireLength(args, 3, 3, "benchmark <entrada.json> <relatorio.csv>");
        return new Basic(path(args[1]), path(args[2]));
    }

    static Algorithms algorithms(String[] args) {
        requireLength(args, 3, 5,
                "benchmark-algorithms <entrada.json> <relatorio.csv> [buffer-KiB] [rodadas]");
        int bufferKiB = optionalInt(args, 3, 128);
        int repetitions = optionalInt(args, 4, 1);
        validateRunSettings(bufferKiB, repetitions);
        return new Algorithms(path(args[1]), path(args[2]), bufferKiB, repetitions);
    }

    static Levels levels(String[] args) {
        requireLength(args, 3, 6,
                "benchmark-levels <entrada.json> <relatorio.csv> [níveis] [buffer-KiB] [rodadas]");
        int[] levels = args.length >= 4 ? parseLevels(args[3]) : DEFAULT_LEVELS.clone();
        int bufferKiB = optionalInt(args, 4, 128);
        int repetitions = optionalInt(args, 5, 3);
        validateRunSettings(bufferKiB, repetitions);
        return new Levels(path(args[1]), path(args[2]), levels, bufferKiB, repetitions);
    }

    static Dictionary dictionary(String[] args) {
        requireLength(args, 4, 7,
                "benchmark-dictionary <entrada.json> <dictionary.zdict> <relatorio.csv> [nível] [buffer-KiB] [rodadas]");
        int level = optionalInt(args, 4, 19);
        if (level < 1 || level > 19) {
            throw new IllegalArgumentException("Níveis aceitos neste benchmark: de 1 a 19.");
        }
        int bufferKiB = optionalInt(args, 5, 128);
        int repetitions = optionalInt(args, 6, 3);
        validateRunSettings(bufferKiB, repetitions);
        return new Dictionary(path(args[1]), path(args[2]), path(args[3]),
                level, bufferKiB, repetitions);
    }

    private static Path path(String value) {
        return Path.of(value).toAbsolutePath();
    }

    private static int optionalInt(String[] args, int index, int defaultValue) {
        return args.length > index ? Integer.parseInt(args[index]) : defaultValue;
    }

    private static void validateRunSettings(int bufferKiB, int repetitions) {
        if (bufferKiB < 1) throw new IllegalArgumentException("O buffer deve ser maior que zero.");
        if (repetitions < 1) throw new IllegalArgumentException("O número de rodadas deve ser maior que zero.");
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

    private static void requireLength(String[] args, int minimum, int maximum, String usage) {
        if (args.length < minimum || args.length > maximum) {
            throw new IllegalArgumentException("Uso: " + usage);
        }
    }
}
