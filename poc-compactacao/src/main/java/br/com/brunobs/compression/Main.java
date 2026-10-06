package br.com.brunobs.compression;

public final class Main {
    private Main() { }

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            printUsage();
            return;
        }

        switch (args[0]) {
            case "generate" -> CompressionCommands.generate(ApplicationOptions.generate(args));
            case "compress" -> CompressionCommands.compress(ApplicationOptions.compress(args));
            case "decompress" -> CompressionCommands.decompress(ApplicationOptions.decompress(args));
            case "train-dictionary" ->
                    CompressionCommands.trainDictionary(ApplicationOptions.trainDictionary(args));
            case "benchmark" -> CompressionBenchmarks.runBasic(BenchmarkOptions.basic(args));
            case "benchmark-levels" -> CompressionBenchmarks.runLevels(BenchmarkOptions.levels(args));
            case "benchmark-dictionary" ->
                    CompressionBenchmarks.runDictionary(BenchmarkOptions.dictionary(args));
            case "benchmark-algorithms" ->
                    CompressionBenchmarks.runAlgorithms(BenchmarkOptions.algorithms(args));
            default -> throw new IllegalArgumentException("Comando desconhecido: " + args[0]);
        }
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
