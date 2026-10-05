# POC de compressão Zstandard

Projeto Maven isolado, em Java 25, sem Spring. O caminho principal lê e escreve por streams; não carrega o dataset inteiro em memória. O gerador replica um objeto JSON fornecido pelo usuário até atingir pelo menos o alvo indicado em MiB. O tamanho final pode passar do alvo em até aproximadamente o tamanho de um objeto.

## Requisitos

- JDK 25
- Maven 3.9+

## Uso

```bash
mvn -q package

# Gera uma lista JSON repetindo o objeto-modelo até 1 MiB.
mvn -q exec:java -Dexec.args='generate 1 {"application":"app-a","key":"feature.enabled","value":"true"} dataset.json'

# Compacta e descompacta por streaming.
mvn -q exec:java -Dexec.args='compress 3 64 dataset.json dataset.json.zst'
mvn -q exec:java -Dexec.args='decompress 64 dataset.json.zst restored.json'

# Executa nível 1/3/6 com buffers 32/64/128/256 KiB e valida SHA-256.
mvn -q exec:java -Dexec.args='benchmark dataset.json benchmark.csv'
```

O argumento `generate` é `<tamanho-MiB> <objeto-JSON> <arquivo-saida>`. Para objetos grandes ou strings com aspas, use um arquivo/script shell que passe o JSON como um único argumento.

## Saída do benchmark

O CSV registra bytes de entrada e saída, redução percentual, latência e throughput de compressão/descompressão, igualdade SHA-256 e heap observado antes/depois de cada operação. A medição de heap é uma amostra antes/depois e não equivale ao pico de heap; execute cada cenário em processo isolado se precisar medir pico com uma ferramenta externa. O benchmark é sequencial e inclui leitura/escrita de arquivos, portanto mede o fluxo fim-a-fim com I/O.

Os resultados dependem da CPU, sistema operacional, JVM, dispositivo de armazenamento e conteúdo do JSON. O objetivo de 95% de redução é apenas uma hipótese para dados repetitivos, não uma garantia.

## Limites desta primeira versão

Esta POC ainda não mede concorrência progressiva nem compara perfis sintéticos de entropia. O gerador usa o objeto-modelo informado. HTTP, Spring, transporte, chunks, dicionários e política adaptativa permanecem fora do escopo.
