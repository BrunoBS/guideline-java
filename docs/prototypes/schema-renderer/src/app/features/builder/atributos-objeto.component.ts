import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import type { Schema } from '../../core/schema/schema-engine';
import { ehSchemaObjeto, escaparSegmento, obterNoSchema } from './estrutura-builder';
import { CATALOGO_CAMPOS } from '../campos/catalogo-campos';

@Component({
  selector: 'app-atributos-objeto',
  standalone: true,
  imports: [CommonModule, forwardRef(() => AtributosObjetoComponent)],
  templateUrl: './atributos-objeto.component.html',
  styleUrl: './atributos-objeto.component.css',
})
export class AtributosObjetoComponent {
  @Input({ required: true }) schema: Schema = {};
  @Input() caminho = '';
  @Input() titulo = '';
  @Input() selecionado = '';
  @Input() profundidade = 0;
  @Output() editar = new EventEmitter<string>();
  @Output() excluir = new EventEmitter<string>();
  @Output() adicionar = new EventEmitter<{ caminho: string; tipo: string }>();
  @Output() mover = new EventEmitter<{ caminho: string; direcao: number }>();
  readonly tipos = CATALOGO_CAMPOS;
  get objeto(): Schema {
    return obterNoSchema(this.schema, this.caminho) || {};
  }
  get atributos() {
    return Object.entries(this.objeto.properties || {}).map(([nome, schema]) => ({
      nome,
      schema: schema as Schema,
      caminho: this.caminho + '/properties/' + escaparSegmento(nome),
    }));
  }
  readonly identificarAtributo = (_: number, atributo: { caminho: string }) => atributo.caminho;
  caminhoDoObjeto(schema: Schema, caminho: string): string | undefined {
    if (ehSchemaObjeto(schema)) return caminho;
    if (
      schema &&
      (schema.type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'))) &&
      ehSchemaObjeto(schema.items)
    )
      return caminho + '/items';
    return undefined;
  }
  rotuloDoTipo(schema: Schema): string {
    return Array.isArray(schema?.type) ? schema.type.join('|') : schema?.type || 'livre';
  }
}
