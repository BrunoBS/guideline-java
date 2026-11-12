import { Directive, EventEmitter, Input, Output } from '@angular/core';
import type { Schema } from '../../../core/schema/schema-engine';
import type { EditorValidacoes } from '../../builder/editor-validacoes';
import { ehSchemaObjeto } from '../../builder/estrutura-builder';
import type { AlteracaoCampo } from './alteracao-campo';

/** Editores exibem o schema e emitem intenções; não modificam a sessão. */
@Directive()
export abstract class EditorCampoBase {
  @Input({ required: true }) schema: Schema = {};
  @Output() alteracao = new EventEmitter<AlteracaoCampo>();
  get node() {
    return this.schema;
  }
  readonly ehSchemaObjeto = ehSchemaObjeto;
  readonly validacoes = {
    definirLimiteNumerico: (...argumentos: Parameters<EditorValidacoes['definirLimiteNumerico']>) =>
      this.alteracao.emit({ metodo: 'definirLimiteNumerico', argumentos }),
    definirAtributoOpcional: (
      ...argumentos: Parameters<EditorValidacoes['definirAtributoOpcional']>
    ) => this.alteracao.emit({ metodo: 'definirAtributoOpcional', argumentos }),
    definirExpressaoRegular: (
      ...argumentos: Parameters<EditorValidacoes['definirExpressaoRegular']>
    ) => this.alteracao.emit({ metodo: 'definirExpressaoRegular', argumentos }),
    definirPermissaoDeTextoVazio: (
      ...argumentos: Parameters<EditorValidacoes['definirPermissaoDeTextoVazio']>
    ) => this.alteracao.emit({ metodo: 'definirPermissaoDeTextoVazio', argumentos }),
    definirAtributoBooleano: (
      ...argumentos: Parameters<EditorValidacoes['definirAtributoBooleano']>
    ) => this.alteracao.emit({ metodo: 'definirAtributoBooleano', argumentos }),
    contarPropriedadesObrigatorias: (schema: Schema): number => new Set(schema.required || []).size,
    permiteTextoVazio: (schema: Schema): boolean => schema['x-ui']?.allowEmpty === true,
    identificarOpcao: (indice: number): number => indice,
  };
}
