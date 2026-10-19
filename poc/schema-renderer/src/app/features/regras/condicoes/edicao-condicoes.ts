import {
  converterTextoDaCondicao,
  validarTipoDoValorCondicional,
  inferirTipoDaComparacao,
} from './conversao-valor-condicao';
import { diagnosticarConflitosCondicionais } from './conflitos-condicoes';
import { expressaoEhGuiada } from './expressoes-condicao';
import {
  COMPARACOES_NUMERICAS,
  lerComparacaoDaCondicao,
  criarComparacaoDaCondicao,
} from './comparacoes-condicao';
import { OPCOES_COMPARACAO_TEXTO } from './restricoes-texto-condicional';
import {
  possuiRestricoesDoCampo,
  descreverRestricoesDoCampo,
} from './restricoes-campo-condicional';
import {
  converterValorAlternativa,
  formatarValorAlternativa,
} from '../alternativas/valores-alternativas';
import { valoresJsonIguais } from '../../../core/schema/json-value';
import { obterTipos, obterTipoDoValor, type Schema } from '../../../core/schema/schema-engine';
import { resolverCampoDaCondicao, escolherValorInicialDaCondicao } from './valores-condicao';
import { ehSchemaObjeto, obterNoSchema } from '../../builder/estrutura-builder';
import { criarSchemaDoCampo } from '../../campos/catalogo-campos';
import type { ContextoRegra } from '../compartilhado/contexto-regra';

export class EditorCondicoes {
  constructor(private readonly contexto: ContextoRegra) {}
  readonly possuiRestricoesDoCampo = possuiRestricoesDoCampo;
  readonly descreverRestricoesDoCampo = descreverRestricoesDoCampo;
  private get schema() {
    return this.contexto.obterSchema();
  }
  private get activeContainerPath() {
    return this.contexto.obterCaminhoAtivo();
  }
  private get palette() {
    return this.contexto.obterPaleta();
  }
  get conflitos() {
    return diagnosticarConflitosCondicionais(this.objetoAtual || {}, this.schema);
  }
  mensagemErro = '';
  private set error(mensagem: string) {
    this.mensagemErro = mensagem;
    this.contexto.informarErro(mensagem);
  }
  get paletaDeCampos() {
    return this.palette.filter((item) => item.type !== 'condition');
  }
  identificarCondicao(_index: number, rule: { index: number; schema: Schema }) {
    return rule.index;
  }
  identificarCampoDaCondicao(_index: number, field: { key: string; schema: Schema }) {
    return field.key;
  }
  get objetoAtual(): Schema | undefined {
    return obterNoSchema(this.schema, this.activeContainerPath);
  }
  private conditionCacheContainer: Schema | undefined;
  private conditionCachePath = '';
  private conditionCacheRules: { index: number; schema: Schema }[] = [];
  private conditionCacheFields: string[] = [];
  private atualizarCacheDasCondicoes() {
    const node = this.objetoAtual;
    if (
      node === this.conditionCacheContainer &&
      this.activeContainerPath === this.conditionCachePath
    )
      return;
    this.conditionCacheContainer = node;
    this.conditionCachePath = this.activeContainerPath;
    this.conditionCacheRules = (node?.allOf || [])
      .map((schema: Schema, index: number) => ({ index, schema }))
      .filter(
        (r: { index: number; schema: Schema }) =>
          r.schema?.if !== undefined &&
          (r.schema.then !== undefined || r.schema.else !== undefined),
      );
    this.conditionCacheFields = Object.keys(node?.properties || {});
  }
  get condicoesVisiveis(): { index: number; schema: Schema }[] {
    this.atualizarCacheDasCondicoes();
    return this.conditionCacheRules;
  }
  get camposDisponiveis(): string[] {
    this.atualizarCacheDasCondicoes();
    return this.conditionCacheFields;
  }
  private obterCondicaoEditavel(root: Schema, index: number): Schema | undefined {
    return obterNoSchema(root, this.activeContainerPath)?.allOf?.[index];
  }
  obterDefinicaoDaCondicao(rule: Schema): Schema {
    try {
      return resolverCampoDaCondicao(
        this.objetoAtual?.properties?.[this.obterCampoDaCondicao(rule)] ?? {},
        this.schema,
      );
    } catch {
      return {};
    }
  }
  obterValoresPermitidos(rule: Schema): any[] {
    return this.obterDefinicaoDaCondicao(rule).enum || [];
  }
  readonly formatarValor = formatarValorAlternativa;
  opcoesDeComparacao(rule: Schema) {
    const tipo = this.obterTipoEsperado(rule);
    if (tipo === 'string') return OPCOES_COMPARACAO_TEXTO;
    if (['integer', 'number'].includes(tipo)) return COMPARACOES_NUMERICAS;
    return [];
  }
  obterValorTipado(rule: Schema): any {
    return lerComparacaoDaCondicao(rule.if?.properties?.[this.obterCampoDaCondicao(rule)])?.valor;
  }

  obterOperadorDePresenca(rule: Schema): string | undefined {
    const condicao = rule.if;
    if (!condicao || typeof condicao !== 'object') return undefined;
    const chaves = Object.keys(condicao).filter(
      (key) => !['title', 'description', '$comment'].includes(key),
    );
    if (chaves.length !== 1) return undefined;
    if (
      chaves[0] === 'required' &&
      Array.isArray(condicao.required) &&
      condicao.required.length === 1
    )
      return 'present';
    if (
      chaves[0] === 'not' &&
      condicao.not &&
      Object.keys(condicao.not).length === 1 &&
      Array.isArray(condicao.not.required) &&
      condicao.not.required.length === 1
    )
      return 'absent';
    return undefined;
  }
  comparacaoEhPresenca(rule: Schema): boolean {
    return !!this.obterOperadorDePresenca(rule);
  }
  condicaoEhAvancada(rule: Schema): boolean {
    if (this.comparacaoEhPresenca(rule)) return false;
    const condicao = rule.if;
    if (!condicao || typeof condicao !== 'object') return true;
    if (
      Object.keys(condicao).some(
        (key) => !['properties', 'required', 'title', 'description', '$comment'].includes(key),
      )
    )
      return true;
    const campos = Object.keys(condicao.properties || {});
    if (campos.length !== 1) return true;
    if (condicao.required?.some((key: string) => key !== campos[0])) return true;
    return !lerComparacaoDaCondicao(condicao.properties[campos[0]]);
  }
  obterTiposDoValor(rule: Schema): string[] {
    return obterTipos(this.obterDefinicaoDaCondicao(rule));
  }
  obterTipoEsperado(rule: Schema): string {
    const tipos = this.obterTiposDoValor(rule);
    const tipo = obterTipoDoValor(this.obterValorTipado(rule));
    if (tipos.length && !tipos.includes(tipo) && !(tipo === 'integer' && tipos.includes('number')))
      return tipos[0];
    return tipo === 'integer' && !tipos.includes('integer') && tipos.includes('number')
      ? 'number'
      : tipo;
  }
  valorEsperadoEhJson(rule: Schema): boolean {
    return ['object', 'array'].includes(this.obterTipoEsperado(rule));
  }
  definirTipoEsperado(index: number, tipo: string) {
    const rule = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!rule || !this.obterTiposDoValor(rule).includes(tipo)) return;
    try {
      this.alterarCondicao(
        index,
        this.obterCampoDaCondicao(rule),
        ['equals', 'different'].includes(this.obterOperadorDaCondicao(rule))
          ? this.obterOperadorDaCondicao(rule)
          : 'equals',
        escolherValorInicialDaCondicao(this.obterDefinicaoDaCondicao(rule), this.schema, tipo),
      );
    } catch (error) {
      this.error = (error as Error).message;
    }
  }
  private converterValorDaCondicao(rule: Schema, text: string): any {
    const campo = resolverCampoDaCondicao(
      this.objetoAtual?.properties?.[this.obterCampoDaCondicao(rule)] ?? {},
      this.schema,
    );
    const tipo = this.obterTipoEsperado(rule);
    return converterTextoDaCondicao(campo, text, tipo);
  }

  definirValorTipadoEsperado(index: number, value: any) {
    const rule = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!rule) return;
    try {
      validarTipoDoValorCondicional(
        this.obterDefinicaoDaCondicao(rule),
        value,
        inferirTipoDaComparacao(this.obterDefinicaoDaCondicao(rule), value),
      );
      this.alterarCondicao(
        index,
        this.obterCampoDaCondicao(rule),
        this.obterOperadorDaCondicao(rule),
        structuredClone(value),
      );
    } catch (erro) {
      this.error = (erro as Error).message;
    }
  }

  obterCampoDaCondicao(rule: Schema): string {
    const presenca = this.obterOperadorDePresenca(rule);
    if (presenca) return presenca === 'present' ? rule.if.required[0] : rule.if.not.required[0];
    return Object.keys(rule.if?.properties || {})[0] || '';
  }
  obterOperadorDaCondicao(rule: Schema): string {
    return (
      this.obterOperadorDePresenca(rule) ||
      lerComparacaoDaCondicao(rule.if?.properties?.[this.obterCampoDaCondicao(rule)])?.operador ||
      'equals'
    );
  }
  campoDaCondicaoEhBooleano(rule: Schema): boolean {
    return this.obterTipoEsperado(rule) === 'boolean';
  }
  definirValorBooleanoEsperado(index: number, valor: boolean) {
    const rule = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (rule)
      this.alterarCondicao(
        index,
        this.obterCampoDaCondicao(rule),
        this.obterOperadorDaCondicao(rule),
        valor,
      );
  }
  obterValorEsperado(rule: Schema): string {
    const clause = rule.if?.properties?.[this.obterCampoDaCondicao(rule)] || {};
    return formatarValorAlternativa(this.obterValorTipado(rule));
  }
  adicionarCondicao() {
    const container = this.objetoAtual,
      fields = this.camposDisponiveis;
    if (!container || !ehSchemaObjeto(container)) {
      this.error = 'Abra um objeto para adicionar uma condição.';
      return;
    }
    try {
      const field = fields[0];
      if (!field) throw new Error('Adicione um campo antes de criar uma condição.');
      const value = escolherValorInicialDaCondicao(
        resolverCampoDaCondicao(container.properties[field], this.schema),
        this.schema,
      );
      this.contexto.alterarSchema((root) => {
        const node = obterNoSchema(root, this.activeContainerPath)!;
        node.allOf ??= [];
        node.allOf.push({
          if: { properties: { [field]: { const: value } }, required: [field] },
          then: {},
        });
      });
      this.error = '';
    } catch (error) {
      this.error = (error as Error).message;
    }
  }
  removerCondicao(index: number) {
    this.contexto.alterarSchema((root) => {
      const node = obterNoSchema(root, this.activeContainerPath)!;
      node.allOf?.splice(index, 1);
      if (!node.allOf?.length) delete node.allOf;
    });
  }
  private alterarCondicao(index: number, field: string, operator: string, expected: any) {
    const atual = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!atual || this.condicaoEhAvancada(atual)) {
      this.error = 'Condição avançada preservada. Edite pela aba Para Dev.';
      return;
    }
    try {
      const campo = resolverCampoDaCondicao(
        this.objetoAtual?.properties?.[field] ?? {},
        this.schema,
      );
      const presenca = ['present', 'absent'].includes(operator);
      const comparacao = presenca
        ? operator === 'present'
          ? { required: [field] }
          : { not: { required: [field] } }
        : {
            properties: {
              [field]: criarComparacaoDaCondicao(operator, expected, obterTipos(campo)),
            },
          };
      this.contexto.alterarSchema((root) => {
        const rule = this.obterCondicaoEditavel(root, index);
        if (rule) {
          const anterior = rule.if;
          const anotacoes = Object.fromEntries(
            Object.entries(anterior).filter(([key]) =>
              ['title', 'description', '$comment'].includes(key),
            ),
          );
          rule.if = { ...anotacoes, ...comparacao };
          if (!presenca && anterior.required && !this.comparacaoEhPresenca(atual))
            rule.if.required = anterior.required.map((key: string) =>
              key === this.obterCampoDaCondicao(atual) ? field : key,
            );
          else if (!presenca && this.comparacaoEhPresenca(atual)) rule.if.required = [field];
        }
      });
      this.error = '';
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
  }

  definirCampoDaCondicao(index: number, field: string) {
    const rule = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!rule || !this.camposDisponiveis.includes(field)) return;
    if (this.comparacaoEhPresenca(rule)) {
      this.alterarCondicao(index, field, this.obterOperadorDaCondicao(rule), undefined);
      return;
    }
    try {
      const value = escolherValorInicialDaCondicao(
        resolverCampoDaCondicao(this.objetoAtual!.properties[field], this.schema),
        this.schema,
      );
      this.alterarCondicao(
        index,
        field,
        ['equals', 'different'].includes(this.obterOperadorDaCondicao(rule))
          ? this.obterOperadorDaCondicao(rule)
          : 'equals',
        value,
      );
    } catch (error) {
      this.error = (error as Error).message;
    }
  }
  definirOperadorDaCondicao(index: number, operator: string) {
    const rule = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!rule) return;
    try {
      const value =
        this.comparacaoEhPresenca(rule) && !['present', 'absent'].includes(operator)
          ? escolherValorInicialDaCondicao(this.obterDefinicaoDaCondicao(rule), this.schema)
          : this.obterValorTipado(rule);
      this.alterarCondicao(index, this.obterCampoDaCondicao(rule), operator, value);
    } catch (error) {
      this.error = (error as Error).message;
    }
  }
  definirValorEsperado(index: number, value: string) {
    const rule = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!rule) return;
    try {
      this.alterarCondicao(
        index,
        this.obterCampoDaCondicao(rule),
        this.obterOperadorDaCondicao(rule),
        this.converterValorDaCondicao(rule, value),
      );
    } catch (error) {
      this.error = (error as Error).message;
    }
  }
  expressaoCompostaEhGuiada(rule: Schema): boolean {
    return this.condicaoEhAvancada(rule) && expressaoEhGuiada(rule.if);
  }
  definirExpressao(index: number, expressao: Schema) {
    const atual = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!atual || !expressaoEhGuiada(atual.if) || !expressaoEhGuiada(expressao)) {
      this.error = 'Expressão avançada preservada.';
      return;
    }
    this.contexto.alterarSchema((root) => {
      const regra = this.obterCondicaoEditavel(root, index);
      if (regra) regra.if = structuredClone(expressao);
    });
  }
  agruparExpressao(index: number, modo: string) {
    const atual = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (atual && ['allOf', 'anyOf', 'not'].includes(modo))
      this.definirExpressao(index, modo === 'not' ? { not: atual.if } : { [modo]: [atual.if] });
  }
  listarCamposDoRamo(rule: Schema, branch: 'then' | 'else'): { key: string; schema: Schema }[] {
    const node = rule[branch] || {};
    const keys = [...new Set([...Object.keys(node.properties || {}), ...(node.required || [])])];
    return keys.map((key) => ({ key, schema: node.properties?.[key] ?? {} }));
  }
  campoDoRamoEhObrigatorio(rule: Schema, branch: 'then' | 'else', key: string) {
    return (rule[branch]?.required || []).includes(key);
  }
  ramoEhBooleano(rule: Schema, branch: 'then' | 'else'): boolean {
    return typeof rule[branch] === 'boolean';
  }
  campoDoRamoEhBooleano(rule: Schema, branch: 'then' | 'else', key: string): boolean {
    return typeof rule[branch]?.properties?.[key] === 'boolean';
  }
  private permitirEdicaoDoRamo(
    rule: Schema | undefined,
    branch: 'then' | 'else',
    key?: string,
  ): boolean {
    if (!rule) return false;
    if (
      this.ramoEhBooleano(rule, branch) ||
      (key !== undefined && this.campoDoRamoEhBooleano(rule, branch, key))
    ) {
      this.error = 'Schema booleano preservado. Edite pela aba Para Dev.';
      return false;
    }
    return true;
  }
  private editarRamo(index: number, branch: 'then' | 'else', edit: (node: Schema) => void) {
    if (
      !this.permitirEdicaoDoRamo(
        this.condicoesVisiveis.find((r) => r.index === index)?.schema,
        branch,
      )
    )
      return;
    this.contexto.alterarSchema((root) => {
      const rule = this.obterCondicaoEditavel(root, index);
      if (!rule) return;
      rule[branch] ??= {};
      edit(rule[branch]);
    });
  }
  definirRestricaoDoRamo(index: number, branch: 'then' | 'else', key: string, restricao: Schema) {
    if (
      !this.permitirEdicaoDoRamo(
        this.condicoesVisiveis.find((r) => r.index === index)?.schema,
        branch,
        key,
      )
    )
      return;
    this.editarRamo(index, branch, (node) => {
      node.properties ??= {};
      node.properties[key] = restricao;
    });
  }
  adicionarCampoExistenteAoRamo(index: number, branch: 'then' | 'else', key: string) {
    if (!this.camposDisponiveis.includes(key)) return;
    this.editarRamo(index, branch, (node) => {
      node.properties ??= {};
      if (Object.hasOwn(node.properties, key) || node.required?.includes(key)) return;
      node.properties[key] = { 'x-ui': { visible: true } };
    });
  }
  campoDoRamoEstaVisivel(rule: Schema, branch: 'then' | 'else', key: string): boolean {
    if (this.campoEhObrigatorioGlobalmente(key) || this.campoDoRamoEhObrigatorio(rule, branch, key))
      return true;
    const explicito = rule[branch]?.properties?.[key]?.['x-ui']?.visible;
    if (typeof explicito === 'boolean') return explicito;
    const outroRamo = branch === 'then' ? 'else' : 'then';
    if (typeof rule[outroRamo]?.properties?.[key]?.['x-ui']?.visible === 'boolean') return false;
    return (
      this.campoDoRamoEhObrigatorio(rule, branch, key) ||
      !this.campoDoRamoEhObrigatorio(rule, outroRamo, key)
    );
  }
  readonly avisoObrigatorioNaOrigem =
    'Campo obrigatório na origem. Altere a configuração do campo para permitir mudanças neste ramo.';
  campoEhObrigatorioGlobalmente(key: string): boolean {
    return this.objetoAtual?.required?.includes(key) ?? false;
  }
  definirVisibilidadeDoCampoDoRamo(
    index: number,
    branch: 'then' | 'else',
    key: string,
    visivel: boolean,
  ) {
    const regra = this.condicoesVisiveis.find((r) => r.index === index)?.schema;
    if (!this.permitirEdicaoDoRamo(regra, branch, key)) return;
    if (
      !regra ||
      (!visivel &&
        (this.campoEhObrigatorioGlobalmente(key) ||
          this.campoDoRamoEhObrigatorio(regra, branch, key)))
    )
      return;
    this.editarRamo(index, branch, (node) => {
      node.properties ??= {};
      const campo = node.properties[key] ?? (node.properties[key] = {});
      if (typeof campo !== 'object' || campo === null) return;
      campo['x-ui'] = { ...campo['x-ui'], visible: visivel };
    });
  }
  adicionarCampoAoRamo(index: number, branch: 'then' | 'else') {
    this.editarRamo(index, branch, (node) => {
      node.properties ??= {};
      let key = 'campo',
        i = 2;
      while (key in node.properties || key in (this.objetoAtual?.properties || {}))
        key = 'campo' + i++;
      node.properties[key] = criarSchemaDoCampo('string', key);
    });
  }
  renomearCampoDoRamo(index: number, branch: 'then' | 'else', oldKey: string, name: string) {
    const key = name.trim();
    if (!key || key === oldKey || !/^[$A-Za-z_][$A-Za-z0-9_-]*$/.test(key)) return;
    this.editarRamo(index, branch, (node) => {
      if (!node.properties?.[oldKey] || key in node.properties) return;
      const next: Record<string, Schema> = {};
      for (const [k, v] of Object.entries(node.properties))
        next[k === oldKey ? key : k] = v as Schema;
      node.properties = next;
      if (node.required) node.required = node.required.map((v: string) => (v === oldKey ? key : v));
    });
  }
  definirTipoDoCampoDoRamo(index: number, branch: 'then' | 'else', key: string, type: string) {
    if (
      !this.permitirEdicaoDoRamo(
        this.condicoesVisiveis.find((r) => r.index === index)?.schema,
        branch,
        key,
      )
    )
      return;
    if (!this.palette.some((item) => item.type === type && type !== 'condition')) return;
    this.editarRamo(index, branch, (node) => {
      if (!node.properties?.[key]) return;
      if (type) node.properties[key] = { ...node.properties[key], type };
      else delete node.properties[key].type;
    });
  }
  definirObrigatoriedadeDoCampoDoRamo(
    index: number,
    branch: 'then' | 'else',
    key: string,
    enabled: boolean,
  ) {
    if (this.campoEhObrigatorioGlobalmente(key)) return;
    if (
      !this.permitirEdicaoDoRamo(
        this.condicoesVisiveis.find((r) => r.index === index)?.schema,
        branch,
        key,
      )
    )
      return;
    this.contexto.alterarSchema((root) => {
      const container = obterNoSchema(root, this.activeContainerPath);
      const regra = container?.allOf?.[index];
      if (!container || !regra || container.required?.includes(key)) return;
      const node = regra[branch] ?? (regra[branch] = {});
      if (enabled) {
        node.properties ??= {};
        const campo = node.properties[key] ?? (node.properties[key] = {});
        if (typeof campo !== 'object' || campo === null) return;
        campo['x-ui'] = { ...campo['x-ui'], visible: true };
      }
      const required = new Set<string>(node.required || []);
      enabled ? required.add(key) : required.delete(key);
      if (required.size) node.required = [...required];
      else delete node.required;
    });
  }
  removerCampoDoRamo(index: number, branch: 'then' | 'else', key: string) {
    this.editarRamo(index, branch, (node) => {
      if (node.properties) delete node.properties[key];
      if (node.required) {
        node.required = node.required.filter((v: string) => v !== key);
        if (!node.required.length) delete node.required;
      }
    });
  }
}
