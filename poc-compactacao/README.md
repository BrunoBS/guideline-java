# POC de compressão Zstandard
Projeto Maven isolado, em Java 25, sem Spring. O caminho de compressão lê e escreve por streams; não carrega o dataset inteiro em memória. O gerador recebe um registro-modelo `ConfigurationData` e produz novos registros variados até atingir o tamanho-alvo em MiB. O arquivo gerado é um array JSON válido; cada campo `value` continua sendo uma string.

## Requisitos
- JDK 25
- Maven 3.9+

## Uso
```bash
mvn -q package

# Gera registros diferentes a partir do modelo até 1 MiB (perfil repetitivo).
mvn -q exec:java -Dexec.args="generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset.json repetitive 1"
mvn -q exec:java -Dexec.args="generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset-realista.json realistic 10"

# Compacta e descompacta por streaming.
mvn -q exec:java -Dexec.args='compress 3 64 dataset.json dataset.json.zst'
mvn -q exec:java -Dexec.args='decompress 64 dataset.json.zst restored.json'

# Benchmark original: níveis 1/3/6 e buffers 32/64/128/256 KiB, uma execução por combinação.
mvn -q exec:java -Dexec.args='benchmark dataset.json benchmark.csv'

# Compara níveis Zstd no mesmo arquivo, com aquecimento e três rodadas medidas.
mvn -q exec:java -Dexec.args='benchmark-levels dataset-realista.json benchmark-niveis.csv 1,3,6,9,12,15,19 128 3'

# Treina um dicionário com até 4 MiB de registros (padrão) e gera um arquivo de 32 KiB.
mvn -q exec:java -Dexec.args='train-dictionary dataset-realista-treino.json dictionary-realista.zdict 4 32'

# Compara nível 19 com e sem dicionário. Use uma rodada inicial; três rodadas são mais demoradas.
mvn -q exec:java -Dexec.args='benchmark-dictionary dataset-realista-200mb.json dictionary-realista.zdict benchmark-dictionary-200mb.csv 19 128 1'
```

O comando `generate` recebe `<modelo-ConfigurationData> <dataset.json> <repetitive|realistic> <tamanho-MiB> [seed]`. Sem seed, preserva o seed fixo original; informe um seed diferente para gerar um corpus de treinamento independente. O perfil é obrigatório; o tamanho fica no fim para facilitar variar esse argumento entre execuções. O modelo deve conter `application`, `key` e `value`, todos como strings. Como o `exec-maven-plugin` também interpreta aspas em `exec.args`, use aspas duplas no valor da propriedade e aspas simples ao redor do JSON, como nos exemplos, para preservar as aspas internas do JSON. O gerador mantém esses campos, varia aplicações e chaves, e cria valores string que representam booleanos, números, textos, JSON pequeno e JSON maior. O JSON pequeno ou grande fica serializado dentro do campo `value`; ele não vira um objeto JSON externo. O perfil `repetitive` usa cardinalidade baixa e conteúdo mais repetido; `realistic` usa mais variação e maior entropia.

O comando `benchmark-levels` aceita `<entrada.json> <relatorio.csv> [níveis] [buffer-KiB] [rodadas]`. Se omitidos, os níveis são `1,3,6,9,12,15,19`, o buffer é 128 KiB e são feitas três rodadas medidas. Os níveis precisam ser únicos e estar entre 1 e 19. O benchmark faz uma execução completa de aquecimento por nível, não incluída no CSV, e depois intercala a ordem dos níveis entre as rodadas para reduzir o efeito de ordem. Cada rodada compacta e descompacta o mesmo arquivo e valida SHA-256 antes de registrar a linha no CSV. O arquivo de entrada não é regenerado nem alterado.


O comando `train-dictionary` recebe `<amostras.json> <dictionary.zdict> [capacidade-amostras-MiB] [dicionario-KiB]`. Ele lê o array JSON por streaming e usa registros completos como amostras. O padrão é limitar a coleta a 4 MiB de amostras e gerar um dicionário de 32 KiB.

O comando `benchmark-dictionary` recebe `<entrada.json> <dictionary.zdict> <relatorio.csv> [nível] [buffer-KiB] [rodadas]`. Ele compara o mesmo arquivo com e sem dicionário, faz uma rodada de aquecimento por modo, alterna a ordem nas medições e valida SHA-256 em cada descompressão. A coluna `total_stored_bytes` soma o tamanho do frame e o dicionário uma vez, para que a redução reflita o custo de armazenar ambos para esse arquivo. Se um dicionário for compartilhado por vários arquivos, esse custo pode ser amortizado; o CSV mostra separadamente `dictionary_bytes` e `compressed_bytes`.

## Saída do benchmark
O CSV registra bytes de entrada e saída, redução percentual, latência e throughput de compressão/descompressão, igualdade SHA-256 e heap observado antes/depois de cada operação. A medição de heap é uma amostra antes/depois e não equivale ao pico de heap; execute cada cenário em processo isolado se precisar medir pico com uma ferramenta externa. O benchmark inclui leitura/escrita de arquivos, portanto mede o fluxo fim a fim com I/O.

Os resultados dependem da CPU, sistema operacional, JVM, dispositivo de armazenamento e conteúdo do JSON. O objetivo de 95% de redução é apenas uma hipótese para dados repetitivos, não uma garantia.

## Limites desta primeira versão
Esta POC ainda não mede concorrência progressiva. HTTP, Spring, transporte, chunks, dicionários e política adaptativa permanecem fora do escopo.
