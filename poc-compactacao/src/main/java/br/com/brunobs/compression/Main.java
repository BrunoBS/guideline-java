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
            case "roundtrip" -> CompressionCommands.roundTrip(ApplicationOptions.roundTrip(args));
            case "compare" -> CompressionCommands.compare(ApplicationOptions.compare(args));
            default -> throw new IllegalArgumentException("Comando desconhecido: " + args[0]);
        }
    }

    private static void printUsage() {
        System.out.println("Comandos: generate, compress, decompress, roundtrip, compare");
        System.out.println("Ex.: generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset.json realistic 200");
        System.out.println("Ex.: roundtrip zstd 1 128 dataset.json dataset.json.zst restored.json --analysis analise.csv");
        System.out.println("Ex.: compare dataset.json 128  (atualiza CSV e RELATORIO-COMPARACAO-ALGORITMOS.md)");
    }
}
