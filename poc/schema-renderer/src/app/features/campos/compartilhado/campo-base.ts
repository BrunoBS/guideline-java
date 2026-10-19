import { EventEmitter, Input, Output } from '@angular/core';
import {
  criarValorInicial,
  ehSchemaLivre,
  ehSchemaProibido,
  obterTipoPrincipal,
  obterTiposNaoNulos,
  possuiUniaoDeTipos,
  Schema,
  ValidationIssue,
  valorAtendeSchema,
  resolverReferencia,
} from '../../../core/schema/schema-engine';
import { formatarValorJson } from '../../renderer/field/formatacao-campos';

import { Directive } from '@angular/core';

@Directive()
export abstract class CampoBase {
  @Input() name = '';

  @Input() suppressHeading = false;

  @Input() schema: Schema = {};

  @Input() root: Schema = {};

  @Input() value: any;

  @Input() required = false;

  @Input() issues: ValidationIssue[] = [];

  @Input() path = '';

  @Output() valueChange = new EventEmitter<any>();

  get valorObjeto(): Record<string, any> {
    return this.value && typeof this.value === 'object' && !Array.isArray(this.value)
      ? this.value
      : {};
  }

  get valorLista(): any[] {
    return Array.isArray(this.value) ? this.value : [];
  }

  identificarChave(_i: number, item: [string, any]) {
    return item[0];
  }

  identificarIndice(index: number) {
    return index;
  }

  obterTipoPrincipal = obterTipoPrincipal;

  ehSchemaProibido = ehSchemaProibido;

  ehSchemaLivre = ehSchemaLivre;

  possuiUniaoDeTipos = possuiUniaoDeTipos;

  obterTiposNaoNulos = obterTiposNaoNulos;

  exibirControleDeNulo(s: Schema) {
    return this.permiteValorNulo(s) || !this.required;
  }

  valorSemPreenchimento() {
    return this.value === null || (!this.required && this.value === undefined);
  }

  obterEstadoDoValor(): string {
    return this.value === undefined ? 'ausente' : this.value === null ? 'nulo' : 'preenchido';
  }

  permiteValorNulo(s: Schema): boolean {
    return valorAtendeSchema(this.obterSchemaDoControleDeNulo(s), null, this.root);
  }

  permitePreenchimento(s: Schema): boolean {
    const source = this.obterSchemaDoControleDeNulo(s);
    if (source.const === null) return false;
    if (Array.isArray(source.enum) && source.enum.every((valor: unknown) => valor === null))
      return false;
    return (
      source.type !== 'null' &&
      !(Array.isArray(source.type) && source.type.every((tipo: string) => tipo === 'null'))
    );
  }

  alterarEstadoDoValor(estado: string, s: Schema) {
    if (s.readOnly || this.schema.readOnly) return;
    if (estado === 'ausente' && !this.required) this.emitirValor(undefined);
    else if (estado === 'nulo' && this.permiteValorNulo(s)) this.emitirValor(null);
    else if (estado === 'preenchido' && this.permitePreenchimento(s))
      this.emitirValor(this.criarValorInicialNaoNulo(this.obterSchemaDoControleDeNulo(s)));
  }

  obterRotuloDoValorNulo(_s: Schema) {
    return this.value === undefined ? 'Campo opcional sem valor.' : 'Valor definido como null.';
  }

  obterRotuloDoTipo(type: string) {
    return (
      (
        {
          string: 'Texto',
          password: 'Senha',
          integer: 'Inteiro',
          number: 'Número',
          boolean: 'Booleano',
          object: 'Objeto',
          array: 'Lista',
          null: 'Nulo',
        } as Record<string, string>
      )[type] || type
    );
  }

  obterRotuloDaOpcao(schema: Schema, value: any, index: number): string {
    return String(schema['x-enumLabels']?.[index] ?? value);
  }

  protected listarCamposEstruturaisProibidos(option: Schema): Set<string> {
    const not = option.not as any;
    if (!not || typeof not !== 'object') return new Set<string>();
    const clauses = Array.isArray(not.anyOf) ? not.anyOf : [not];
    return new Set<string>(
      clauses
        .filter(
          (clause: any) => clause && Array.isArray(clause.required) && clause.required.length === 1,
        )
        .map((clause: any) => clause.required[0]),
    );
  }

  protected listarAlternativasEstruturais(): Schema[] | null {
    const options = this.schema?.oneOf;
    if (!Array.isArray(options) || options.length < 2) return null;
    if (
      options.some((option: Schema) =>
        Object.values(option.properties || {}).some(
          (property: any) => property?.const !== undefined,
        ),
      )
    )
      return null;
    if (
      !options.every(
        (option: Schema) => Array.isArray(option.required) && option.required.length > 0,
      )
    )
      return null;
    return options;
  }

  private obterSchemaDoControleDeNulo(s: Schema): Schema {
    const base = this.obterSchemaOriginalDoCaminho();
    return base !== undefined ? resolverReferencia(base, this.root) : s;
  }

  private obterSchemaOriginalDoCaminho(): Schema | undefined {
    if (!this.path) return this.schema;
    const parts = this.path
      .split('/')
      .filter(Boolean)
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
    let current: any = this.root;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      if (current.properties?.[part] !== undefined) {
        current = current.properties[part];
        continue;
      }
      return undefined;
    }
    return current as Schema;
  }

  private criarValorInicialNaoNulo(s: Schema) {
    const type = obterTiposNaoNulos(s)[0] || obterTipoPrincipal(s);
    const schemaNaoNulo = Object.fromEntries(
      Object.entries({
        ...s,
        type: type === 'null' && !s.type ? undefined : type,
        default: s.default === null ? undefined : s.default,
        enum: s.enum?.filter((valor: unknown) => valor !== null),
      }).filter(([, valor]) => valor !== undefined),
    );
    return ehSchemaLivre(schemaNaoNulo) && schemaNaoNulo.default === undefined
      ? ''
      : criarValorInicial(schemaNaoNulo, this.root);
  }

  emitirValor(value: any) {
    this.valueChange.emit(value);
  }

  obterCaminhoDaPropriedade(key: string) {
    return `${this.path}/${this.escaparSegmentoJson(key)}`;
  }

  obterCaminhoDoItem(index: number) {
    return `${this.path}/${index}`;
  }

  campoEstaInvalido(path: string) {
    return this.issues.some((issue) => issue.path === this.normalizarCaminho(path));
  }

  obterPrimeiroErro(path: string) {
    return this.issues.find((issue) => issue.path === this.normalizarCaminho(path))?.message || '';
  }

  private normalizarCaminho(path: string) {
    return path || '/';
  }

  private escaparSegmentoJson(value: string) {
    return value.replace(/~/g, '~0').replace(/\//g, '~1');
  }

  readonly formatarValorJson = formatarValorJson;
}
