# POC de compressão

Projeto Maven isolado em Java 25, sem Spring. Zstd, GZIP, Brotli e XZ implementam a mesma interface e processam os dados por streams, em blocos.

## Comparar os quatro algoritmos

Rode os comandos a partir do diretório `poc-compactacao`:

```bash
mvn -q clean package

# Gera um dataset JSON de 200 MiB com um modelo aninhado
mvn -q exec:java -Dexec.args="generate '{\"id\":42,\"metadata\":{\"enabled\":true,\"region\":\"sa-east-1\"},\"labels\":[\"blue\",\"green\"]}' dataset-realista.json realistic 200"

# Comprime e descomprime o mesmo arquivo com Zstd, GZIP, Brotli e XZ.
# Acrescenta quatro linhas ao CSV; o buffer padrão é 128 KiB.
mvn -q exec:java -Dexec.args='compare dataset-realista.json 128'
```

O comando `compare` usa os parâmetros padrão de cada algoritmo e o mesmo arquivo de entrada. Para cada formato, ele comprime, descomprime e valida o SHA-256. O cabeçalho do relatório inclui a data e a hora local em que a geração terminou. Os quatro arquivos compactados, os quatro arquivos restaurados e `comparacao.csv` ficam na pasta `comparacao-algoritmos/`, criada na raiz do projeto.

Cada execução atualiza os arquivos e recria o CSV com quatro linhas, uma por algoritmo. Ao concluir, o comando também recria `RELATORIO-COMPARACAO-ALGORITMOS.md` usando os dados recém-gravados no CSV, com tabelas e gráficos de tamanho, tempo, CPU, heap, RSS do processo e memória residente privada. O buffer padrão é 128 KiB; informe outro valor como segundo argumento para alterá-lo. As métricas de recursos também são impressas no terminal.

Veja o [relatório da comparação, atualizado automaticamente a cada execução](RELATORIO-COMPARACAO-ALGORITMOS.md).

## Comandos individuais

```bash
# Rodar um formato específico, com relatório opcional
mvn -q exec:java -Dexec.args='roundtrip zstd 1 128 dataset-realista.json dataset.zst restaurado.json --analysis analise-zstd.csv'

# Compactar ou descompactar sem executar o roundtrip completo
mvn -q exec:java -Dexec.args='compress gzip 6 128 dataset-realista.json dataset.json.gz'
mvn -q exec:java -Dexec.args='decompress gzip 128 dataset.json.gz restaurado.json'
```

Sintaxe do comparador: `compare <entrada.json> [buffer-KiB]`. O buffer padrão é 128 KiB. `roundtrip` recebe `<algoritmo> <nível/qualidade/preset> <buffer-KiB> <entrada> <compactado> <restaurado> [--analysis <csv>]`.

## Geração do JSON

O comando `generate` recebe `<modelo-JSON> <arquivo.json> <repetitive|realistic> <tamanho-MiB> [seed]`. O modelo pode ser qualquer valor JSON válido: objeto, array ou valor simples, com campos aninhados e tipos mistos. O gerador preserva a estrutura e os nomes dos campos e varia os valores de texto, números e booleanos. O perfil `repetitive` usa variações cíclicas para gerar mais repetição; `realistic` usa valores mais variados. Informe uma seed para reproduzir o mesmo conjunto.

## Algoritmos e configurações padrão

| Algoritmo | Parâmetro | Padrão usado por `compare` |
|---|---|---:|
| Zstd | nível 1–22 | 1 |
| GZIP | nível 0–9 | 6 |
| Brotli | qualidade 0–11 | 5 |
| XZ/LZMA2 | preset 0–9 | 6 |

Os valores dos parâmetros não são equivalentes entre algoritmos. Brotli4j usa uma biblioteca nativa da plataforma. O decoder XZ tem limite de memória de 128 MiB.

## Dados no CSV

O CSV registra data/hora, algoritmo e configuração, tamanhos, redução, tempos e throughput, validação SHA-256 e heap observado antes/depois do roundtrip. Também registra, separadamente para compressão e descompressão:

- CPU total do processo em milissegundos e percentual médio de um núcleo. A CPU é medida pelo processo JVM durante cada etapa; pode incluir trabalho de GC e outras threads da JVM. O percentual pode passar de 100% quando várias threads usam CPU ao mesmo tempo. Se a plataforma não oferecer essa métrica, os campos ficam vazios.
- Heap JVM, RSS do processo e memória residente privada, cada um com valor antes, pico amostrado e depois da etapa. O amostrador lê as métricas a cada 20 ms; picos mais curtos podem passar despercebidos. O RSS inclui páginas compartilhadas; a memória residente privada exclui essas páginas e se aproxima do valor atribuído ao processo pelo sistema operacional. RSS e memória privada dependem do suporte da plataforma; quando indisponíveis, os campos correspondentes ficam vazios e o relatório omite o gráfico.

A medição inclui leitura e escrita dos arquivos. Para `roundtrip --analysis`, use um CSV novo ou remova o anterior se ele tiver sido gerado pela versão antiga, pois o cabeçalho agora inclui as métricas por etapa. Os resultados dependem da máquina, JVM, armazenamento e conteúdo. Cada chamada executa uma rodada por algoritmo, sem treino de dicionário ou matriz de níveis.
