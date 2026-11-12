import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Schema } from '../../../core/schema/schema-engine';
import {
  criarRestricaoUnificada,
  lerComparacaoUnificada,
  obterTipoDaRestricao,
  RascunhoRestricao,
} from './restricoes-unificadas';
import { OPCOES_COMPARACAO_TEXTO } from './restricoes-texto-condicional';

@Component({
  selector: 'app-editor-restricao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="condition-comparison condition-unified">
      <label
        >Comparação
        <select [(ngModel)]="rascunho.operador" [disabled]="avancada">
          <option value="none">Sem comparação</option>
          <option value="equals">Igual a</option>
          <option value="different">Diferente de</option>
          <ng-container *ngIf="tipo === 'string'">
            <option *ngFor="let opcao of opcoesTexto" [value]="opcao.valor">
              {{ opcao.rotulo }}
            </option>
          </ng-container>
          <option *ngIf="avancada" value="advanced">Comparação avançada preservada</option>
        </select>
      </label>
      <label
        >Valor ou trecho
        <span
          *ngIf="tipo === 'boolean'; else outroValor"
          class="required-switch-label condition-boolean-value"
        >
          <input
            type="checkbox"
            role="switch"
            class="required-switch-input"
            [checked]="rascunho.valor === 'true'"
            [disabled]="valorDesativado"
            (change)="rascunho.valor = $any($event.target).checked ? 'true' : 'false'"
          />
          <span class="required-switch-track" aria-hidden="true"></span>
          <span>{{ rascunho.valor === 'true' ? 'Sim (ligado)' : 'Não (desligado)' }}</span>
        </span>
        <ng-template #outroValor>
          <select
            *ngIf="
              opcoesEnum.length &&
                (rascunho.operador === 'equals' || rascunho.operador === 'different');
              else entradaLivre
            "
            [(ngModel)]="rascunho.valor"
            [disabled]="valorDesativado"
          >
            <option value="" disabled>Selecione um valor</option>
            <option *ngFor="let opcao of opcoesEnum" [value]="opcao.valor">
              {{ opcao.rotulo }}
            </option>
          </select>
          <ng-template #entradaLivre>
            <textarea
              *ngIf="tipo === 'object' || tipo === 'array'; else valorSimples"
              [(ngModel)]="rascunho.valor"
              [disabled]="valorDesativado"
              placeholder="Valor JSON"
            ></textarea>
            <ng-template #valorSimples
              ><input
                [type]="tipo === 'integer' || tipo === 'number' ? 'number' : 'text'"
                [step]="tipo === 'integer' ? '1' : 'any'"
                [ngModel]="rascunho.valor"
                (ngModelChange)="rascunho.valor = $event === null ? '' : '' + $event"
                [disabled]="valorDesativado"
            /></ng-template>
          </ng-template>
        </ng-template>
      </label>
      <p class="builder-help" *ngIf="avancada">
        Comparações importadas combinadas ou avançadas são preservadas. Edite a comparação pela aba
        Para dev.
      </p>
      <p class="builder-error" role="alert" *ngIf="erro">{{ erro }}</p>
      <button type="button" (click)="aplicar()" [disabled]="!schemaEditavel">
        Aplicar restrição
      </button>
    </div>
  `,
})
export class EditorRestricaoComponent implements OnChanges {
  @Input() definicao: Schema | undefined;
  @Input() schema: Schema = {};
  @Input() raiz: Schema = {};
  @Output() alteracao = new EventEmitter<Schema>();
  readonly opcoesTexto = OPCOES_COMPARACAO_TEXTO;
  rascunho: RascunhoRestricao = { operador: 'none', valor: '' };
  tipo = '';
  opcoesEnum: { valor: string; rotulo: string }[] = [];
  avancada = false;
  erro = '';
  get schemaEditavel() {
    return !!this.schema && typeof this.schema === 'object';
  }
  get valorDesativado() {
    return ['none', 'advanced'].includes(this.rascunho.operador);
  }
  ngOnChanges() {
    this.tipo = obterTipoDaRestricao(this.definicao);
    const comparacao = lerComparacaoUnificada(this.schema);
    this.avancada = comparacao.operador === 'advanced';
    this.rascunho = {
      ...comparacao,
      valor: comparacao.valor || (this.tipo === 'boolean' ? 'false' : ''),
    };
    this.opcoesEnum = (this.definicao?.enum || []).map((valor: unknown) => ({
      valor: typeof valor === 'string' ? valor : JSON.stringify(valor),
      rotulo: String(valor),
    }));
    this.erro = '';
  }
  aplicar() {
    this.erro = '';
    if (!this.schemaEditavel) {
      this.erro = 'Schema booleano preservado. Edite pela aba Para Dev.';
      return;
    }
    try {
      this.alteracao.emit(
        criarRestricaoUnificada(this.definicao || {}, this.schema, this.rascunho, this.raiz),
      );
    } catch (erro) {
      this.erro = erro instanceof Error ? erro.message : 'Não foi possível aplicar a restrição.';
    }
  }
}
