# POC de compressão

Projeto Maven isolado em Java 25, sem Spring. Zstd, GZIP, Brotli e XZ implementam a mesma interface e processam os dados por streams, em blocos.

## Executar

Rode a partir do diretório `poc-compactacao`:

```bash
mvn -q clean package

# 1. Gera um JSON de 200 MiB
mvn -q exec:java -Dexec.args="generate '{\\"application\\":\\"app-a\\",\\"key\\":\\"feature.enabled\\",\\"value\\":\\"true\\"}' dataset-realista.json realistic 200"

# 2. Comprime, descomprime, confere SHA-256 e acrescenta uma linha ao CSV
mvn -q exec:java -Dexec.args='roundtrip zstd 1 128 dataset-realista.json dataset.json.zst restaurado.json --analysis analise.csv'

# Repita com outro formato; cada execução acrescenta uma linha ao mesmo CSV
mvn -q exec:java -Dexec.args='roundtrip gzip 6 128 dataset-realista.json dataset.json.gz restaurado.json --analysis analise.csv'
mvn -q exec:java -Dexec.args='roundtrip brotli 5 128 dataset-realista.json dataset.json.br restaurado.json --analysis analise.csv'
mvn -q exec:java -Dexec.args='roundtrip xz 6 128 dataset-realista.json dataset.json.xz restaurado.json --analysis analise.csv'
```

O parâmetro `--analysis analise.csv` é opcional. Sem ele, o comando ainda faz compressão e descompressão e verifica se os arquivos são iguais; apenas não grava o CSV. Cada chamada produz uma medição. Rode o comando de novo para acrescentar outra linha e comparar repetições.

## Comandos

- `generate <modelo-JSON> <arquivo.json> <repetitive|realistic> <tamanho-MiB> [seed]`
- `roundtrip <algoritmo> <nível/qualidade/preset> <buffer-KiB> <entrada> <compactado> <restaurado> [--analysis <csv>]`
- `compress <algoritmo> <nível/qualidade/preset> <buffer-KiB> <entrada> <compactado>`
- `decompress <algoritmo> <buffer-KiB> <compactado> <restaurado>`

O modelo JSON de `generate` deve ter `application`, `key` e `value`, todos strings. O perfil `repetitive` gera dados mais repetidos; `realistic` varia mais os registros. Informe uma seed para produzir outro conjunto reproduzível.

| Algoritmo | Parâmetro | Exemplo |
|---|---|---:|
| Zstd | nível 1–22 | 1 |
| GZIP | nível 0–9 | 6 |
| Brotli | qualidade 0–11 | 5 |
| XZ/LZMA2 | preset 0–9 | 6 |

Os valores dos parâmetros não são equivalentes entre algoritmos. Brotli4j usa biblioteca nativa da plataforma. O decoder XZ tem limite de memória de 128 MiB.

## CSV de análise

O CSV registra data/hora, algoritmo e configuração, tamanho original e compactado, redução percentual, tempos e throughput de compressão/descompressão, validação SHA-256 e heap observado antes/depois. O heap é apenas uma amostra, não o pico. A medição inclui o fluxo de leitura e escrita em arquivo.

O resultado depende da máquina, JVM, armazenamento e conteúdo. Esta versão não treina dicionários nem executa matrizes automáticas de níveis; cada chamada analisa uma configuração escolhida.
