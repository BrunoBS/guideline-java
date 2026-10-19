import { campoVisivelNaCondicao } from './visibilidade-condicional';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  criarValorInicial,
  ehSchemaLivre,
  ehSchemaProibido,
  obterSchemaDaPropriedade,
  obterTipoDoValor,
  obterTipoPrincipal,
  Schema,
  validarNomeDaPropriedade,
} from '../../../core/schema/schema-engine';

import { TemplateRef } from '@angular/core';
import { CampoBase } from '../compartilhado/campo-base';
import type { ContextoCampoFilho } from '../compartilhado/contexto-campo-filho';
@Component({
  selector: 'app-campo-objeto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campo-objeto.component.html',
  styleUrl: './campo-objeto.component.css',
})
export class CampoObjetoComponent extends CampoBase {
  @Input({ required: true }) apresentacao: Schema = {};
  @Input({ required: true }) resolvido: Schema = {};
  @Input({ required: true }) renderizarFilho!: TemplateRef<ContextoCampoFilho>;
  get v() {
    return this.apresentacao;
  }
  get s() {
    return this.resolvido;
  }
  @Input() indiceAlternativa = 0;
  obterIndiceDaAlternativaAtiva() {
    return this.indiceAlternativa;
  }

  private dynamicChosenTypes: Record<string, string> = {};

  private dynamicJsonDraftValues: Record<string, string> = {};

  private dynamicJsonErrors: Record<string, string> = {};

  private readonly jsonTypes = [
    'string',
    'password',
    'integer',
    'number',
    'boolean',
    'object',
    'array',
  ];

  campoEstaVisivel(key: string): boolean {
    const structural = this.listarAlternativasEstruturais();
    if (structural) {
      const selected = structural[this.obterIndiceDaAlternativaAtiva()];
      if (selected) {
        const keys = new Set<string>([
          ...(selected.required || []),
          ...Object.keys(selected.properties || {}),
        ]);
        const forbidden = this.listarCamposEstruturaisProibidos(selected);
        if (forbidden.has(key)) return false;
        const variantKeys = new Set<string>();
        for (const option of structural) {
          for (const field of option.required || []) variantKeys.add(field);
          for (const field of this.listarCamposEstruturaisProibidos(option)) variantKeys.add(field);
        }
        if (variantKeys.has(key)) return keys.has(key);
      }
    }
    return campoVisivelNaCondicao(this.schema, key, this.valorObjeto, this.root);
  }

  get quantidadeDePropriedades() {
    return Object.keys(this.valorObjeto).length;
  }

  listarGruposVisuais(
    s: Schema,
  ): { id: string; title: string; description?: string; fields: string[] }[] {
    const groups = s['x-ui']?.groups;
    return Array.isArray(groups) ? groups.filter((g: any) => g && Array.isArray(g.fields)) : [];
  }

  listarCamposVisiveisSemGrupo(s: Schema): [string, any][] {
    return this.listarCamposSemGrupo(s).filter(([key]) => this.campoEstaVisivel(key));
  }

  listarCamposSemGrupo(s: Schema): [string, any][] {
    const assigned = new Set(this.listarGruposVisuais(s).flatMap((g) => g.fields));
    return Object.entries(s.properties || {}).filter(([key]) => !assigned.has(key));
  }

  listarEntradas(object: Record<string, any>): [string, any][] {
    return Object.entries(object || {});
  }

  possuiPropriedadesDinamicas(s: Schema) {
    return (
      !!s.patternProperties ||
      s.additionalProperties === true ||
      (s.additionalProperties && typeof s.additionalProperties === 'object') ||
      s.unevaluatedProperties === true ||
      (s.unevaluatedProperties && typeof s.unevaluatedProperties === 'object')
    );
  }

  descreverPropriedadesDinamicas(s: Schema) {
    if (s.patternProperties && s.additionalProperties === false)
      return 'Atributos extras devem corresponder aos padrões definidos em patternProperties.';
    if (s.unevaluatedProperties !== undefined)
      return 'Atributos extras seguem as regras de patternProperties/additionalProperties e unevaluatedProperties.';
    if (s.patternProperties)
      return 'Atributos extras podem usar patternProperties e additionalProperties.';
    return 'Atributos extras permitidos por additionalProperties.';
  }

  listarPropriedadesDinamicas(s: Schema): [string, any][] {
    const fixed = new Set(Object.keys(s.properties || {}));
    return Object.entries(this.valorObjeto).filter(([key]) => !fixed.has(key));
  }

  obterSchemaDinamico(s: Schema, key: string) {
    return obterSchemaDaPropriedade(s, key, this.root);
  }

  private listarTiposDinamicosDeclarados(schema: Schema): string[] {
    return Array.isArray(schema.type)
      ? schema.type
      : typeof schema.type === 'string'
        ? [schema.type]
        : [];
  }

  listarTiposDinamicos(s: Schema, key: string): string[] {
    const schema = this.obterSchemaDinamico(s, key),
      declared = this.listarTiposDinamicosDeclarados(schema);
    if (declared.length) return declared.filter((type) => type !== 'null');
    if (ehSchemaLivre(schema)) return [...this.jsonTypes];
    const inferred = obterTipoPrincipal(schema);
    return inferred && inferred !== 'null' ? [inferred] : [];
  }

  propriedadeDinamicaPermiteNulo(s: Schema, key: string): boolean {
    const schema = this.obterSchemaDinamico(s, key),
      declared = this.listarTiposDinamicosDeclarados(schema);
    if (declared.length) return declared.includes('null');
    return ehSchemaLivre(schema);
  }

  obterTipoDinamicoAtivo(s: Schema, key: string, value: any): string {
    const options = this.listarTiposDinamicos(s, key),
      chosen = this.dynamicChosenTypes[key];
    if (chosen && options.includes(chosen)) return chosen;
    const current = obterTipoDoValor(value);
    if (options.includes(current)) return current;
    if (current === 'integer' && options.includes('number') && !options.includes('integer'))
      return 'number';
    return (
      options[0] || (value === null ? 'null' : obterTipoPrincipal(this.obterSchemaDinamico(s, key)))
    );
  }

  obterSchemaDoValorDinamico(s: Schema, key: string, value: any): Schema {
    const base = this.obterSchemaDinamico(s, key),
      type = this.obterTipoDinamicoAtivo(s, key, value);
    if (value === null) return { type: 'null' };
    const declared = this.listarTiposDinamicosDeclarados(base);
    if (!declared.length && ehSchemaLivre(base))
      return type === 'password' ? { type: 'string', format: 'password' } : { type };
    const options = this.listarTiposDinamicos(s, key);
    if (options.length <= 1) return base;
    return { ...base, type };
  }

  private ehListaIrrestrita(schema: Schema): boolean {
    return (
      obterTipoPrincipal(schema) === 'array' &&
      schema.items === undefined &&
      !schema.prefixItems &&
      !schema.contains &&
      schema.minItems === undefined &&
      schema.maxItems === undefined &&
      schema.uniqueItems === undefined
    );
  }

  ehEstruturaJsonDinamica(s: Schema, key: string, value: any): boolean {
    if (value === null) return false;
    const type = this.obterTipoDinamicoAtivo(s, key, value),
      schema = this.obterSchemaDoValorDinamico(s, key, value);
    if (type === 'object') return ehSchemaLivre(schema);
    if (type === 'array') return this.ehListaIrrestrita(schema);
    return false;
  }

  alterarTipoDinamico(s: Schema, key: string, type: string) {
    const base = this.obterSchemaDinamico(s, key);
    this.dynamicChosenTypes[key] = type;
    delete this.dynamicJsonDraftValues[key];
    delete this.dynamicJsonErrors[key];
    const selected: Schema =
      type === 'password'
        ? { type: 'string', format: 'password' }
        : this.listarTiposDinamicosDeclarados(base).length
          ? { ...base, type }
          : { type };
    let next: any;
    if (type === 'object' && ehSchemaLivre(selected)) next = {};
    else if (type === 'array' && this.ehListaIrrestrita(selected)) next = [];
    else next = criarValorInicial(selected, this.root);
    this.atualizarValorDinamico(key, next);
  }

  definirPropriedadeDinamicaNula(s: Schema, key: string, checked: boolean) {
    if (!this.propriedadeDinamicaPermiteNulo(s, key)) return;
    delete this.dynamicJsonDraftValues[key];
    delete this.dynamicJsonErrors[key];
    if (checked) {
      this.atualizarValorDinamico(key, null);
      return;
    }
    const options = this.listarTiposDinamicos(s, key),
      type =
        this.dynamicChosenTypes[key] && options.includes(this.dynamicChosenTypes[key])
          ? this.dynamicChosenTypes[key]
          : options[0];
    if (!type) {
      this.atualizarValorDinamico(key, null);
      return;
    }
    this.dynamicChosenTypes[key] = type;
    const base = this.obterSchemaDinamico(s, key),
      selected: Schema = this.listarTiposDinamicosDeclarados(base).length
        ? { ...base, type }
        : { type };
    const next =
      type === 'object' && ehSchemaLivre(selected)
        ? {}
        : type === 'array' && this.ehListaIrrestrita(selected)
          ? []
          : criarValorInicial(selected, this.root);
    this.atualizarValorDinamico(key, next);
  }

  obterTextoJsonDinamico(s: Schema, key: string, value: any): string {
    if (Object.prototype.hasOwnProperty.call(this.dynamicJsonDraftValues, key))
      return this.dynamicJsonDraftValues[key];
    const type = this.obterTipoDinamicoAtivo(s, key, value);
    if (type === 'array') return this.formatarValorJson(Array.isArray(value) ? value : []);
    return this.formatarValorJson(
      value && typeof value === 'object' && !Array.isArray(value) ? value : {},
    );
  }

  obterErroJsonDinamico(key: string) {
    return this.dynamicJsonErrors[key] || '';
  }

  private validarEstruturaDinamica(s: Schema, key: string, text: string): any {
    const parsed = JSON.parse(text),
      type = this.obterTipoDinamicoAtivo(s, key, this.valorObjeto[key]);
    if (type === 'array' && !Array.isArray(parsed))
      throw new Error('O valor deve ser uma lista JSON.');
    if (type === 'object' && (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)))
      throw new Error('O valor deve ser um objeto JSON.');
    return parsed;
  }

  aoEditarJsonDinamico(s: Schema, key: string, text: string) {
    this.dynamicJsonDraftValues[key] = text;
    try {
      const parsed = this.validarEstruturaDinamica(s, key, text);
      this.dynamicJsonErrors[key] = '';
      this.atualizarValorDinamico(key, parsed);
    } catch (error) {
      this.dynamicJsonErrors[key] = error instanceof Error ? error.message : 'JSON inválido.';
    }
  }

  formatarJsonDinamico(s: Schema, key: string, value: any) {
    const source = this.obterTextoJsonDinamico(s, key, value);
    try {
      const parsed = this.validarEstruturaDinamica(s, key, source);
      this.dynamicJsonDraftValues[key] = JSON.stringify(parsed, null, 2);
      this.dynamicJsonErrors[key] = '';
      this.atualizarValorDinamico(key, parsed);
    } catch (error) {
      this.dynamicJsonErrors[key] = error instanceof Error ? error.message : 'JSON inválido.';
    }
  }

  obterExemploJsonDinamico(s: Schema, key: string, value: any) {
    return this.obterTipoDinamicoAtivo(s, key, value) === 'array'
      ? '[\n  "valor"\n]'
      : '{\n  "chave": "valor"\n}';
  }

  obterErroDaChave(s: Schema, key: string) {
    const propertyIssue = validarNomeDaPropriedade(s, key, this.root);
    if (propertyIssue) return propertyIssue;
    const dynamic = obterSchemaDaPropriedade(s, key, this.root);
    return ehSchemaProibido(dynamic) ? 'Esta chave não é permitida pelo schema.' : '';
  }

  atualizarPropriedade(key: string, value: any) {
    const next = { ...this.valorObjeto };
    if (value === undefined) delete next[key];
    else next[key] = value;
    this.emitirValor(next);
  }

  atualizarValorDinamico(key: string, value: any) {
    const next = { ...this.valorObjeto };
    if (value === undefined) delete next[key];
    else next[key] = value;
    this.emitirValor(next);
  }

  renomearChaveDinamica(s: Schema, oldKey: string, newKey: string) {
    const key = newKey.trim();
    if (!key || key === oldKey || key in this.valorObjeto || key in (s.properties || {})) return;
    const next: Record<string, any> = {};
    for (const [current, value] of Object.entries(this.valorObjeto))
      next[current === oldKey ? key : current] = value;
    if (this.dynamicChosenTypes[oldKey]) {
      this.dynamicChosenTypes[key] = this.dynamicChosenTypes[oldKey];
      delete this.dynamicChosenTypes[oldKey];
    }
    if (Object.prototype.hasOwnProperty.call(this.dynamicJsonDraftValues, oldKey)) {
      this.dynamicJsonDraftValues[key] = this.dynamicJsonDraftValues[oldKey];
      delete this.dynamicJsonDraftValues[oldKey];
    }
    if (Object.prototype.hasOwnProperty.call(this.dynamicJsonErrors, oldKey)) {
      this.dynamicJsonErrors[key] = this.dynamicJsonErrors[oldKey];
      delete this.dynamicJsonErrors[oldKey];
    }
    this.emitirValor(next);
  }

  removerChaveDinamica(s: Schema, key: string) {
    if (key in (s.properties || {}) || !this.podeRemoverPropriedade(s)) return;
    const next = { ...this.valorObjeto };
    delete next[key];
    delete this.dynamicChosenTypes[key];
    delete this.dynamicJsonDraftValues[key];
    delete this.dynamicJsonErrors[key];
    this.emitirValor(next);
  }

  private gerarChaveDinamica(s: Schema): string | undefined {
    const patterns = Object.keys(s.patternProperties || {});
    const prefixes = patterns.map((pattern) => {
      if (!pattern.startsWith('^')) return '';
      const match = pattern.slice(1).match(/^(?:[a-zA-Z0-9_-]|\\[.\\-])+/);
      return match ? match[0].replace(/\\([.\\-])/g, '$1') : '';
    });
    const bases = [...prefixes.filter(Boolean).map((prefix) => prefix + 'key'), 'key'];
    for (const base of bases) {
      for (let index = 0; index < 1000; index++) {
        const key = index === 0 ? base : `${base}${index + 1}`;
        if (key in this.valorObjeto || key in (s.properties || {})) continue;
        if (validarNomeDaPropriedade(s, key, this.root)) continue;
        if (ehSchemaProibido(obterSchemaDaPropriedade(s, key, this.root))) continue;
        return key;
      }
    }
    return undefined;
  }

  adicionarPropriedadeDinamica(s: Schema) {
    if (!this.podeAdicionarPropriedade(s)) return;
    const key = this.gerarChaveDinamica(s);
    if (!key) return;
    const child = obterSchemaDaPropriedade(s, key, this.root),
      types = this.listarTiposDinamicos(s, key),
      type = types[0];
    if (!type && this.propriedadeDinamicaPermiteNulo(s, key)) {
      this.emitirValor({ ...this.valorObjeto, [key]: null });
      return;
    }
    if (type) this.dynamicChosenTypes[key] = type;
    const selected: Schema =
      type === 'password'
        ? { type: 'string', format: 'password' }
        : this.listarTiposDinamicosDeclarados(child).length && type
          ? { ...child, type }
          : type
            ? { type }
            : child;
    const next =
      type === 'object' && ehSchemaLivre(selected)
        ? {}
        : type === 'array' && this.ehListaIrrestrita(selected)
          ? []
          : criarValorInicial(selected, this.root);
    this.emitirValor({ ...this.valorObjeto, [key]: next });
  }

  podeAdicionarPropriedade(s: Schema) {
    return s.maxProperties === undefined || this.quantidadeDePropriedades < s.maxProperties;
  }

  podeRemoverPropriedade(s: Schema) {
    return s.minProperties === undefined || this.quantidadeDePropriedades > s.minProperties;
  }

  criarCampoDaPropriedade(v: Schema, chave: string): ContextoCampoFilho {
    return {
      $implicit: {
        schema: v.properties[chave],
        value: this.valorObjeto[chave],
        name: chave,
        required: (v.required || []).includes(chave),
        path: this.obterCaminhoDaPropriedade(chave),
        suppressHeading: false,
        aoAlterarValor: (valor) => this.atualizarPropriedade(chave, valor),
      },
    };
  }
  criarCampoDinamico(v: Schema, chave: string, valor: any): ContextoCampoFilho {
    return {
      $implicit: {
        schema: this.obterSchemaDoValorDinamico(v, chave, valor),
        value: valor,
        name: 'Valor',
        required: true,
        path: this.obterCaminhoDaPropriedade(chave),
        suppressHeading: false,
        aoAlterarValor: (valor) => this.atualizarValorDinamico(chave, valor),
      },
    };
  }
}
