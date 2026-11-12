import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Schema } from '../../../core/schema/schema-engine';
import {
  converterValorFormatado,
  obterExemploDoCampo,
  obterTipoDoControle,
  obterValorFormatado,
} from '../../renderer/field/formatacao-campos';

import { CampoBase } from '../compartilhado/campo-base';
@Component({
  selector: 'app-campo-texto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campo-texto.component.html',
  styleUrl: './campo-texto.component.css',
})
export class CampoTextoComponent extends CampoBase {
  readonly obterTipoDoControle = obterTipoDoControle;

  readonly obterExemploDoCampo = obterExemploDoCampo;

  obterValorFormatado(schema: Schema): string {
    return obterValorFormatado(schema, this.value);
  }

  aoEditarValorFormatado(schema: Schema, valor: string) {
    this.emitirValor(converterValorFormatado(schema, valor));
  }
}
