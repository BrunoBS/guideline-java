package br.com.brunobs.compression;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Rebuilds the Markdown comparison report from the CSV produced by compare. */
final class ComparisonReport {
    private static final double BYTES_PER_MIB = 1024d * 1024d;
    private static final double BYTES_PER_MB = 1_000_000d;

    private ComparisonReport() { }

    static void generate(Path csvPath, Path reportPath) throws IOException {
        List<String> lines = Files.readAllLines(csvPath, StandardCharsets.UTF_8);
        if (lines.size() < 2) {
            throw new IOException("O CSV da comparação não contém resultados: " + csvPath);
        }

        String[] header = lines.getFirst().split(",", -1);
        Map<String, Integer> columns = columns(header);
        List<Row> rows = new ArrayList<>();
        for (int index = 1; index < lines.size(); index++) {
            if (!lines.get(index).isBlank()) {
                rows.add(parseRow(lines.get(index), columns, index + 1));
            }
        }
        if (rows.isEmpty()) {
            throw new IOException("O CSV da comparação não contém linhas de dados: " + csvPath);
        }

        String report = render(rows, csvPath);
        Files.writeString(reportPath, report, StandardCharsets.UTF_8);
    }

    private static String render(List<Row> rows, Path csvPath) {
        Row first = rows.getFirst();
        String labels = rows.stream().map(row -> "\"" + row.algorithm() + "\"")
                .collect(Collectors.joining(", "));
        double originalMb = first.originalBytes() / BYTES_PER_MB;
        double maximumCompressedMb = rows.stream()
                .mapToDouble(row -> row.compressedBytes() / BYTES_PER_MB).max().orElse(0);
        int sizeAxis = axisMaximum(Math.max(originalMb, maximumCompressedMb), 50);
        int compressAxis = axisMaximum(rows.stream().mapToDouble(Row::compressSeconds).max().orElse(0), 10);
        int decompressAxis = axisMaximum(rows.stream().mapToDouble(Row::decompressSeconds).max().orElse(0), 1);

        StringBuilder markdown = new StringBuilder();
        markdown.append("# Comparação dos algoritmos de compressão\n\n")
                .append("Atualizado automaticamente pelo comando `compare`.\n\n")
                .append("Arquivo original: **").append(formatBytes(first.originalBytes()))
                .append(" bytes (").append(formatPt(originalMb, 2)).append(" MB)**; buffer: **")
                .append(first.bufferKiB()).append(" KiB**. Os dados detalhados estão em [")
                .append(csvPath.toString().replace('\\', '/')).append("](")
                .append(csvPath.toString().replace('\\', '/')).append(").\n\n")
                .append("## Tamanho original e compactado\n\n")
                .append("As barras representam o tamanho compactado; a linha mostra o tamanho original.\n\n")
                .append("~~~mermaid\nxychart-beta\n")
                .append("    title \"Tamanho do arquivo por algoritmo (MB)\"\n")
                .append("    x-axis [").append(labels).append("]\n")
                .append("    y-axis \"MB\" 0 --> ").append(sizeAxis).append("\n")
                .append("    bar [").append(series(rows, row -> row.compressedBytes() / BYTES_PER_MB)).append("]\n")
                .append("    line [").append(series(rows, row -> row.originalBytes() / BYTES_PER_MB)).append("]\n")
                .append("~~~\n\n")
                .append("## Tempo de compressão\n\n")
                .append("~~~mermaid\nxychart-beta\n")
                .append("    title \"Tempo de compressão (segundos)\"\n")
                .append("    x-axis [").append(labels).append("]\n")
                .append("    y-axis \"Segundos\" 0 --> ").append(compressAxis).append("\n")
                .append("    bar [").append(series(rows, Row::compressSeconds)).append("]\n")
                .append("~~~\n\n")
                .append("## Tempo de descompressão\n\n")
                .append("~~~mermaid\nxychart-beta\n")
                .append("    title \"Tempo de descompressão (segundos)\"\n")
                .append("    x-axis [").append(labels).append("]\n")
                .append("    y-axis \"Segundos\" 0 --> ").append(decompressAxis).append("\n")
                .append("    bar [").append(series(rows, Row::decompressSeconds)).append("]\n")
                .append("~~~\n\n");

        appendCpuChart(markdown, rows, labels);
        appendHeapChart(markdown, rows, labels);

        markdown.append("## Métricas por algoritmo\n\n")
                .append("| Algoritmo | Configuração | Compactado (bytes) | Redução | Compressão (s) | Descompressão (s) ")
                .append("| CPU compressão (ms / % de 1 core) | CPU descompressão (ms / % de 1 core) ")
                .append("| Pico heap compressão (MiB) | Pico heap descompressão (MiB) | SHA-256 |\n")
                .append("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|\n");
        for (Row row : rows) {
            markdown.append("| ").append(row.algorithm()).append(" | ")
                    .append(row.settingName()).append(' ').append(row.setting()).append(" | ")
                    .append(formatBytes(row.compressedBytes())).append(" | ")
                    .append(formatPt(row.reductionPercent(), 3)).append("% | ")
                    .append(formatPt(row.compressSeconds(), 3)).append(" | ")
                    .append(formatPt(row.decompressSeconds(), 3)).append(" | ")
                    .append(cpuCell(row.compressCpuMs(), row.compressCpuPercent())).append(" | ")
                    .append(cpuCell(row.decompressCpuMs(), row.decompressCpuPercent())).append(" | ")
                    .append(formatOptional(row.compressHeapPeakBytes() / BYTES_PER_MIB, 2)).append(" | ")
                    .append(formatOptional(row.decompressHeapPeakBytes() / BYTES_PER_MIB, 2)).append(" | ")
                    .append(row.sha256Match() ? "Confere" : "Diverge").append(" |\n");
        }

        markdown.append("\n## Como interpretar as métricas\n\n")
                .append("- CPU é o tempo de CPU do processo JVM medido separadamente durante cada etapa. ")
                .append("O percentual é relativo a um núcleo: 100% equivale a um núcleo ocupado por todo o tempo da etapa; ")
                .append("pode passar de 100% se o processo usar vários núcleos. GC, JIT e outras threads da JVM também ")
                .append("podem contribuir para esse valor.\n")
                .append("- Heap é amostrado a cada 5 ms; o pico pode deixar passar picos mais curtos. ")
                .append("A amostra inclui objetos ainda não coletados pelo GC e não inclui memória nativa nem o RSS completo ")
                .append("do processo.\n")
                .append("- Os tempos incluem leitura e escrita dos arquivos e variam conforme máquina, JVM, armazenamento ")
                .append("e carga do sistema. Todos os algoritmos processam o mesmo arquivo e buffer nesta execução.\n");
        return markdown.toString();
    }

    private static void appendCpuChart(StringBuilder markdown, List<Row> rows, String labels) {
        boolean allAvailable = rows.stream().allMatch(row ->
                row.compressCpuPercent() != null && row.decompressCpuPercent() != null);
        markdown.append("## CPU do processo por etapa\n\n");
        if (!allAvailable) {
            markdown.append("A plataforma não disponibilizou tempo de CPU para todas as linhas; ")
                    .append("os campos correspondentes aparecem vazios no CSV.\n\n");
            return;
        }
        double max = rows.stream().mapToDouble(row ->
                Math.max(row.compressCpuPercent(), row.decompressCpuPercent())).max().orElse(0);
        int axis = axisMaximum(max, 10);
        markdown.append("Barras: compressão. Linha: descompressão. Percentual relativo a um núcleo.\n\n")
                .append("~~~mermaid\nxychart-beta\n")
                .append("    title \"CPU do processo por etapa (% de um núcleo)\"\n")
                .append("    x-axis [").append(labels).append("]\n")
                .append("    y-axis \"Percentual\" 0 --> ").append(axis).append("\n")
                .append("    bar [").append(series(rows, Row::compressCpuPercent)).append("]\n")
                .append("    line [").append(series(rows, Row::decompressCpuPercent)).append("]\n")
                .append("~~~\n\n");
    }

    private static void appendHeapChart(StringBuilder markdown, List<Row> rows, String labels) {
        double maximumMib = rows.stream().mapToDouble(row ->
                Math.max(row.compressHeapPeakBytes(), row.decompressHeapPeakBytes()) / BYTES_PER_MIB)
                .max().orElse(0);
        int axis = axisMaximum(maximumMib, 50);
        markdown.append("## Pico de heap observado por etapa\n\n")
                .append("Barras: compressão. Linha: descompressão. A escala é MiB.\n\n")
                .append("~~~mermaid\nxychart-beta\n")
                .append("    title \"Pico amostrado de heap JVM (MiB)\"\n")
                .append("    x-axis [").append(labels).append("]\n")
                .append("    y-axis \"MiB\" 0 --> ").append(axis).append("\n")
                .append("    bar [").append(series(rows, row -> row.compressHeapPeakBytes() / BYTES_PER_MIB)).append("]\n")
                .append("    line [").append(series(rows, row -> row.decompressHeapPeakBytes() / BYTES_PER_MIB)).append("]\n")
                .append("~~~\n\n");
    }

    private static Map<String, Integer> columns(String[] header) {
        Map<String, Integer> columns = new HashMap<>();
        for (int i = 0; i < header.length; i++) columns.put(header[i], i);
        return columns;
    }

    private static Row parseRow(String line, Map<String, Integer> columns, int lineNumber) throws IOException {
        String[] values = line.split(",", -1);
        try {
            return new Row(
                    cell(values, columns, "measured_at"),
                    cell(values, columns, "algorithm"),
                    cell(values, columns, "setting_name"),
                    integer(values, columns, "setting_value"),
                    integer(values, columns, "buffer_kib"),
                    longValue(values, columns, "original_bytes"),
                    longValue(values, columns, "compressed_bytes"),
                    decimal(values, columns, "reduction_percent"),
                    decimal(values, columns, "compress_ms") / 1000d,
                    decimal(values, columns, "decompress_ms") / 1000d,
                    optionalDecimal(values, columns, "compress_process_cpu_ms"),
                    optionalDecimal(values, columns, "compress_cpu_percent_one_core"),
                    optionalLong(values, columns, "compress_heap_peak_bytes"),
                    optionalDecimal(values, columns, "decompress_process_cpu_ms"),
                    optionalDecimal(values, columns, "decompress_cpu_percent_one_core"),
                    optionalLong(values, columns, "decompress_heap_peak_bytes"),
                    Boolean.parseBoolean(cell(values, columns, "sha256_match")));
        } catch (RuntimeException invalidRow) {
            throw new IOException("Linha " + lineNumber + " inválida no CSV da comparação.", invalidRow);
        }
    }

    private static String cell(String[] values, Map<String, Integer> columns, String name) {
        int index = requiredIndex(columns, name);
        if (index >= values.length) throw new IllegalArgumentException("Coluna ausente: " + name);
        return values[index];
    }

    private static int requiredIndex(Map<String, Integer> columns, String name) {
        Integer index = columns.get(name);
        if (index == null) throw new IllegalArgumentException("Cabeçalho sem coluna: " + name);
        return index;
    }

    private static long longValue(String[] values, Map<String, Integer> columns, String name) {
        return Long.parseLong(cell(values, columns, name));
    }

    private static int integer(String[] values, Map<String, Integer> columns, String name) {
        return Integer.parseInt(cell(values, columns, name));
    }

    private static double decimal(String[] values, Map<String, Integer> columns, String name) {
        return Double.parseDouble(cell(values, columns, name));
    }

    private static Double optionalDecimal(String[] values, Map<String, Integer> columns, String name) {
        String value = cell(values, columns, name);
        return value.isBlank() ? null : Double.parseDouble(value);
    }

    private static long optionalLong(String[] values, Map<String, Integer> columns, String name) {
        String value = cell(values, columns, name);
        return value.isBlank() ? 0 : Long.parseLong(value);
    }

    private static String cpuCell(Double milliseconds, Double percent) {
        if (milliseconds == null || percent == null) return "Não disponível";
        return formatPt(milliseconds, 3) + " / " + formatPt(percent, 2) + "%";
    }

    private static String formatOptional(double value, int decimals) {
        return Double.isFinite(value) ? formatPt(value, decimals) : "Não disponível";
    }

    private static String formatBytes(long bytes) {
        return String.format(Locale.forLanguageTag("pt-BR"), "%,d", bytes);
    }

    private static String formatPt(double value, int decimals) {
        return String.format(Locale.forLanguageTag("pt-BR"), "%." + decimals + "f", value);
    }

    private static String series(List<Row> rows, Metric metric) {
        return rows.stream().map(row -> number(metric.value(row)))
                .collect(Collectors.joining(", "));
    }

    private static String number(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }

    private static int axisMaximum(double maximum, int step) {
        return Math.max(step, (int) Math.ceil(maximum / step) * step);
    }

    @FunctionalInterface
    private interface Metric {
        double value(Row row);
    }

    private record Row(String measuredAt, String algorithm, String settingName, int setting,
                       int bufferKiB, long originalBytes, long compressedBytes, double reductionPercent,
                       double compressSeconds, double decompressSeconds,
                       Double compressCpuMs, Double compressCpuPercent, long compressHeapPeakBytes,
                       Double decompressCpuMs, Double decompressCpuPercent, long decompressHeapPeakBytes,
                       boolean sha256Match) { }
}
