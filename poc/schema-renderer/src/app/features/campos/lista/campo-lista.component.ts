import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  criarValorInicial,
  ehSchemaProibido,
  obterSchemaDoItem,
  Schema,
  valorAtendeSchema,
} from '../../../core/schema/schema-engine';

import { TemplateRef } from '@angular/core';
import { CampoBase } from '../compartilhado/campo-base';
import type { ContextoCampoFilho } from '../compartilhado/contexto-campo-filho';
@Component({
  selector: 'app-campo-lista',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campo-lista.component.html',
  styleUrl: './campo-lista.component.css',
})
export class CampoListaComponent extends CampoBase {
  @Input({ required: true }) apresentacao: Schema = {};
  @Input({ required: true }) resolvido: Schema = {};
  @Input({ required: true }) renderizarFilho!: TemplateRef<ContextoCampoFilho>;
  get v() {
    return this.apresentacao;
  }
  get s() {
    return this.resolvido;
  }

  multiSearch = '';

  obterControleDaLista(s: Schema): string {
    return s['x-ui']?.widget || 'list';
  }

  obterRotuloDaOpcaoMultipla(s: Schema, option: any): string {
    return String(
      (s['x-ui']?.options || []).find((entry: any) => Object.is(entry.value, option))?.label ??
        option,
    );
  }

  filtrarOpcoesMultiplas(s: Schema): any[] {
    const options = this.listarOpcoesMultiplas(s);
    return this.obterControleDaLista(s) === 'multiselect' && this.multiSearch
      ? options.filter((option) =>
          this.obterRotuloDaOpcaoMultipla(s, option)
            .toLowerCase()
            .includes(this.multiSearch.toLowerCase()),
        )
      : options;
  }

  ehSelecaoMultipla(s: Schema) {
    const item = obterSchemaDoItem(s, 0, this.root);
    return (
      !s.prefixItems &&
      this.obterControleDaLista(s) !== 'list' &&
      Array.isArray(item.enum) &&
      item.enum.length > 0
    );
  }

  listarOpcoesMultiplas(s: Schema): any[] {
    return obterSchemaDoItem(s, 0, this.root).enum || [];
  }

  opcaoEstaSelecionada(option: any) {
    return this.valorLista.some((value) => Object.is(value, option));
  }

  opcaoEstaDesabilitada(s: Schema, option: any) {
    return (
      !this.opcaoEstaSelecionada(option) &&
      s.maxItems !== undefined &&
      this.valorLista.length >= s.maxItems
    );
  }

  alternarSelecaoMultipla(option: any, checked: boolean) {
    const selected = this.valorLista.filter((value) => !Object.is(value, option));
    const next = checked ? [...selected, option] : selected;
    this.emitirValor(next);
  }

  obterSchemaDoItemDaLista(s: Schema, index: number) {
    return obterSchemaDoItem(s, index, this.root);
  }

  possuiTupla(s: Schema) {
    return Array.isArray(s.prefixItems) && s.prefixItems.length > 0;
  }

  podeAdicionarItem(s: Schema) {
    if (s.maxItems !== undefined && this.valorLista.length >= s.maxItems) return false;
    return !ehSchemaProibido(obterSchemaDoItem(s, this.valorLista.length, this.root));
  }

  adicionarItem(s: Schema) {
    if (!this.podeAdicionarItem(s)) return;
    this.emitirValor([
      ...this.valorLista,
      criarValorInicial(obterSchemaDoItem(s, this.valorLista.length, this.root), this.root),
    ]);
  }

  atualizarItem(index: number, value: any) {
    const next = [...this.valorLista];
    next[index] = value;
    this.emitirValor(next);
  }

  removerItem(index: number) {
    this.emitirValor(this.valorLista.filter((_, current) => current !== index));
  }

  moverItem(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= this.valorLista.length) return;
    const next = [...this.valorLista];
    [next[index], next[target]] = [next[target], next[index]];
    this.emitirValor(next);
  }

  possuiItensDuplicados() {
    return (
      new Set(this.valorLista.map((value) => JSON.stringify(value))).size !== this.valorLista.length
    );
  }

  itemAtendeRegraContains(s: Schema, item: any) {
    return !!s.contains && valorAtendeSchema(s.contains, item, this.root);
  }

  criarCampoDoItem(v: Schema, indice: number, valor: any): ContextoCampoFilho {
    return {
      $implicit: {
        schema: this.obterSchemaDoItemDaLista(v, indice),
        value: valor,
        name: 'Item ' + (indice + 1),
        required: true,
        path: this.obterCaminhoDoItem(indice),
        suppressHeading: true,
        aoAlterarValor: (valor) => this.atualizarItem(indice, valor),
      },
    };
  }
}
