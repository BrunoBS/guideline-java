package br.com.brunobs.compression;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
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

        String generatedAt = ZonedDateTime.now().format(
                DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm:ss XXX", Locale.forLanguageTag("pt-BR")));
        StringBuilder markdown = new StringBuilder();
        markdown.append("# Comparação dos algoritmos de compressão\n\n")
                .append("**Gerado em:** ").append(generatedAt)
                .append(" (horário local da máquina do benchmark).\n\n")
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
        appendProcessMemoryChart(markdown, rows, labels, "RSS do processo",
                Row::compressRssPeakBytes, Row::decompressRssPeakBytes);
        appendProcessMemoryChart(markdown, rows, labels, "Memória residente privada",
                Row::compressPrivateResidentPeakBytes, Row::decompressPrivateResidentPeakBytes);
        appendMemoryTable(markdown, rows);

        markdown.append("## Métricas por algoritmo\n\n")
                .append("Nas colunas de memória, cada medida aparece em MiB na ordem antes/pico/depois.\n\n")
                .append("| Algoritmo | Configuração | Compactado (bytes) | Redução | Compressão (s) | Descompressão (s) ")
                .append("| CPU compressão (ms / % de 1 core) | CPU descompressão (ms / % de 1 core) ")
                .append("| Memória compressão (MiB) | Memória descompressão (MiB) | SHA-256 |\n")
                .append("|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|\n");
        for (Row row : rows) {
            markdown.append("| ").append(row.algorithm()).append(" | ")
                    .append(row.settingName()).append(' ').append(row.setting()).append(" | ")
                    .append(formatBytes(row.compressedBytes())).append(" | ")
                    .append(formatPt(row.reductionPercent(), 3)).append("% | ")
                    .append(formatPt(row.compressSeconds(), 3)).append(" | ")
                    .append(formatPt(row.decompressSeconds(), 3)).append(" | ")
                    .append(cpuCell(row.compressCpuMs(), row.compressCpuPercent())).append(" | ")
                    .append(cpuCell(row.decompressCpuMs(), row.decompressCpuPercent())).append(" | ")
                    .append(memoryStageCell(row.compressHeapBeforeBytes(), row.compressHeapPeakBytes(),
                            row.compressHeapAfterBytes(), row.compressRssBeforeBytes(), row.compressRssPeakBytes(),
                            row.compressRssAfterBytes(), row.compressPrivateResidentBeforeBytes(),
                            row.compressPrivateResidentPeakBytes(), row.compressPrivateResidentAfterBytes()))
                    .append(" | ")
                    .append(memoryStageCell(row.decompressHeapBeforeBytes(), row.decompressHeapPeakBytes(),
                            row.decompressHeapAfterBytes(), row.decompressRssBeforeBytes(),
                            row.decompressRssPeakBytes(), row.decompressRssAfterBytes(),
                            row.decompressPrivateResidentBeforeBytes(), row.decompressPrivateResidentPeakBytes(),
                            row.decompressPrivateResidentAfterBytes()))
                    .append(" | ").append(row.sha256Match() ? "Confere" : "Diverge").append(" |\n");
        }

        markdown.append("\n## Como interpretar as métricas\n\n")
                .append("- CPU é o tempo de CPU do processo JVM medido separadamente durante cada etapa. ")
                .append("O percentual é relativo a um núcleo: 100% equivale a um núcleo ocupado por todo o tempo da etapa; ")
                .append("pode passar de 100% se o processo usar vários núcleos. GC, JIT e outras threads da JVM também ")
                .append("podem contribuir para esse valor.\n")
                .append("- O amostrador registra os picos de heap, RSS e memória residente privada a cada 20 ms; ")
                .append("picos mais curtos podem não ser capturados. As leituras antes/depois são feitas nas fronteiras ")
                .append("de cada etapa. Heap cobre objetos da JVM ainda não coletados pelo GC. RSS inclui ")
                .append("páginas compartilhadas; a memória residente privada exclui essas páginas compartilhadas e ")
                .append("se aproxima do valor de memória atribuído ao processo pelo sistema operacional.\n")
                .append("- RSS e memória residente privada podem ficar indisponíveis em sistemas que não exponham ")
                .append("essas métricas; nesse caso os campos ficam vazios no CSV e o gráfico correspondente é omitido.\n")
                .append("- Os tempos incluem leitura e escrita dos arquivos e variam conforme máquina, JVM, armazenamento ")
                .append("e carga do sistema. Todos os algoritmos processam o mesmo arquivo e buffer nesta execução.\n");
        appendRecommendation(markdown, rows);
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

    private static void appendProcessMemoryChart(StringBuilder markdown, List<Row> rows, String labels,
                                                 String memoryName, Metric compressMetric,
                                                 Metric decompressMetric) {
        boolean allAvailable = rows.stream().allMatch(row ->
                compressMetric.value(row) > 0 && decompressMetric.value(row) > 0);
        markdown.append("## Pico de ").append(memoryName).append(" por etapa\n\n");
        if (!allAvailable) {
            markdown.append("A métrica não está disponível para todos os algoritmos nesta plataforma; ")
                    .append("o gráfico foi omitido e os valores ausentes ficam vazios no CSV.\n\n");
            return;
        }
        double maximumMib = rows.stream().mapToDouble(row ->
                Math.max(compressMetric.value(row), decompressMetric.value(row)) / BYTES_PER_MIB)
                .max().orElse(0);
        int axis = axisMaximum(maximumMib, 50);
        markdown.append("Barras: compressão. Linha: descompressão. A escala é MiB.\n\n")
                .append("~~~mermaid\nxychart-beta\n")
                .append("    title \"Pico amostrado de ").append(memoryName).append(" (MiB)\"\n")
                .append("    x-axis [").append(labels).append("]\n")
                .append("    y-axis \"MiB\" 0 --> ").append(axis).append("\n")
                .append("    bar [").append(series(rows, row -> compressMetric.value(row) / BYTES_PER_MIB)).append("]\n")
                .append("    line [").append(series(rows, row -> decompressMetric.value(row) / BYTES_PER_MIB)).append("]\n")
                .append("~~~\n\n");
    }

    private static String memoryStageCell(long heapBefore, long heapPeak, long heapAfter,
                                          long rssBefore, long rssPeak, long rssAfter,
                                          long privateBefore, long privatePeak, long privateAfter) {
        return "Heap: " + memoryTriple(heapBefore, heapPeak, heapAfter)
                + "; RSS: " + memoryTriple(rssBefore, rssPeak, rssAfter)
                + "; privada: " + memoryTriple(privateBefore, privatePeak, privateAfter);
    }

    private static String memoryTriple(long before, long peak, long after) {
        return memoryMib(before) + "/" + memoryMib(peak) + "/" + memoryMib(after);
    }

    private static void appendMemoryTable(StringBuilder markdown, List<Row> rows) {
        markdown.append("## Memória de pico por etapa\n\n")
                .append("| Algoritmo | Heap compressão (MiB) | Heap descompressão (MiB) ")
                .append("| RSS compressão (MiB) | RSS descompressão (MiB) ")
                .append("| Memória privada compressão (MiB) | Memória privada descompressão (MiB) |\n")
                .append("|---|---:|---:|---:|---:|---:|---:|\n");
        for (Row row : rows) {
            markdown.append("| ").append(row.algorithm()).append(" | ")
                    .append(memoryMib(row.compressHeapPeakBytes())).append(" | ")
                    .append(memoryMib(row.decompressHeapPeakBytes())).append(" | ")
                    .append(memoryMib(row.compressRssPeakBytes())).append(" | ")
                    .append(memoryMib(row.decompressRssPeakBytes())).append(" | ")
                    .append(memoryMib(row.compressPrivateResidentPeakBytes())).append(" | ")
                    .append(memoryMib(row.decompressPrivateResidentPeakBytes())).append(" |\n");
        }
        markdown.append('\n');
    }

    private static String memoryMib(long bytes) {
        return bytes <= 0 ? "Não disponível" : formatPt(bytes / BYTES_PER_MIB, 2);
    }

    private static void appendRecommendation(StringBuilder markdown, List<Row> rows) {
        List<Criterion> criteria = new ArrayList<>();
        criteria.add(new Criterion("Tamanho compactado", row -> row.compressedBytes()));
        criteria.add(new Criterion("Tempo total", row -> row.compressSeconds() + row.decompressSeconds()));

        boolean allCpuAvailable = rows.stream().allMatch(row ->
                row.compressCpuMs() != null && row.decompressCpuMs() != null);
        if (allCpuAvailable) {
            criteria.add(new Criterion("CPU total", row -> row.compressCpuMs() + row.decompressCpuMs()));
        }

        MemoryCriterion memory = memoryCriterion(rows);
        if (memory != null) criteria.add(new Criterion(memory.name(), memory.metric()));

        Row smallest = bestRow(rows, row -> row.compressedBytes());
        Row fastestCompression = bestRow(rows, Row::compressSeconds);
        Row fastestDecompression = bestRow(rows, Row::decompressSeconds);
        Row recommendation = rows.stream()
                .min(Comparator.comparingDouble((Row row) -> averageRank(rows, row, criteria))
                        .thenComparingDouble(row -> row.compressSeconds() + row.decompressSeconds())
                        .thenComparingLong(Row::compressedBytes))
                .orElseThrow();

        markdown.append("## Análise e recomendação\n\n")
                .append("**Menor arquivo:** ").append(smallest.algorithm()).append(" (")
                .append(formatBytes(smallest.compressedBytes())).append(" bytes, ")
                .append(formatPt(smallest.reductionPercent(), 3)).append("% de redução).\n\n")
                .append("**Compressão mais rápida:** ").append(fastestCompression.algorithm()).append(" (")
                .append(formatPt(fastestCompression.compressSeconds(), 3)).append(" s).\n\n")
                .append("**Descompressão mais rápida:** ").append(fastestDecompression.algorithm()).append(" (")
                .append(formatPt(fastestDecompression.decompressSeconds(), 3)).append(" s).\n\n");
        if (allCpuAvailable) {
            Row leastCpu = bestRow(rows, row -> row.compressCpuMs() + row.decompressCpuMs());
            markdown.append("**Menor CPU total:** ").append(leastCpu.algorithm()).append(" (")
                    .append(formatPt(leastCpu.compressCpuMs() + leastCpu.decompressCpuMs(), 3)).append(" ms).\n\n");
        } else {
            markdown.append("**CPU total:** não disponível para todos os algoritmos; esse critério não entra na sugestão.\n\n");
        }
        if (memory != null) {
            Row leastMemory = bestRow(rows, memory.metric());
            markdown.append("**Menor pico de ").append(memory.name()).append(":** ")
                    .append(leastMemory.algorithm()).append(" (")
                    .append(formatPt(memory.metric().value(leastMemory) / BYTES_PER_MIB, 2)).append(" MiB).\n\n");
        } else {
            markdown.append("**Pico de memória:** não disponível para todos os algoritmos; esse critério não entra na sugestão.\n\n");
        }

        markdown.append("### Pontuação balanceada\n\n")
                .append("Cada critério disponível recebe o mesmo peso. A posição 1 é a melhor; a sugestão é o algoritmo ")
                .append("com a menor média de posições. Para memória, usei ")
                .append(memory == null ? "nenhuma métrica comum disponível" : memory.name())
                .append("; CPU só entra quando há dados para todos os algoritmos.\n\n")
                .append("| Algoritmo");
        for (Criterion criterion : criteria) markdown.append(" | ").append(criterion.name());
        markdown.append(" | Média de posições |\n|---");
        for (int i = 0; i < criteria.size() + 1; i++) markdown.append("|---:");
        markdown.append("|\n");
        for (Row row : rows) {
            markdown.append("| ").append(row.algorithm());
            for (Criterion criterion : criteria) {
                markdown.append(" | ").append(formatPt(rank(rows, row, criterion.metric()), 1));
            }
            markdown.append(" | ").append(formatPt(averageRank(rows, row, criteria), 2)).append(" |\n");
        }
        markdown.append("\n**Sugestão para esta execução: ").append(recommendation.algorithm()).append(".** ")
                .append("Ela reflete o equilíbrio entre os critérios disponíveis, não uma escolha universal. ")
                .append("Se a prioridade for exclusivamente reduzir o arquivo, acelerar a compressão ou economizar ")
                .append("memória, escolha pelo indicador correspondente acima. Resultados podem mudar com a máquina, ")
                .append("o conteúdo e o buffer.\n");
    }

    private static MemoryCriterion memoryCriterion(List<Row> rows) {
        if (rows.stream().allMatch(row -> row.compressPrivateResidentPeakBytes() > 0
                && row.decompressPrivateResidentPeakBytes() > 0)) {
            return new MemoryCriterion("memória residente privada", row -> Math.max(
                    row.compressPrivateResidentPeakBytes(), row.decompressPrivateResidentPeakBytes()));
        }
        if (rows.stream().allMatch(row -> row.compressRssPeakBytes() > 0
                && row.decompressRssPeakBytes() > 0)) {
            return new MemoryCriterion("RSS", row -> Math.max(
                    row.compressRssPeakBytes(), row.decompressRssPeakBytes()));
        }
        if (rows.stream().allMatch(row -> row.compressHeapPeakBytes() > 0
                && row.decompressHeapPeakBytes() > 0)) {
            return new MemoryCriterion("heap", row -> Math.max(
                    row.compressHeapPeakBytes(), row.decompressHeapPeakBytes()));
        }
        return null;
    }

    private static Row bestRow(List<Row> rows, Metric metric) {
        return rows.stream().min(Comparator.comparingDouble(metric::value)).orElseThrow();
    }

    private static double averageRank(List<Row> rows, Row target, List<Criterion> criteria) {
        return criteria.stream().mapToDouble(criterion -> rank(rows, target, criterion.metric()))
                .average().orElse(Double.NaN);
    }

    private static double rank(List<Row> rows, Row target, Metric metric) {
        double targetValue = metric.value(target);
        long less = rows.stream().filter(row -> metric.value(row) < targetValue).count();
        long equal = rows.stream().filter(row -> metric.value(row) == targetValue).count();
        return 1 + less + (equal - 1) / 2d;
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
                    optionalLong(values, columns, "compress_heap_before_bytes"),
                    optionalLong(values, columns, "compress_heap_peak_bytes"),
                    optionalLong(values, columns, "compress_heap_after_bytes"),
                    optionalLong(values, columns, "compress_rss_before_bytes"),
                    optionalLong(values, columns, "compress_rss_peak_bytes"),
                    optionalLong(values, columns, "compress_rss_after_bytes"),
                    optionalLong(values, columns, "compress_private_resident_before_bytes"),
                    optionalLong(values, columns, "compress_private_resident_peak_bytes"),
                    optionalLong(values, columns, "compress_private_resident_after_bytes"),
                    optionalDecimal(values, columns, "decompress_process_cpu_ms"),
                    optionalDecimal(values, columns, "decompress_cpu_percent_one_core"),
                    optionalLong(values, columns, "decompress_heap_before_bytes"),
                    optionalLong(values, columns, "decompress_heap_peak_bytes"),
                    optionalLong(values, columns, "decompress_heap_after_bytes"),
                    optionalLong(values, columns, "decompress_rss_before_bytes"),
                    optionalLong(values, columns, "decompress_rss_peak_bytes"),
                    optionalLong(values, columns, "decompress_rss_after_bytes"),
                    optionalLong(values, columns, "decompress_private_resident_before_bytes"),
                    optionalLong(values, columns, "decompress_private_resident_peak_bytes"),
                    optionalLong(values, columns, "decompress_private_resident_after_bytes"),
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

    private record Criterion(String name, Metric metric) { }

    private record MemoryCriterion(String name, Metric metric) { }

    private record Row(String measuredAt, String algorithm, String settingName, int setting,
                       int bufferKiB, long originalBytes, long compressedBytes, double reductionPercent,
                       double compressSeconds, double decompressSeconds,
                       Double compressCpuMs, Double compressCpuPercent,
                       long compressHeapBeforeBytes, long compressHeapPeakBytes, long compressHeapAfterBytes,
                       long compressRssBeforeBytes, long compressRssPeakBytes, long compressRssAfterBytes,
                       long compressPrivateResidentBeforeBytes, long compressPrivateResidentPeakBytes,
                       long compressPrivateResidentAfterBytes,
                       Double decompressCpuMs, Double decompressCpuPercent,
                       long decompressHeapBeforeBytes, long decompressHeapPeakBytes, long decompressHeapAfterBytes,
                       long decompressRssBeforeBytes, long decompressRssPeakBytes, long decompressRssAfterBytes,
                       long decompressPrivateResidentBeforeBytes, long decompressPrivateResidentPeakBytes,
                       long decompressPrivateResidentAfterBytes, boolean sha256Match) { }
}
