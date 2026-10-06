# POC de compressão

Projeto Maven isolado em Java 25, sem Spring. Zstd, GZIP, Brotli e XZ implementam a mesma interface e processam os dados por streams, em blocos.

## Comparar os quatro algoritmos

Rode os comandos a partir do diretório `poc-compactacao`:

```bash
mvn -q clean package

# Gera uma entrada JSON de 200 MiB
mvn -q exec:java -Dexec.args="generate '{\"application\":\"app-a\",\"key\":\"feature.enabled\",\"value\":\"true\"}' dataset-realista.json realistic 200"

# Comprime e descomprime o mesmo arquivo com Zstd, GZIP, Brotli e XZ.
# Acrescenta quatro linhas ao CSV; o buffer padrão é 128 KiB.
mvn -q exec:java -Dexec.args='compare dataset-realista.json comparacao.csv 128'
```

O comando `compare` usa os parâmetros padrão de cada algoritmo e o mesmo arquivo de entrada. Para cada formato, ele comprime, descomprime e valida o SHA-256. Os arquivos intermediários são temporários e removidos ao final; o JSON original e o CSV permanecem.

Cada execução acrescenta quatro linhas ao CSV, uma por algoritmo. Execute novamente para obter outra rodada. O CSV abre com cabeçalho apenas quando é criado ou está vazio.

## Comandos individuais

```bash
# Rodar um formato específico, com relatório opcional
mvn -q exec:java -Dexec.args='roundtrip zstd 1 128 dataset-realista.json dataset.zst restaurado.json --analysis analise-zstd.csv'

# Compactar ou descompactar sem executar o roundtrip completo
mvn -q exec:java -Dexec.args='compress gzip 6 128 dataset-realista.json dataset.json.gz'
mvn -q exec:java -Dexec.args='decompress gzip 128 dataset.json.gz restaurado.json'
```

Sintaxe do comparador: `compare <entrada.json> <relatorio.csv> [buffer-KiB]`. O buffer padrão é 128 KiB. `roundtrip` recebe `<algoritmo> <nível/qualidade/preset> <buffer-KiB> <entrada> <compactado> <restaurado> [--analysis <csv>]`.

## Geração do JSON

O comando `generate` recebe `<modelo-JSON> <arquivo.json> <repetitive|realistic> <tamanho-MiB> [seed]`. O modelo deve ter `application`, `key` e `value`, todos strings. O perfil `repetitive` gera dados mais repetidos; `realistic` varia mais os registros. Informe uma seed para produzir outro conjunto reproduzível.

## Algoritmos e configurações padrão

| Algoritmo | Parâmetro | Padrão usado por `compare` |
|---|---|---:|
| Zstd | nível 1–22 | 1 |
| GZIP | nível 0–9 | 6 |
| Brotli | qualidade 0–11 | 5 |
| XZ/LZMA2 | preset 0–9 | 6 |

Os valores dos parâmetros não são equivalentes entre algoritmos. Brotli4j usa uma biblioteca nativa da plataforma. O decoder XZ tem limite de memória de 128 MiB.

## Dados no CSV

O CSV registra data/hora, algoritmo e configuração, tamanho original e compactado, redução percentual, tempos e throughput de compressão/descompressão, validação SHA-256 e heap observado antes/depois. O heap é uma amostra, não o pico. A medição inclui leitura e escrita em arquivo.

Os resultados dependem da máquina, JVM, armazenamento e conteúdo. Cada chamada executa uma rodada por algoritmo, sem treino de dicionário ou matriz de níveis.
