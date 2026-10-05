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


## Experimento com dicionário

Execute os comandos a partir do diretório `poc-compactacao), na branch `feature/poc-compactacao`. Depois de atualizar a branch, recompile para garantir que os novos comandos estejam disponíveis:

```bash
git pull origin feature/poc-compactacao
mvn -q clean package
```

Gere um corpus de treinamento separado do arquivo de benchmark. O seed explícito cria uma sequência diferente da geração padrão:

```bash
mvn -q exec:java -Dexec.args="generate '{\\"application\\":\\"app-a\\",\\"key\\":\\"feature.enabled\\",\\"value\\":\\"true\\"}' dataset-realista-treino.json realistic 20 987654321"
```

Treine um dicionário de 32 KiB usando até 4 MiB desse corpus:

```bash
mvn -q exec:java -Dexec.args='train-dictionary dataset-realista-treino.json dictionary-realista.zdict 4 32'
```

Comece comparando com e sem dicionário no nível 1, com três rodadas medidas:

```bash
mvn -q exec:java -Dexec.args='benchmark-dictionary dataset-realista.json dictionary-realista.zdict benchmark-dictionary-nivel1.csv 1 128 3'
```

Se houver ganho, compare também no nível 19. Uma rodada medida reduz o tempo de execução; o comando ainda faz um aquecimento de cada modo:

```bash
mvn -q exec:java -Dexec.args='benchmark-dictionary dataset-realista.json dictionary-realista.zdict benchmark-dictionary-nivel19.csv 19 128 1'
```

Use como entrada o mesmo `dataset-realista.json` de aproximadamente 200 MiB usado no benchmark de níveis. Cada execução valida o round-trip por SHA-256. No CSV, `total_stored_bytes` soma o frame comprimido e o dicionário uma vez, para que a redução considere o custo de armazenar os dois arquivos. Se o dicionário for reutilizado em vários payloads, esse custo pode ser amortizado.

## Saída do benchmark
O CSV registra bytes de entrada e saída, redução percentual, latência e throughput de compressão/descompressão, igualdade SHA-256 e heap observado antes/depois de cada operação. A medição de heap é uma amostra antes/depois e não equivale ao pico de heap; execute cada cenário em processo isolado se precisar medir pico com uma ferramenta externa. O benchmark inclui leitura/escrita de arquivos, portanto mede o fluxo fim a fim com I/O.

Os resultados dependem da CPU, sistema operacional, JVM, dispositivo de armazenamento e conteúdo do JSON. O objetivo de 95% de redução é apenas uma hipótese para dados repetitivos, não uma garantia.

## Limites desta primeira versão
Esta POC ainda não mede concorrência progressiva. O treinamento e benchmark com dicionário são experimentos isolados; ainda não há política de seleção ou gestão de dicionários no engine. HTTP, Spring, transporte, chunks e política adaptativa permanecem fora do escopo.
