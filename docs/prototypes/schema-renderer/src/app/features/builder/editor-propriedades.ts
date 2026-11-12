import { planejarRenomeacao } from './renomeacao-documento';
import { compilarValidador } from '../../core/schema/schema-validator';
import {
  verificarEscopoDaManutencao,
  verificarExclusaoReferenciada,
  verificarReferenciasAoNo,
} from './manutencao-referencias';
import type { Schema } from '../../core/schema/schema-engine';
import type { ContextoEditor } from './contexto-editor';
import { obterNoSchema, separarCaminho, escaparSegmento } from './estrutura-builder';

export class EditorPropriedades {
  constructor(private readonly contexto: ContextoEditor) {}
  private get schema() {
    return this.contexto.obterSchema();
  }
  private get selectedPath() {
    return this.contexto.obterCaminhoSelecionado();
  }
  private set selectedPath(caminho: string) {
    this.contexto.selecionarCaminho(caminho);
  }
  private set error(mensagem: string) {
    this.contexto.informarErro(mensagem);
  }
  propertyNameDraft: string | null = null;
  propertyNameError = '';
  aoEditarNomeDaPropriedade(name: string) {
    this.propertyNameDraft = name;
    this.propertyNameError = '';
  }
  validarNomeDaPropriedadeSelecionada() {
    if (this.propertyNameDraft === null) {
      this.propertyNameError = '';
      return true;
    }
    const name = this.propertyNameDraft;
    const parts = separarCaminho(this.selectedPath),
      old = parts.pop() || '';
    if (parts.pop() !== 'properties') return true;
    const parentPath = '/' + parts.map((p) => escaparSegmento(p)).join('/');
    const parent = obterNoSchema(this.schema, parentPath);
    if (!name.trim()) {
      this.propertyNameError = 'Informe o nome da propriedade.';
      return false;
    }
    if (name !== old && Object.prototype.hasOwnProperty.call(parent?.properties || {}, name)) {
      this.propertyNameError = 'Já existe uma propriedade com esse nome.';
      return false;
    }
    if (name !== old && parent) {
      try {
        const editar = planejarRenomeacao(this.schema, this.selectedPath, name);
        const copia = structuredClone(this.schema);
        editar(copia);
        compilarValidador(copia);
        this.propertyNameError = '';
      } catch (erro) {
        this.propertyNameError = (erro as Error).message;
      }
      if (this.propertyNameError) return false;
    }
    this.propertyNameError = '';
    return true;
  }
  confirmarNomeDaPropriedade() {
    if (this.propertyNameDraft === null) return;
    if (!this.validarNomeDaPropriedadeSelecionada()) return;
    const name = this.propertyNameDraft;
    this.propertyNameDraft = null;
    this.renomearPropriedadeSelecionada(name);
  }
  renomearPropriedadeSelecionada(name: string) {
    this.error = '';
    if (!name) {
      this.error = 'Informe o nome da propriedade.';
      return;
    }
    const parts = separarCaminho(this.selectedPath),
      old = parts.pop()!;
    if (parts.pop() !== 'properties' || name === old) return;
    const parentPath = '/' + parts.map((p) => escaparSegmento(p)).join('/');
    const parent = obterNoSchema(this.schema, parentPath);
    if (
      !parent ||
      !Object.hasOwn(parent.properties || {}, old) ||
      Object.prototype.hasOwnProperty.call(parent.properties, name)
    ) {
      this.error = 'Já existe uma propriedade com esse nome.';
      return;
    }
    try {
      const editar = planejarRenomeacao(this.schema, this.selectedPath, name);
      const copia = structuredClone(this.schema);
      editar(copia);
      compilarValidador(copia);
      this.contexto.alterarSchema(editar);
      this.selectedPath =
        (parentPath === '/' ? '' : parentPath) + '/properties/' + escaparSegmento(name);
    } catch (erro) {
      this.error = (erro as Error).message;
    }
  }

  removerCampoSelecionado() {
    if (!this.selectedPath) return;
    const path = this.selectedPath;
    const parts = separarCaminho(path);
    const last = parts.pop()!;
    let parentPath = '';
    let kind = '';
    let key = last;
    if (parts.at(-1) === 'properties') {
      parts.pop();
      kind = 'properties';
    } else if (parts.at(-1) && ['oneOf', 'anyOf', 'allOf'].includes(parts.at(-1)!)) {
      kind = parts.pop()!;
    } else if (parts.at(-1) === '$defs' || parts.at(-1) === 'patternProperties') {
      kind = parts.pop()!;
    } else if (last === 'items') kind = 'items';
    else if (last === 'additionalProperties') kind = 'additionalProperties';
    else if (['if', 'then', 'else'].includes(last)) kind = 'conditional';
    else {
      this.error = 'Não é possível excluir este nó.';
      return;
    }
    parentPath = parts.length ? '/' + parts.map((p) => escaparSegmento(p)).join('/') : '';
    const objeto = obterNoSchema(this.schema, parentPath);
    const caminhoVerificado = ['oneOf', 'anyOf', 'allOf'].includes(kind)
      ? parentPath + '/' + kind
      : path;
    const erro =
      (kind === 'properties' && verificarEscopoDaManutencao(this.schema, path)) ||
      (kind === 'properties' && objeto
        ? verificarExclusaoReferenciada(this.schema, objeto, key, path)
        : verificarReferenciasAoNo(this.schema, caminhoVerificado));
    if (erro) {
      this.error = erro;
      return;
    }
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const parent = obterNoSchema(root, parentPath);
      if (!parent) return;
      if (kind === 'properties') {
        delete parent.properties?.[key];

        if (parent.required) {
          parent.required = parent.required.filter((x: string) => x !== key);
          if (!parent.required.length) delete parent.required;
        }
      } else if (kind === 'items') delete parent.items;
      else if (kind === 'conditional') delete parent[key];
      else if (kind === 'additionalProperties') parent.additionalProperties = true;
      else if (kind === '$defs' || kind === 'patternProperties') {
        delete parent[kind]?.[key];
        if (parent[kind] && !Object.keys(parent[kind]).length) delete parent[kind];
      } else if (Array.isArray(parent[kind])) {
        parent[kind].splice(Number(key), 1);
        if (!parent[kind].length) delete parent[kind];
      }
      this.selectedPath = parentPath;
    });
  }
}
