import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { obterTipos, type Schema } from '../../../core/schema/schema-engine';
import { valoresJsonIguais } from '../../../core/schema/json-value';
import { formatarValorAlternativa } from '../alternativas/valores-alternativas';
@Component({
  selector: 'app-valor-condicao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-valor-condicao.component.html',
  styleUrl: './editor-valor-condicao.component.css',
})
export class EditorValorCondicaoComponent {
  @Input() definicao: Schema = {};
  @Input() tipo = 'string';
  @Input() texto = '';
  @Input() valor: unknown;
  @Output() textoAlterado = new EventEmitter<string>();
  @Output() rascunhoAlterado = new EventEmitter<string>();
  @Output() valorAlterado = new EventEmitter<unknown>();
  @Output() tipoAlterado = new EventEmitter<string>();
  readonly formatar = formatarValorAlternativa;
  readonly comparar = valoresJsonIguais;
  get tipos() {
    return obterTipos(this.definicao);
  }
  get opcoes(): unknown[] {
    return this.definicao.enum || [];
  }
  rotulo(tipo: string) {
    return (
      (
        {
          string: 'Texto',
          integer: 'Inteiro',
          number: 'Decimal',
          boolean: 'Sim / Não',
          object: 'Objeto',
          array: 'Lista',
          null: 'Nulo',
        } as Record<string, string>
      )[tipo] || tipo
    );
  }
}
