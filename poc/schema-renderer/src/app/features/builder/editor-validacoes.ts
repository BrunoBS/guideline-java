import { converterValorPermitido } from './valores-permitidos';
import type { Schema } from '../../core/schema/schema-engine';
import type { ContextoEditor } from './contexto-editor';
import {
  obterNoSchema,
  ehSchemaObjeto,
  separarCaminho,
  escaparSegmento,
} from './estrutura-builder';

const ATRIBUTOS_AVANCADOS = [
  'if',
  'then',
  'else',
  'allOf',
  'oneOf',
  'anyOf',
  'not',
  '$defs',
  '$ref',
  'patternProperties',
  'propertyNames',
  'dependentRequired',
  'dependentSchemas',
  'unevaluatedProperties',
  'contains',
  'minContains',
  'maxContains',
  'prefixItems',
];

export class EditorValidacoes {
  constructor(private readonly contexto: ContextoEditor) {}
  private get selectedPath() {
    return this.contexto.obterCaminhoSelecionado();
  }
  private set selectedPath(caminho: string) {
    this.contexto.selecionarCaminho(caminho);
  }
  private get campoSelecionado() {
    return this.obterCampoSelecionado(this.contexto.obterSchema());
  }
  private set error(mensagem: string) {
    this.contexto.informarErro(mensagem);
  }
  private obterCampoSelecionado(schema: Schema) {
    return obterNoSchema(schema, this.selectedPath);
  }
  definirAtributo(key: 'title' | 'description', value: string) {
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (value) node[key] = value;
      else delete node[key];
    });
  }
  definirAtributoOpcional(key: string, value: string) {
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (value) node[key] = value;
      else delete node[key];
    });
  }
  definirLimiteNumerico(
    key: string,
    value: any,
    min?: number,
    integer = false,
    strictPositive = false,
  ) {
    this.error = '';
    if (value === '' || value === null || value === undefined) {
      this.contexto.alterarSchema((root) => {
        delete this.obterCampoSelecionado(root)![key];
      });
      return;
    }
    const n = Number(value);
    if (
      !Number.isFinite(n) ||
      (min !== undefined && n < min) ||
      (integer && !Number.isInteger(n)) ||
      (strictPositive && n <= 0)
    ) {
      this.error = 'Número inválido para ' + key;
      return;
    }
    if ((key === 'minProperties' || key === 'maxProperties') && this.campoSelecionado) {
      const node = this.campoSelecionado,
        required = this.contarPropriedadesObrigatorias(node);
      if (n < required) {
        this.error =
          'O limite não pode ser menor que a quantidade de atributos obrigatórios (' +
          required +
          ').';
        return;
      }
      if (key === 'maxProperties' && n < (node.minProperties ?? required)) {
        this.error = 'O máximo não pode ser menor que o mínimo.';
        return;
      }
      if (key === 'minProperties' && node.maxProperties !== undefined && n > node.maxProperties) {
        this.error = 'O mínimo não pode superar o máximo.';
        return;
      }
    }
    if (key === 'minLength' && n > 0 && this.campoSelecionado?.['x-ui']?.allowEmpty === true) {
      this.error =
        'Desative Permitir texto vazio antes de definir um tamanho mínimo maior que zero.';
      return;
    }
    this.contexto.alterarSchema((root) => {
      this.obterCampoSelecionado(root)![key] = n;
    });
  }
  definirExpressaoRegular(value: string) {
    this.error = '';
    if (value) {
      try {
        new RegExp(value);
      } catch {
        this.error = 'Expressão regular inválida.';
        return;
      }
    }
    this.definirAtributoOpcional('pattern', value);
  }
  contarPropriedadesObrigatorias(node: Schema): number {
    return new Set(node.required || []).size;
  }
  definirAtributoBooleano(key: string, value: boolean) {
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      node[key] = value;
    });
  }
  identificarOpcao(index: number) {
    return index;
  }
  listarValoresPermitidos(node: Schema): { value: any; label: string }[] {
    return (node.enum || []).map((value: any, index: number) => ({
      value,
      label: node['x-enumLabels']?.[index] ?? String(value),
    }));
  }
  obterTextoDoValorPermitido(value: any, _node: Schema): string {
    return value === undefined ? '' : String(value);
  }
  private alterarValoresPermitidos(entries: { value: any; label: string }[]) {
    if (
      entries.some(
        (entry, index) =>
          entries.findIndex((other) => Object.is(other.value, entry.value)) !== index,
      )
    ) {
      this.error = 'Valores duplicados não são permitidos.';
      return;
    }
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (!entries.length) {
        delete node.enum;
        delete node['x-enumLabels'];
        return;
      }
      node.enum = entries.map((entry) => entry.value);
      node['x-enumLabels'] = entries.map((entry) => entry.label || String(entry.value));
    });
  }
  adicionarValorPermitido() {
    const node = this.campoSelecionado!;
    const type = Array.isArray(node.type)
      ? node.type.find((tipo: string) => tipo !== 'null')
      : node.type;
    const entries = this.listarValoresPermitidos(node);
    let value: any = type === 'integer' || type === 'number' ? 0 : '';
    if (type === 'integer' || type === 'number') {
      while (entries.some((entry) => Object.is(entry.value, value))) value++;
    } else {
      let suffix = entries.length + 1;
      value = 'VALOR_' + suffix;
      while (entries.some((entry) => entry.value === value)) value = 'VALOR_' + ++suffix;
    }
    this.alterarValoresPermitidos([...entries, { value, label: String(value) }]);
  }
  atualizarValorPermitido(index: number, kind: 'value' | 'label', text: string) {
    const node = this.campoSelecionado!;
    const entries = this.listarValoresPermitidos(node);
    if (!entries[index]) return;
    try {
      const previous = entries[index];
      entries[index] = {
        ...previous,
        [kind]: kind === 'value' ? converterValorPermitido(text, node) : text,
      };
      if (kind === 'value' && previous.label === String(previous.value))
        entries[index].label = String(entries[index].value);
      this.alterarValoresPermitidos(entries);
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
  }
  removerValorPermitido(index: number) {
    const entries = this.listarValoresPermitidos(this.campoSelecionado!);
    entries.splice(index, 1);
    this.alterarValoresPermitidos(entries);
  }
  obterTextoDosValoresPermitidos(node: Schema): string {
    return Array.isArray(node.enum) ? node.enum.map((v: any) => JSON.stringify(v)).join('\n') : '';
  }
  definirValoresPermitidos(text: string) {
    this.error = '';
    try {
      const values = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      if (
        values.some(
          (v, i) => values.findIndex((other) => JSON.stringify(other) === JSON.stringify(v)) !== i,
        )
      )
        throw new Error('Valores duplicados.');
      this.contexto.alterarSchema((root) => {
        const node = this.obterCampoSelecionado(root)!;
        if (values.length) node.enum = values;
        else delete node.enum;
      });
    } catch (e) {
      this.error = 'Enum inválido: ' + (e instanceof Error ? e.message : String(e));
    }
  }
  obterTextoDasRegrasAvancadas(node: Schema): string {
    const keys = ATRIBUTOS_AVANCADOS;
    return JSON.stringify(
      Object.fromEntries(
        keys
          .filter((key) => Object.prototype.hasOwnProperty.call(node, key))
          .map((key) => [key, node[key]]),
      ),
      null,
      2,
    );
  }
  definirRegrasAvancadas(text: string) {
    this.error = '';
    try {
      const parsed = JSON.parse(text || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Informe um objeto JSON.');
      const keys = ATRIBUTOS_AVANCADOS;
      const unknown = Object.keys(parsed).filter((key) => !keys.includes(key));
      if (unknown.length)
        throw new Error('Atributos não permitidos nesta seção: ' + unknown.join(', '));
      this.contexto.alterarSchema((root) => {
        const node = this.obterCampoSelecionado(root)!;
        for (const key of keys) delete node[key];
        Object.assign(node, parsed);
      });
    } catch (e) {
      this.error = 'Regras avançadas inválidas: ' + (e instanceof Error ? e.message : String(e));
    }
  }
  adicionarComposicao(kind: string) {
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (!Array.isArray(node[kind])) node[kind] = [];
      node[kind].push({ type: 'object', properties: {} });
      this.selectedPath += '/' + kind + '/' + (node[kind].length - 1);
    });
  }
  removerComposicao(kind: string, index: number) {
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (!Array.isArray(node[kind]) || index < 0 || index >= node[kind].length) return;
      node[kind].splice(index, 1);
      if (!node[kind].length) delete node[kind];
    });
  }
  alternarRamoCondicional(kind: string) {
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (node[kind] === undefined) {
        node[kind] = { type: 'object', properties: {} };
        this.selectedPath += '/' + kind;
      } else delete node[kind];
    });
  }
  definirTipo(type: string) {
    this.contexto.alterarSchema((root) => {
      this.obterCampoSelecionado(root)!.type = type;
    });
  }
  permiteTextoVazio(node: Schema): boolean {
    return node['x-ui']?.allowEmpty === true;
  }
  definirPermissaoDeTextoVazio(allowed: boolean) {
    const current = this.campoSelecionado;
    if (
      !current ||
      !(Array.isArray(current.type) ? current.type.includes('string') : current.type === 'string')
    )
      return;
    if (allowed && current.minLength !== undefined && current.minLength > 1) {
      this.error =
        'Para permitir texto vazio, remova ou ajuste primeiro o tamanho mínimo. O JSON Schema não pode exigir ambos sem uma regra alternativa.';
      return;
    }
    if (allowed && current.pattern) {
      this.error = 'Remova primeiro a expressão regular: ela pode impedir o texto vazio.';
      return;
    }
    if (allowed && current.format) {
      this.error = 'Remova primeiro o formato: ele pode impedir o texto vazio.';
      return;
    }
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      node['x-ui'] ??= {};
      node['x-ui'].allowEmpty = allowed;
      if (allowed && node.minLength === 1) delete node.minLength;
      if (
        !allowed &&
        this.caminhoEhObrigatorio(root, this.selectedPath) &&
        (node.minLength === undefined || node.minLength < 1)
      )
        node.minLength = 1;
    });
  }
  private caminhoEhObrigatorio(root: Schema, path: string): boolean {
    const parts = separarCaminho(path),
      name = parts.pop();
    if (parts.pop() !== 'properties' || !name) return false;
    const parent = obterNoSchema(root, '/' + parts.map((part) => escaparSegmento(part)).join('/'));
    return !!parent?.required?.includes(name);
  }
  definirObrigatoriedade(checked: boolean) {
    this.contexto.alterarSchema((root) => {
      const parts = separarCaminho(this.selectedPath),
        name = parts.pop()!;
      if (parts.pop() !== 'properties') return;
      const parent = obterNoSchema(root, '/' + parts.map((p) => escaparSegmento(p)).join('/'));
      if (!parent) return;
      const required = new Set<string>(parent.required || []);
      if (checked) {
        required.add(name);
        const campo = parent.properties?.[name];
        if (
          (Array.isArray(campo?.type) ? campo.type.includes('string') : campo?.type === 'string') &&
          campo['x-ui']?.allowEmpty !== true &&
          campo.minLength === undefined
        )
          campo.minLength = 1;
      } else required.delete(name);
      if (required.size) parent.required = [...required];
      else delete parent.required;
      if (parent.additionalProperties !== false) {
        const count = required.size;
        if (parent.minProperties !== undefined && parent.minProperties < count)
          parent.minProperties = count;
        if (parent.maxProperties !== undefined && parent.maxProperties < count)
          parent.maxProperties = count;
      }
    });
  }
}
