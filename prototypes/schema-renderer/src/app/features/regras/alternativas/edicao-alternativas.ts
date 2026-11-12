import {
  converterValorAlternativa,
  formatarValorAlternativa,
  listarValoresIniciais,
  validarValorAlternativa,
} from './valores-alternativas';
import { valoresJsonIguais } from '../../../core/schema/json-value';
import { obterTipoDaRestricao } from '../condicoes/restricoes-unificadas';
import type { Schema } from '../../../core/schema/schema-engine';
import { obterNoSchema } from '../../builder/estrutura-builder';
import type { ContextoRegra } from '../compartilhado/contexto-regra';

export class EditorAlternativas {
  constructor(private readonly contexto: ContextoRegra) {}
  private get schema() {
    return this.contexto.obterSchema();
  }
  private get activeContainerPath() {
    return this.contexto.obterCaminhoAtivo();
  }
  mensagemErro = '';
  private set error(mensagem: string) {
    this.mensagemErro = mensagem;
    this.contexto.informarErro(mensagem);
  }
  get objetoAtual(): Schema {
    return obterNoSchema(this.schema, this.activeContainerPath) || {};
  }
  private alterarObjeto(editar: (objeto: Schema) => void) {
    const caminho = this.activeContainerPath;
    this.contexto.alterarSchema((root) => {
      const objeto = obterNoSchema(root, caminho);
      if (objeto) editar(objeto);
    });
  }
  campoObrigatorioNaOrigem(chave: string): boolean {
    return this.objetoAtual.required?.includes(chave) ?? false;
  }
  get camposObrigatoriosNaOrigem(): string[] {
    return this.objetoAtual.required || [];
  }
  tipoDoCampoDeEscolha(node: Schema): string {
    return obterTipoDaRestricao(this.objetoAtual.properties?.[this.obterCampoDeEscolha(node)]);
  }
  valoresPermitidosDoCampoDeEscolha(node: Schema): unknown[] {
    return this.objetoAtual.properties?.[this.obterCampoDeEscolha(node)]?.enum || [];
  }
  readonly formatarValorAlternativa = formatarValorAlternativa;

  oneOfModePickerOpen = false;
  private get camposDisponiveis() {
    return Object.keys(obterNoSchema(this.schema, this.activeContainerPath)?.properties || {});
  }
  private oneOfCacheSchema: Schema | undefined;
  private oneOfCacheRules: { index: number; schema: Schema }[] = [];
  get regrasVisiveis(): { index: number; schema: Schema }[] {
    const schema = this.objetoAtual;
    if (schema !== this.oneOfCacheSchema) {
      this.oneOfCacheSchema = schema;
      this.oneOfCacheRules =
        Array.isArray(schema.oneOf) && schema.oneOf.length ? [{ index: 0, schema }] : [];
    }
    return this.oneOfCacheRules;
  }
  identificarRegra(_index: number, rule: { index: number; schema: Schema }) {
    return rule.index;
  }
  identificarIndice(index: number) {
    return index;
  }
  abrirSeletorDeModo() {
    if (this.objetoAtual.oneOf?.length) {
      this.error = 'Já existe uma regra oneOf. Edite ou exclua a regra atual antes de criar outra.';
      return;
    }
    this.error = '';
    this.oneOfModePickerOpen = true;
  }
  adicionarRegra(mode: 'fields' | 'value') {
    this.error = '';
    if (this.objetoAtual.oneOf?.length) return;
    const fields = this.camposDisponiveis;
    if (!fields.length) return;
    if (mode === 'fields') {
      const opcionais = fields.filter((campo) => !this.campoObrigatorioNaOrigem(campo));
      if (opcionais.length < 2) {
        this.error =
          'Cadastre pelo menos dois campos opcionais na origem para criar alternativas por conjunto de campos.';
        return;
      }
      this.alterarObjeto((root) => {
        root.oneOf = opcionais.slice(0, 2).map((campo, index) => ({
          title: 'Alternativa ' + (index + 1),
          required: [campo],
          not: { required: [opcionais[index === 0 ? 1 : 0]] },
        }));
      });
    } else {
      const camposOrdenados = [
        ...fields.filter((campo) => Array.isArray(this.objetoAtual.properties?.[campo]?.enum)),
        ...fields.filter((campo) => !Array.isArray(this.objetoAtual.properties?.[campo]?.enum)),
      ];
      const escolhas = camposOrdenados.map((campo) => ({
        campo,
        valores: listarValoresIniciais(this.objetoAtual.properties?.[campo] || {}, this.schema),
      }));
      const escolha = escolhas.find((item) => item.valores.length >= 2);
      if (!escolha) {
        this.error = 'Defina pelo menos dois valores permitidos e válidos em um campo de escolha.';
        return;
      }
      this.alterarObjeto((root) => {
        root.oneOf = escolha.valores.slice(0, 2).map((valor, index) => ({
          title: 'Alternativa ' + (index + 1),
          properties: { [escolha.campo]: { const: structuredClone(valor) } },
          required: [escolha.campo],
        }));
      });
    }
    this.oneOfModePickerOpen = false;
  }
  adicionarAlternativa() {
    this.error = '';
    if (!this.objetoAtual.oneOf?.length) return;
    const selector = this.obterCampoDeEscolha(this.objetoAtual);
    const index = this.objetoAtual.oneOf.length;
    this.alterarObjeto((root) => {
      const option: Schema = { title: 'Alternativa ' + (index + 1) };
      if (selector) {
        const existing = (root.oneOf || []).map(
          (item: Schema) => item.properties?.[selector]?.const,
        );
        const allowed = listarValoresIniciais(root.properties?.[selector] || {}, this.schema);
        const available = allowed.find(
          (value: any) => !existing.some((old: any) => valoresJsonIguais(old, value)),
        );
        if (available === undefined) {
          this.error =
            'Não há outro valor válido disponível. Cadastre outro valor permitido no campo de escolha.';
          return;
        }
        option.properties = { [selector]: { const: structuredClone(available) } };
        option.required = [selector];
      }
      root.oneOf ??= [];
      root.oneOf.push(option);
    });
  }
  removerAlternativa(index: number) {
    if ((this.objetoAtual.oneOf?.length || 0) <= 2) return;
    this.alterarObjeto((root) => {
      root.oneOf?.splice(index, 1);
    });
  }
  removerRegra(_index: number) {
    this.alterarObjeto((root) => {
      delete root.oneOf;
    });
  }
  listarOpcoes(node: Schema): Schema[] {
    return (node.oneOf || []) as Schema[];
  }
  usaCampoDeEscolha(node: Schema): boolean {
    return !!this.obterCampoDeEscolha(node);
  }
  permiteEditarCamposProibidos(node: Schema): boolean {
    const not = node.not as any;
    if (!not) return true;
    const validRequired = (part: any) =>
      part &&
      typeof part === 'object' &&
      Object.keys(part).length === 1 &&
      Array.isArray(part.required) &&
      part.required.length === 1 &&
      typeof part.required[0] === 'string';
    if (validRequired(not)) return true;
    return (
      not &&
      typeof not === 'object' &&
      Object.keys(not).length === 1 &&
      Array.isArray(not.anyOf) &&
      not.anyOf.every(validRequired)
    );
  }
  listarCamposProibidos(node: Schema): string[] {
    const not = node.not as any;
    if (!not || typeof not !== 'object') return [];
    const rules = Array.isArray(not.anyOf) ? not.anyOf : [not];
    return [
      ...new Set<string>(
        rules.flatMap((rule: any) =>
          Array.isArray(rule.required) && rule.required.length === 1 ? rule.required : [],
        ),
      ),
    ];
  }
  adicionarCampoProibido(_index: number, index: number, key: string) {
    if (!key || !this.camposDisponiveis.includes(key)) return;
    const atual = this.objetoAtual.oneOf?.[index];
    if (atual?.not && !this.permiteEditarCamposProibidos(atual)) {
      this.error = 'A regra not existente é avançada. Edite-a no modo Para Dev.';
      return;
    }
    if (this.campoObrigatorioNaOrigem(key) || atual?.required?.includes(key)) {
      this.error = 'Um campo obrigatório na origem ou nesta alternativa não pode ser proibido.';
      return;
    }
    this.error = '';
    this.alterarObjeto((root) => {
      const option = root.oneOf?.[index];
      if (!option) return;
      if (option.not && !this.permiteEditarCamposProibidos(option)) {
        this.error = 'A regra not existente é avançada. Edite-a no modo Para Dev.';
        return;
      }
      const keys = [...new Set<string>([...this.listarCamposProibidos(option), key])];
      option.not =
        keys.length === 1
          ? { required: [keys[0]] }
          : { anyOf: keys.map((name) => ({ required: [name] })) };
    });
  }
  obterCampoDeEscolha(node: Schema): string {
    return (
      Object.keys(node.oneOf?.[0]?.properties || {}).find((key) =>
        node.oneOf?.every((option: Schema) => option.properties?.[key]?.const !== undefined),
      ) || ''
    );
  }
  obterValorTipadoDaAlternativa(node: Schema): unknown {
    const chave =
      this.obterCampoDeEscolha(this.objetoAtual) ||
      Object.keys(node.properties || {}).find((campo) =>
        Object.hasOwn(node.properties[campo] || {}, 'const'),
      );
    return chave ? node.properties?.[chave]?.const : undefined;
  }
  obterValorDaAlternativa(node: Schema): string {
    return formatarValorAlternativa(this.obterValorTipadoDaAlternativa(node));
  }
  renomearAlternativa(index: number, title: string) {
    this.alterarObjeto((root) => {
      if (root.oneOf?.[index]) root.oneOf[index].title = title;
    });
  }
  listarCamposObrigatorios(node: Schema): string[] {
    const discriminator = Object.keys(node.properties || {}).find(
      (key) => node.properties?.[key]?.const !== undefined,
    );
    return (node.required || []).filter((key: string) => key !== discriminator);
  }
  definirCampoDeEscolha(_index: number, field: string) {
    if (!this.camposDisponiveis.includes(field)) return false;
    const anterior = this.obterCampoDeEscolha(this.objetoAtual);
    if (field === anterior) return true;
    const opcoes = this.objetoAtual.oneOf || [];
    const candidatos = listarValoresIniciais(
      this.objetoAtual.properties?.[field] || {},
      this.schema,
    );
    if (candidatos.length < opcoes.length) {
      this.error = 'O novo campo precisa ter um valor válido e distinto para cada alternativa.';
      return false;
    }
    // Preserve o valor atual quando compatível; caso contrário, escolha valores tipados da origem.
    const valores: unknown[] = [];
    try {
      for (const opcao of opcoes) {
        const atual = this.obterValorTipadoDaAlternativa(opcao);
        const candidato =
          candidatos.find(
            (valor) =>
              valoresJsonIguais(valor, atual) &&
              !valores.some((usado) => valoresJsonIguais(usado, valor)),
          ) ??
          candidatos.find((valor) => !valores.some((usado) => valoresJsonIguais(usado, valor)));
        const definicao = { ...(opcao.properties?.[field] || {}) };
        delete definicao.const;
        validarValorAlternativa(
          { allOf: [this.objetoAtual.properties[field], definicao] },
          candidato,
          valores,
          this.schema,
        );
        valores.push(candidato);
      }
    } catch (erro) {
      this.error = (erro as Error).message;
      return false;
    }
    this.error = '';
    this.alterarObjeto((root) => {
      root.oneOf.forEach((opcao: Schema, indice: number) => {
        opcao.properties ??= {};
        if (anterior && opcao.properties[anterior]) {
          delete opcao.properties[anterior].const;
          if (!Object.keys(opcao.properties[anterior]).length) delete opcao.properties[anterior];
        }
        opcao.properties[field] = {
          ...opcao.properties[field],
          const: structuredClone(valores[indice]),
        };
        opcao.required = [
          ...new Set([
            ...(opcao.required || []).filter((campo: string) => campo !== anterior),
            field,
          ]),
        ];
      });
    });
    return true;
  }
  definirValorDaAlternativa(regra: number, index: number, value: string) {
    try {
      const chave = this.obterCampoDeEscolha(this.objetoAtual);
      const valor = converterValorAlternativa(this.objetoAtual.properties?.[chave] || {}, value);
      return this.definirValorTipadoDaAlternativa(regra, index, valor);
    } catch (erro) {
      this.error = (erro as Error).message;
      return false;
    }
  }
  definirValorTipadoDaAlternativa(_regra: number, index: number, valor: unknown) {
    const chave = this.obterCampoDeEscolha(this.objetoAtual);
    const opcao = this.objetoAtual.oneOf?.[index];
    if (!chave || !opcao) return false;
    const clausula = { ...opcao.properties[chave] };
    delete clausula.const;
    try {
      const anteriores = this.objetoAtual.oneOf
        .filter((_item: Schema, i: number) => i !== index)
        .map((item: Schema) => item.properties?.[chave]?.const);
      validarValorAlternativa(
        { allOf: [this.objetoAtual.properties?.[chave] || {}, clausula] },
        valor,
        anteriores,
        this.schema,
      );
    } catch (erro) {
      this.error = (erro as Error).message;
      return false;
    }
    this.error = '';
    this.alterarObjeto((root) => {
      root.oneOf[index].properties[chave] = {
        ...root.oneOf[index].properties[chave],
        const: structuredClone(valor),
      };
    });
    return true;
  }
  adicionarCampoObrigatorio(_index: number, index: number, field: string) {
    if (!field || !this.camposDisponiveis.includes(field)) return;
    if (this.campoObrigatorioNaOrigem(field)) return;
    if (this.listarCamposProibidos(this.objetoAtual.oneOf?.[index] || {}).includes(field)) {
      this.error = 'Um campo proibido nesta alternativa não pode ser obrigatório.';
      return;
    }
    this.error = '';
    this.alterarObjeto((root) => {
      const rule = root.oneOf?.[index];
      if (rule) rule.required = [...new Set([...(rule.required || []), field])];
    });
  }
  removerCampoObrigatorio(index: number, key: string) {
    if (this.campoObrigatorioNaOrigem(key)) return;
    this.alterarObjeto((root) => {
      const option = root.oneOf?.[index];
      if (!option) return;
      option.required = (option.required || []).filter((field: string) => field !== key);
      if (!option.required.length) delete option.required;
    });
  }
  removerCampoProibido(index: number, key: string) {
    this.alterarObjeto((root) => {
      const option = root.oneOf?.[index];
      if (!option || !this.permiteEditarCamposProibidos(option)) return;
      const remaining = this.listarCamposProibidos(option).filter((field) => field !== key);
      if (!remaining.length) delete option.not;
      else
        option.not =
          remaining.length === 1
            ? { required: [remaining[0]] }
            : { anyOf: remaining.map((field) => ({ required: [field] })) };
    });
  }
}
