# Documentação da Feature: Onboarding

## 1. Visão Geral

O Onboarding é uma **feature para guiar o usuário na primeira integração** da conta e aplicações, garantindo que todas as fases críticas sejam concluídas antes do uso completo do sistema.

### Fases do Onboarding:

| Fase   | Tipo Onboarding                           | Descrição                                        |
| ------ | ----------------------------------------- | ------------------------------------------------ |
| Fase 1 | CADASTRAR_CONTA                           | Criação da conta                                 |
| Fase 2 | CONFIGURAR_PRIMEIRO_AMBIENTE_DA_CONTA     | Configuração mínima do ambiente DEV da conta     |
| Fase 3 | CADASTRAR_PRIMEIRA_APLICACAO              | Criação da primeira aplicação                    |
| Fase 4 | CONFIGURAR_PRIMEIRO_AMBIENTE_DA_APLICACAO | Configuração mínima do ambiente DEV da aplicação |

> Cada fase é registrada na tabela `OnbordingConcluidoConta`.

---

## 2. Estrutura de Pacotes

```text
core/
 ├─ conta/
 │   ├─ ContaService.java
 │   ├─ ConfiguracaoContaService.java
 │   ├─ AplicacaoService.java
 │   ├─ OnboardingService.java           # registra fases e calcula progresso
 │   └─ OnboardingFeatureService.java   # orquestrador da feature
 │
 │   ├─ model/
 │   │   ├─ Conta.java
 │   │   ├─ ConfiguracaoConta.java
 │   │   ├─ Aplicacao.java
 │   │   ├─ OnbordingConcluidoConta.java
 │   │   ├─ TipoOnboarding.java
 │   │   └─ enums/OnboardingStatus.java
 │
 │   └─ repository/
 │       ├─ ContaRepository.java
 │       ├─ ConfiguracaoContaRepository.java
 │       ├─ AplicacaoRepository.java
 │       └─ OnboardingRepository.java
web/
 ├─ controller/
 │   ├─ OnboardingController.java
 │   └─ ContaController.java
 └─ dto/
     ├─ ContaComAmbientesDTO.java      # DTO único com lista de ambientes
     └─ OnboardingProgressDTO.java
```

---

## 3. Endpoints da Feature

| Endpoint                 | Método | Descrição                                             |
| ------------------------ | ------ | ----------------------------------------------------- |
| `/conta/{id}/onboarding` | GET    | Retorna o progresso do onboarding da conta            |
| `/conta/{id}/onboarding` | PATCH  | Finaliza o onboarding da conta                        |
| `/conta`                 | POST   | Cria a conta e um ou mais ambientes (DEV obrigatório) |

### Exemplo body do POST `/conta` com múltiplos ambientes:

```json
{
  "nome": "Conta X",
  "descricao": "Conta teste",
  "configuracoesAmbientes": [
    {
      "tipo": "DEFAULT",
      "grupoAutorizador": "DEV",
      "param1": "valor1"
    },
    {
      "tipo": "HML",
      "grupoAutorizador": "HML",
      "param1": "valorHML"
    }
  ]
}
```

---

## 4. Serviços com Exemplos em Java

### 4.1 ContaService

```java
public class ContaService {

    public Conta criarConta(ContaComAmbientesDTO dto) {
        Conta conta = new Conta();
        conta.setNome(dto.getNome());
        conta.setDescricao(dto.getDescricao());
        conta.setStatusOnboarding(OnboardingStatus.PEDENTE);
        // salvar no banco
        return conta;
    }
}
```

### 4.2 ConfiguracaoContaService

```java
public class ConfiguracaoContaService {

    public void salvarConfiguracao(Long contaId, ConfiguracaoAmbienteDTO dto) {
        ConfiguracaoConta config = new ConfiguracaoConta();
        config.setContaId(contaId);
        config.setTipo(dto.getTipo());
        config.setGrupoAutorizador(dto.getGrupoAutorizador());
        // salvar no banco
    }
}
```

### 4.3 AplicacaoService

```java
public class AplicacaoService {

    public void salvarAplicacao(Long contaId, AplicacaoDTO dto, String usuario) {
        Aplicacao app = new Aplicacao();
        app.setContaId(contaId);
        app.setNome(dto.getNome());
        // salvar no banco

        // registrar fases do onboarding
        onboardingService.registrarFase(contaId, OnboardingTipo.CADASTRAR_PRIMEIRA_APLICACAO, usuario);
        if(dto.isConfigurarDev()){
            onboardingService.registrarFase(contaId, OnboardingTipo.CONFIGURAR_PRIMEIRO_AMBIENTE_DA_APLICACAO, usuario);
        }
    }
}
```

### 4.4 OnboardingService

```java
public class OnboardingService {

    public void registrarFase(Long contaId, OnboardingTipo tipo, String usuario) {
        OnbordingConcluidoConta registro = new OnbordingConcluidoConta();
        registro.setIdConta(contaId);
        registro.setTipoOnboarding(tipo);
        registro.setUsuario(usuario);
        registro.setDataConclusao(LocalDateTime.now());
        // salvar no banco
    }

    public List<OnboardingProgressDTO> calcularProgresso(Long contaId) {
        List<TipoOnboarding> fases = tipoOnboardingRepository.findAllByOrderByOrdem();
        List<OnbordingConcluidoConta> concluidos = onboardingRepository.findByContaId(contaId);

        List<OnboardingProgressDTO> progresso = new ArrayList<>();
        boolean emAndamentoSetado = false;

        for(TipoOnboarding fase : fases){
            boolean concluido = concluidos.stream().anyMatch(c -> c.getTipoOnboarding().equals(fase));
            OnboardingStatus status;

            if(concluido){
                status = OnboardingStatus.CONCLUIDO;
            } else if(!emAndamentoSetado){
                status = OnboardingStatus.EM_ANDAMENTO;
                emAndamentoSetado = true;
            } else {
                status = OnboardingStatus.PENDENTE;
            }

            progresso.add(new OnboardingProgressDTO(fase.getNome(), status));
        }

        return progresso;
    }
}
```

---

### Exemplo de Query SQL para Progresso

```sql
SELECT t.id, t.nome, t.ordem, 
       CASE 
           WHEN o.id IS NOT NULL THEN 'CONCLUIDO'
           ELSE NULL
       END AS status
FROM TipoOnboarding t
LEFT JOIN OnbordingConcluidoConta o
       ON o.idTipoOnboarding = t.id AND o.idConta = :idConta
ORDER BY t.ordem;
```

---

### 4.5 OnboardingFeatureService (Orquestrador)

```java
@Service
public class OnboardingFeatureService {

    private final ContaService contaService;
    private final ConfiguracaoContaService configuracaoContaService;
    private final OnboardingService onboardingService;

    public Conta criarContaComConfiguracoes(ContaComAmbientesDTO dto, String usuario) {
        Conta conta = contaService.criarConta(dto);

        for (ConfiguracaoAmbienteDTO conf : dto.getConfiguracoesAmbientes()) {
            configuracaoContaService.salvarConfiguracao(conta.getId(), conf);
            if (conf.getTipo() == TipoAmbiente.DEV) {
                onboardingService.registrarFase(conta.getId(), OnboardingTipo.CONFIGURAR_PRIMEIRO_AMBIENTE_DA_CONTA, usuario);
            }
        }

        onboardingService.registrarFase(conta.getId(), OnboardingTipo.CADASTRAR_CONTA, usuario);
        return conta;
    }
}
```

---

## 5. Fluxo de Progresso do Onboarding

* Concluído → registro existe na tabela `OnbordingConcluidoConta`
* Em andamento → primeira fase pendente
* Pendente → fases subsequentes

### Exemplo de DTO de Progresso

```java
public class OnboardingProgressDTO {
    private String fase;
    private OnboardingStatus status;

    public OnboardingProgressDTO(String fase, OnboardingStatus status){
        this.fase = fase;
        this.status = status;
    }

    // getters e setters
}
```

---

## 6. Observações

* Status do onboarding: PEDENTE, FEEDBACK, FINALIZADO
* Fases podem ser revertidas se remover última aplicação
* Progressão visual: Verde (concluído), Amarelo (em andamento), Vermelho (pendente)

---

## 7. Conclusão

* OnboardingFeatureService centraliza a feature
* Core contém os serviços de regra de negócio
* Web apenas expõe endpoints e DTOs
* Fluxo guiado e registrado automaticamente
* Preparado para futuras extensões
