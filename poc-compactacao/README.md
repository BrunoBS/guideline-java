# POC de compressão de dados

Projeto Maven isolado, em Java 25, sem Spring. Os quatro compactadores usam a interface genérica `CompressionEngine` e processam a entrada e a saída por streams, em blocos. O dataset inteiro não é carregado em memória.

## Algoritmos

| Comando | Formato | Parâmetro | Padrão do benchmark |
|---|---|---|---:|
| `zstd` | Zstandard | nível 1–22 (esta POC mede níveis até 19) | nível 1 |
| `gzip` | GZIP/Deflate | nível 0–9 | nível 6 |
| `brotli` | Brotli | qualidade 0–11 | qualidade 5 |
| `xz` ou `lzma` | contêiner XZ com LZMA2 | preset 0–9 | preset 6 |

Os números não representam a mesma intensidade entre algoritmos. Por exemplo, Brotli 5 e Zstd 5 não são configurações equivalentes. O CSV identifica o nome e o valor do parâmetro usado.

GZIP usa os streams da biblioteca padrão Java. Zstd, Brotli e XZ usam bibliotecas próprias. O Brotli4j carrega uma biblioteca nativa compatível com a plataforma. A descompressão XZ limita o uso de memória do decoder a 128 MiB; presets XZ maiores podem exigir mais memória e tempo durante a compressão.

## Requisitos

- JDK 25
- Maven 3.9+

## Uso

Execute os comandos a partir de `poc-compactacao`.

```bash
mvn -q clean package

# Gera um dataset de 200 MiB
mvn -q exec:java -Dexec.args="generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset-realista.json realistic 200"

# Compara os quatro algoritmos; uma rodada medida, além do aquecimento
mvn -q exec:java -Dexec.args='benchmark-algorithms dataset-realista.json benchmark-algoritmos.csv 128 1'

# Use 3 para repetir as medições, considerando que XZ pode demorar
mvn -q exec:java -Dexec.args='benchmark-algorithms dataset-realista.json benchmark-algoritmos.csv 128 3'

# Compacta e descompacta com um algoritmo específico
mvn -q exec:java -Dexec.args='compress zstd 1 128 dataset-realista.json dataset.json.zst'
mvn -q exec:java -Dexec.args='decompress zstd 128 dataset.json.zst restaurado.json'

mvn -q exec:java -Dexec.args='compress gzip 6 128 dataset-realista.json dataset.json.gz'
mvn -q exec:java -Dexec.args='decompress gzip 128 dataset.json.gz restaurado.json'

mvn -q exec:java -Dexec.args='compress brotli 5 128 dataset-realista.json dataset.json.br'
mvn -q exec:java -Dexec.args='decompress brotli 128 dataset.json.br restaurado.json'

mvn -q exec:java -Dexec.args='compress xz 6 128 dataset-realista.json dataset.json.xz'
mvn -q exec:java -Dexec.args='decompress xz 128 dataset.json.xz restaurado.json'
```

As formas antigas dos comandos Zstd continuam disponíveis: `compress <nível> <buffer-KiB> <entrada> <saída>` e `decompress <buffer-KiB> <entrada> <saída>`.

## Dataset

O comando `generate` recebe `<modelo-ConfigurationData> <dataset.json> <repetitive|realistic> <tamanho-MiB> [seed]`. O modelo deve conter `application`, `key` e `value`, todos como strings. O gerador varia aplicações, chaves e valores, incluindo booleanos, números, textos e strings que contêm JSON serializado. O perfil `repetitive` usa cardinalidade baixa e conteúdo mais repetido; `realistic` usa mais variação e maior entropia. Informe um seed para reproduzir ou variar o corpus.

Como o `exec-maven-plugin` também interpreta aspas em `exec.args`, use aspas duplas no valor da propriedade e aspas simples ao redor do JSON, como no exemplo:

```bash
mvn -q exec:java -Dexec.args="generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset-realista.json realistic 200"
```

## Benchmark

`benchmark-algorithms` recebe `<entrada.json> <relatorio.csv> [buffer-KiB] [rodadas]`. O padrão é buffer de 128 KiB e uma rodada medida. O programa aquece cada algoritmo uma vez, intercala a ordem nas rodadas e valida o arquivo restaurado comparando SHA-256 com o original. O dataset de entrada não é alterado.

O CSV inclui algoritmo, parâmetro, tamanho compactado, redução percentual, tempo e throughput de compressão e descompressão, igualdade SHA-256 e heap observado. A leitura e escrita de arquivos fazem parte do tempo medido. A medição de heap é uma amostra antes/depois, não o pico de uso.

Resultados dependem da CPU, sistema operacional, JVM, armazenamento e conteúdo. A comparação de custo-benefício deve considerar redução, tempo de compressão, tempo de descompressão e recursos disponíveis. O benchmark valida a integridade, mas não estabelece que um algoritmo seja melhor para todo tipo de dado.

## Experimento opcional com dicionário Zstandard

O treino deve usar um corpus separado do arquivo de benchmark. Este exemplo gera um corpus de treino de 20 MiB com seed diferente, treina um dicionário de 32 KiB usando até 4 MiB de amostras e compara os modos:

```bash
mvn -q exec:java -Dexec.args="generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset-realista-treino.json realistic 20 987654321"
mvn -q exec:java -Dexec.args='train-dictionary dataset-realista-treino.json dictionary-realista.zdict 4 32'
mvn -q exec:java -Dexec.args='benchmark-dictionary dataset-realista.json dictionary-realista.zdict benchmark-dictionary-nivel1.csv 1 128 3'
```

O CSV do benchmark com dicionário soma o frame comprimido e o dicionário uma vez em `total_stored_bytes`. Se o mesmo dicionário for reutilizado em muitos payloads, o custo de armazenamento pode ser amortizado.

## Limites

A POC não mede concorrência progressiva. O treino e o benchmark com dicionário são experimentos isolados; ainda não há política de seleção ou gestão de dicionários no engine. HTTP, Spring, transporte e política adaptativa permanecem fora do escopo.
