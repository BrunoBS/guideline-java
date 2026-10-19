import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { obterTipoPrincipal, permiteNulo, Schema } from '../../../core/schema/schema-engine';
import { obterExemploDoCampo } from '../../renderer/field/formatacao-campos';

import { CampoBase } from '../compartilhado/campo-base';
@Component({
  selector: 'app-campo-numero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campo-numero.component.html',
  styleUrl: './campo-numero.component.css',
})
export class CampoNumeroComponent extends CampoBase {
  aoEditarNumero(input: HTMLInputElement, s: Schema) {
    const raw = input.value.trim();
    if (raw === '') {
      this.emitirValor(permiteNulo(s) ? null : !this.required ? undefined : undefined);
      return;
    }
    const number = Number(raw);
    if (!Number.isFinite(number)) {
      input.value = String(this.value ?? '');
      return;
    }
    if (obterTipoPrincipal(s) === 'integer' && !Number.isInteger(number)) {
      input.value = String(this.value ?? '');
      return;
    }
    this.emitirValor(number);
  }

  readonly obterExemploDoCampo = obterExemploDoCampo;
}
