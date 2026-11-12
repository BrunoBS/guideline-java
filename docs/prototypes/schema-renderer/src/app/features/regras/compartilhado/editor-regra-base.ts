import { Directive, EventEmitter, Input, Output } from '@angular/core';
import type { Schema } from '../../../core/schema/schema-engine';
import { obterNoSchema } from '../../builder/estrutura-builder';
import { CATALOGO_CAMPOS } from '../../campos/catalogo-campos';
import type { AlteracaoRegra, ContextoRegra } from './contexto-regra';

@Directive()
export abstract class EditorRegraBase {
  @Input({ required: true }) schema: Schema = {};
  @Input() caminhoObjeto = '';
  @Output() alteracao = new EventEmitter<AlteracaoRegra>();
  @Output() erro = new EventEmitter<string>();
  protected readonly contexto: ContextoRegra = {
    obterSchema: () => this.schema,
    obterCaminhoAtivo: () => this.caminhoObjeto,
    obterPaleta: () =>
      CATALOGO_CAMPOS.map((campo) => ({
        type: campo.tipo,
        label: campo.rotulo,
        icon: campo.icone,
      })),
    alterarSchema: (editar) => this.alteracao.emit(editar),
    informarErro: (mensagem) => this.erro.emit(mensagem),
  };
  get camposDisponiveis(): string[] {
    return Object.keys(obterNoSchema(this.schema, this.caminhoObjeto)?.properties || {});
  }
}
