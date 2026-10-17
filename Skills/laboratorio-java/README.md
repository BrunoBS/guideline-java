# Laboratório mínimo Java — independente da Golden

Fontes: https://docs.oracle.com/en/java/javase/25/core/concurrency.html

Os três arquivos em `src/` são fontes Java reais, sem dependências externas. Testam invariantes, falhas e limite de concorrência.

```sh
cd Skills/laboratorio-java
mkdir -p out
javac -d out src/*.java
java -cp out SmokeTests
```

**Verificação ainda pendente na stack alvo:** Java 25. O exemplo utiliza apenas APIs estáveis e não necessita preview. A presença dos fontes não prova compilação: registrar saída real antes de mudar o status. Não usar para afirmar desempenho de virtual threads, integração Spring Boot ou capacidade de JDBC. Não executa operações nos repositórios Golden.
