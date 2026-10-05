# POC de compressão Zstandard

Projeto Maven isolado, em Java 25, sem Spring. O caminho de compressão lê e escreve por streams; não carrega o dataset inteiro em memória. O gerador recebe um registro-modelo `ConfigurationData` e produz novos registros variados até atingir o tamanho-alvo em MiB. O arquivo gerado é um array JSON válido; cada campo `value` continua sendo uma string.

## Requisitos

- JDK 25
- Maven 3.9+

## Uso

```bash
mvn -q package

# Gera registros diferentes a partir do modelo até 1 MiB (perfil repetitivo).
mvn -q exec:java -Dexec.args='generate {"application":"app-a","key":"feature.enabled","value":"true"} dataset.json repetitive 1'
mvn -q exec:java -Dexec.args='generate {"application":"app-a","key":"feature.enabled","value":"true"} dataset-realista.json realistic 10'

# Compacta e descompacta por streaming.
mvn -q exec:java -Dexec.args='compress 3 64 dataset.json dataset.json.zst'
mvn -q exec:java -Dexec.args='decompress 64 dataset.json.zst restored.json'

# Executa nível 1/3/6 com buffers 32/64/128/256 KiB e valida SHA-256.
mvn -q exec:java -Dexec.args='benchmark dataset.json benchmark.csv'
```

O comando `generate` recebe, nesta ordem, `<modelo-ConfigurationData> <dataset.json> <repetitive|realistic> <tamanho-MiB>`. O perfil é obrigatório; o tamanho fica no fim para facilitar variar esse argumento entre execuções. O modelo deve conter `application`, `key` e `value`, todos como strings. O gerador mantém esses campos, varia aplicações e chaves, e cria valores string que representam booleanos, números, textos, JSON pequeno e JSON maior. O JSON pequeno ou grande fica serializado dentro do campo `value`; ele não vira um objeto JSON externo. O perfil `repetitive` usa cardinalidade baixa e conteúdo mais repetido; `realistic` usa mais variação e maior entropia. Para objetos grandes ou strings com aspas, use um arquivo/script shell que passe o JSON como um único argumento.

## Saída do benchmark

O CSV registra bytes de entrada e saída, redução percentual, latência e throughput de compressão/descompressão, igualdade SHA-256 e heap observado antes/depois de cada operação. A medição de heap é uma amostra antes/depois e não equivale ao pico de heap; execute cada cenário em processo isolado se precisar medir pico com uma ferramenta externa. O benchmark é sequencial e inclui leitura/escrita de arquivos, portanto mede o fluxo fim-a-fim com I/O.

Os resultados dependem da CPU, sistema operacional, JVM, dispositivo de armazenamento e conteúdo do JSON. O objetivo de 95% de redução é apenas uma hipótese para dados repetitivos, não uma garantia.

## Limites desta primeira versão

Esta POC ainda não mede concorrência progressiva. HTTP, Spring, transporte, chunks, dicionários e política adaptativa permanecem fora do escopo.
