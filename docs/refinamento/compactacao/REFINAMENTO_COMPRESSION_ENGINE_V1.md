# Compression Engine — Refinamento Técnico V1

## 1. Objetivo

Definir a primeira versão de um mecanismo reutilizável de compressão e descompressão de payloads para a plataforma.

Esta V1 tem foco exclusivo em provar e padronizar o núcleo de compressão. Transporte HTTP/2, long polling, retomada, Range Requests, chunking e distribuição multi-tenant ficam explicitamente fora desta primeira implementação e serão evoluções posteriores.

O objetivo da POC é responder, com medições reais, qual taxa de compressão e qual throughput podem ser obtidos para payloads representativos do domínio, variando aproximadamente de 1 KB a 100 MB.

---

## 2. Contexto

O payload funcional é uma coleção de configurações. Cada registro possui:

```text
application
key
value
```

Modelo conceitual:

```java
public record ConfigurationData(
    String application,
    String key,
    String value
) {}
```

`application` pertence ao cliente e não existe uma lista fixa de aplicações. Um cliente pode possuir poucas ou muitas aplicações.

`value` é sempre transportado como `String`, mas pode representar semanticamente:

- boolean;
- número;
- texto;
- objeto JSON complexo;
- array JSON;
- outros valores serializados como texto.

Exemplo:

```json
[
  {
    "application": "app-a",
    "key": "feature.payment.enabled",
    "value": "true"
  },
  {
    "application": "app-a",
    "key": "payment.configuration",
    "value": "{\"timeout\":3000,\"retry\":3}"
  },
  {
    "application": "erp-financeiro",
    "key": "menu.configuration",
    "value": "[{\"name\":\"home\",\"enabled\":true}]"
  }
]
```

O Compression Engine não deve interpretar semanticamente `application`, `key` ou `value`. Seu domínio são bytes.

---

## 3. Premissas de capacidade

A solução futura poderá receber payloads de aproximadamente:

```text
1 KB ... 100 MB
```

A plataforma também poderá operar com alta frequência de publicações, potencialmente próxima de 1.000 publicações por segundo em determinados cenários.

Entretanto, `publicações/s` isoladamente não representa a carga real. A capacidade deverá futuramente considerar também:

```text
bytes/s
MB/s
CPU
memória
concorrência
latência
```

Exemplos extremos:

```text
1.000 x 1 KB   ~= 1 MB/s
1.000 x 100 MB ~= 100 GB/s
```

Portanto, a V1 não assume que 1.000 payloads de 100 MB/s sejam requisito de capacidade. A POC deverá revelar os limites reais do mecanismo.

---

## 4. Decisão arquitetural principal

O núcleo será implementado com processamento incremental por streams.

Fluxo de compressão:

```text
InputStream
    |
    v
BufferedInputStream
    |
    v
Zstd streaming
    |
    v
BufferedOutputStream
    |
    v
OutputStream
```

Fluxo inverso:

```text
InputStream comprimido
    |
    v
Zstd streaming
    |
    v
OutputStream original
```

O mecanismo não deverá exigir que o payload completo seja materializado em um `byte[]`.

### Princípio obrigatório

> Nenhuma operação principal de compressão ou descompressão pode exigir alocação proporcional ao tamanho total do payload.

Um payload de 100 MB não deve implicar `new byte[100MB]` como requisito do engine.

---

## 5. Motivação para streaming

Uma implementação baseada em payload completo tende a produzir algo semelhante a:

```text
JSON 100 MB
    |
    v
byte[] 100 MB
    |
    v
compressão
    |
    v
byte[] comprimido
```

Além do payload original, podem coexistir cópias intermediárias, buffers e objetos do domínio, aumentando pressão sobre heap e Garbage Collector.

Com streaming:

```text
100 MB
 |
 +-- buffer -> comprime -> escreve
 +-- buffer -> comprime -> escreve
 +-- buffer -> comprime -> escreve
 +-- ...
```

A memória utilizada pelo pipeline deve permanecer aproximadamente limitada aos buffers e ao estado interno do compressor, e não crescer linearmente com o payload.

---

## 6. Algoritmo inicial

O algoritmo principal da V1 será:

```text
Zstandard (Zstd)
```

Motivos para a POC:

- alto throughput;
- boa relação compressão/CPU;
- suporte natural a streaming;
- níveis configuráveis;
- possibilidade futura de Dictionary Compression.

A primeira POC deverá testar pelo menos:

```text
Zstd Level 1
Zstd Level 3
Zstd Level 6
```

Levels maiores podem ser adicionados como referência de benchmark, mas não são candidatos padrão até que os dados demonstrem benefício suficiente.

O objetivo não é maximizar exclusivamente a porcentagem de redução. O objetivo é encontrar o melhor equilíbrio entre:

```text
compression ratio
throughput
CPU
latência
memória
```

---

## 7. Meta de 95%

Uma redução próxima de 95% é desejável para datasets altamente compressíveis, mas não é garantia contratual.

A compressibilidade depende da entropia dos dados.

Payloads com grande repetição de:

```text
application
key
estruturas JSON
nomes de atributos
valores recorrentes
```

podem atingir reduções muito elevadas.

Payloads contendo grande volume de UUIDs, hashes, valores criptográficos ou strings pseudoaleatórias podem apresentar redução significativamente menor.

Portanto:

> 95% será uma métrica observada no benchmark, e não uma garantia do Compression Engine.

---

## 8. API principal

A API principal deve ser independente de JSON, HTTP, filesystem ou qualquer mecanismo de transporte.

Contrato conceitual:

```java
public interface CompressionEngine {

    CompressionResult compress(
        InputStream source,
        OutputStream destination,
        CompressionOptions options
    );

    DecompressionResult decompress(
        InputStream source,
        OutputStream destination
    );
}
```

A API baseada em streams será a API canônica.

APIs de conveniência poderão existir posteriormente:

```java
byte[] compress(byte[] source);
byte[] decompress(byte[] source);
```

mas deverão delegar ao mesmo núcleo e não serão utilizadas como caminho principal para payloads grandes.

---

## 9. Independência de origem e destino

Como o engine trabalha com streams, a mesma implementação poderá futuramente suportar:

```text
arquivo -> compressão -> arquivo
arquivo -> compressão -> HTTP
HTTP    -> descompressão -> arquivo
HTTP    -> descompressão -> parser
memória -> compressão -> memória
```

O Compression Engine não deve saber qual é a origem física ou o destino físico dos bytes.

---

## 10. Integração futura com serialização JSON

A arquitetura desejada evita materializar primeiro todo o JSON.

Caminho não desejado para payload grande:

```text
List<ConfigurationData>
        |
        v
Jackson
        |
        v
byte[] JSON completo
        |
        v
Compression Engine
```

Caminho desejado:

```text
ConfigurationData
        |
        v
Jackson JsonGenerator
        |
        | streaming
        v
ZstdOutputStream
        |
        v
Destination
```

Na descompressão:

```text
Compressed InputStream
        |
        v
ZstdInputStream
        |
        v
Jackson JsonParser
        |
        v
ConfigurationData
```

A POC deverá permitir comparar os dois comportamentos quando isso for útil para medir memória e throughput.

---

## 11. Buffering

O tamanho do buffer não será fixado definitivamente antes do benchmark.

A POC deverá comparar pelo menos:

```text
32 KB
64 KB
128 KB
256 KB
```

O objetivo é encontrar um ponto de equilíbrio entre:

- quantidade de operações de I/O;
- cache locality;
- memória por operação concorrente;
- throughput.

O valor vencedor do benchmark poderá se tornar o default da biblioteca, permanecendo configurável.

---

## 12. CompressionOptions

Modelo conceitual:

```java
public record CompressionOptions(
    CompressionAlgorithm algorithm,
    int level,
    int bufferSize
) {}
```

Algoritmos iniciais:

```text
NONE
ZSTD
```

`NONE` será importante para uma futura política adaptativa, permitindo evitar custo de CPU quando o payload for pequeno demais para justificar compressão.

Na V1, a POC poderá invocar explicitamente os níveis para benchmark.

---

## 13. Resultados

O resultado da compressão deve permitir observabilidade sem expor detalhes de implementação.

Modelo conceitual:

```java
public record CompressionResult(
    long originalBytes,
    long compressedBytes,
    double reductionPercentage,
    long elapsedNanos
) {}
```

E para descompressão:

```java
public record DecompressionResult(
    long compressedBytes,
    long decompressedBytes,
    long elapsedNanos
) {}
```

A instrumentação definitiva poderá ser refinada após a POC.

---

## 14. Integridade

A POC deverá garantir que compressão e descompressão sejam lossless.

Critério:

```text
SHA-256(original) == SHA-256(decompressed)
```

Fluxo:

```text
original
   |
   +---- SHA-256 A
   |
   v
compress
   |
   v
decompress
   |
   +---- SHA-256 B

A == B -> PASS
A != B -> FAIL
```

Qualquer divergência é falha crítica do teste.

---

## 15. Dataset sintético

Como ainda não existe um payload real representativo, a POC deverá gerar dados sintéticos automaticamente.

Tamanhos-alvo:

```text
1 KB
10 KB
100 KB
1 MB
10 MB
30 MB
60 MB
100 MB
```

O gerador não deverá depender de uma lista fixa de aplicações.

Ele deverá ser capaz de gerar diferentes cardinalidades de aplicações pertencentes ao cliente e continuar adicionando registros até atingir aproximadamente o tamanho-alvo.

### Distribuição inicial de `value`

O dataset deverá conter uma combinação de:

- boolean representado como String;
- números representados como String;
- textos;
- objetos JSON complexos serializados como String;
- arrays JSON serializados como String.

---

## 16. Perfis de dataset

Para evitar resultados artificialmente otimistas, a POC deverá gerar pelo menos dois perfis.

### 16.1 Repetitivo

Representa configurações com alto reaproveitamento estrutural:

- aplicações recorrentes;
- chaves semelhantes;
- estruturas JSON semelhantes;
- valores recorrentes.

### 16.2 Realista / maior entropia

Deve introduzir maior variedade:

- muitas aplicações;
- chaves variadas;
- UUIDs sintéticos;
- timestamps;
- textos variados;
- objetos e arrays com conteúdo variável.

Não devem ser utilizados segredos ou dados reais de clientes.

Esses dois perfis ajudam a estabelecer limites superior e inferior mais realistas para compressão.

---

## 17. Benchmark

Para cada combinação de tamanho, perfil, buffer e nível Zstd, coletar:

```text
original size
compressed size
reduction %
compression latency
compression MB/s
decompression latency
decompression MB/s
peak/observed memory
SHA-256 validation
```

Tabela esperada conceitualmente:

```text
SIZE     PROFILE      LEVEL   BUFFER   COMPRESSED   REDUCTION   COMP MB/s   DECOMP MB/s   RESULT
1 KB     repetitive   1       64 KB    ...          ...         ...         ...           PASS
1 MB     realistic    3       128 KB   ...          ...         ...         ...           PASS
60 MB    repetitive   3       128 KB   ...          ...         ...         ...           PASS
100 MB   realistic    6       256 KB   ...          ...         ...         ...           PASS
```

Os números não devem ser previamente assumidos.

---

## 18. Concorrência

Depois do benchmark unitário do engine, executar testes progressivos de concorrência.

Níveis iniciais:

```text
1
10
50
100
250
500
1000
```

A POC não precisa atingir 1.000 operações/s para todos os tamanhos.

O objetivo é identificar:

- ponto de saturação;
- throughput agregado;
- impacto de payloads grandes;
- uso de CPU;
- pressão de memória;
- degradação de latência.

Os testes devem sempre registrar também o volume processado em bytes/s ou MB/s.

---

## 19. Política adaptativa — evolução V2

A V1 não deve congelar thresholds sem evidência.

Depois do benchmark, será possível definir uma política semelhante a:

```text
payload pequeno -> NONE
payload médio   -> ZSTD level 1
payload grande  -> ZSTD level 3
```

Os valores exatos serão derivados dos resultados da POC.

A política deverá ser isolada do compressor:

```java
public interface CompressionPolicy {
    CompressionOptions resolve(long originalSize);
}
```

Essa capacidade pertence à evolução V2.

---

## 20. Dictionary Compression — evolução posterior

Zstd Dictionary poderá ser avaliado posteriormente, principalmente para payloads pequenos e médios com estruturas altamente repetitivas.

Essa evolução exigirá definir:

```text
dictionaryId
dictionaryVersion
training strategy
distribution
cache
compatibility
```

Não faz parte da V1.

---

## 21. Transporte — fora da V1

A arquitetura discutida prevê evolução futura para:

```text
HTTP/2
long polling
publicações de clientes diferentes
versionamento
payload imutável
streaming HTTP
retry
resume
Range Requests
chunking
ACK
multi-tenant
backpressure
rate limiting
```

Essas preocupações não devem contaminar o núcleo da V1.

Separação desejada:

```text
Compression Engine
        |
        v
Compressed Artifact
        |
        v
Transport Layer
```

O transporte consome o resultado do Compression Engine; o Compression Engine não conhece o transporte.

---

## 22. Evolução para chunks

Chunking será tratado como capacidade independente em uma versão posterior.

Arquitetura futura:

```text
JSON
 |
 v
Compression Engine
 |
 v
Compressed Artifact
 |
 v
Chunk Engine
 |
 +-- chunk 0
 +-- chunk 1
 +-- chunk 2
 +-- chunk N
```

Na recepção:

```text
chunks
  |
  v
reassembly
  |
  v
Compressed Artifact
  |
  v
Compression Engine
  |
  v
original
```

Dessa forma, introduzir chunks não exige reescrever o mecanismo de compressão.

---

## 23. Roadmap proposto

```text
V1 - Streaming Compression Engine
 |
 v
V2 - Adaptive Compression Policy
 |
 v
V3 - HTTP/2 / Long Polling integration
 |
 v
V4 - Persistence / Resumable Transfer
 |
 v
V5 - Chunking / Range
 |
 v
V6 - Multi-tenant High Throughput
```

O roadmap é evolutivo. Cada etapa deve manter baixo acoplamento com a anterior.

---

## 24. POC Java

A próxima etapa será criar uma POC simples em Java 25.

A decisão entre:

```text
módulo dentro de projeto existente
```

ou

```text
projeto Maven independente
```

será tomada antes da implementação.

A recomendação para a primeira prova de conceito é manter o escopo mínimo, sem dependência de Spring, HTTP ou infraestrutura externa.

Escopo inicial esperado:

```text
compression-poc
├── dataset generator
├── compression engine
├── Zstd implementation
├── decompression
├── SHA-256 validation
├── benchmark runner
└── report output
```

Java alvo:

```text
Java 25
```

---

## 25. Critérios de aceite da POC

A POC V1 estará tecnicamente comprovada quando:

1. gerar datasets sintéticos entre aproximadamente 1 KB e 100 MB;
2. compactar os datasets por streaming;
3. descompactar os datasets por streaming;
4. não exigir materialização do payload completo em `byte[]` no caminho principal;
5. validar igualdade lossless por SHA-256;
6. medir Zstd levels 1, 3 e 6;
7. comparar buffers de 32 KB, 64 KB, 128 KB e 256 KB;
8. registrar tamanho original e comprimido;
9. registrar redução percentual;
10. registrar throughput de compressão e descompressão;
11. registrar latência;
12. observar comportamento de memória;
13. executar testes progressivos de concorrência;
14. produzir resultados suficientes para definir a política adaptativa V2.

---

## 26. Decisões consolidadas

- O produto começa pelo núcleo de compressão/descompressão.
- O algoritmo inicial é Zstd.
- Streaming é obrigatório no caminho principal.
- `InputStream` / `OutputStream` são a abstração canônica da V1.
- O engine trabalha com bytes e não conhece JSON semanticamente.
- Payloads esperados variam aproximadamente de 1 KB a 100 MB.
- O objetivo de 95% é uma métrica, não uma garantia.
- Performance será avaliada por compressão, throughput, CPU, memória e latência.
- A política por faixa será definida somente após benchmark.
- HTTP/2, long polling e chunks ficam fora da primeira POC.
- O desenho deve permitir que essas capacidades sejam adicionadas sem alterar o núcleo do Compression Engine.

---

## 27. Próximo passo

Definir e implementar a POC Java 25 mínima para executar os benchmarks descritos neste documento.

A POC deverá ser usada como instrumento de decisão arquitetural. Nenhum threshold de tamanho, nível de compressão ou buffer deve ser promovido a padrão da plataforma antes da análise dos resultados.