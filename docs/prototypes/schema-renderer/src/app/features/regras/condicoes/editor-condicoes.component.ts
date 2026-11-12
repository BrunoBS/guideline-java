import { EditorQuandoComponent } from './editor-quando.component';
import { EditorRestricaoComponent } from './editor-restricao.component';
import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorRegraBase } from '../compartilhado/editor-regra-base';
import { EditorCondicoes } from './edicao-condicoes';

@Component({
  selector: 'app-editor-condicoes',
  standalone: true,
  imports: [EditorQuandoComponent, CommonModule, FormsModule, EditorRestricaoComponent],
  templateUrl: './editor-condicoes.component.html',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents' },
  styleUrls: ['../compartilhado/editor-regra.css'],
})
export class EditorCondicoesComponent extends EditorRegraBase {
  private identidades: number[] = [];
  private proximaIdentidade = 0;
  readonly identificarRegra = (_: number, regra: { index: number }) =>
    (this.identidades[regra.index] ??= this.proximaIdentidade++);
  removerCondicao(indice: number) {
    this.identidades.splice(indice, 1);
    this.condicoes.removerCondicao(indice);
  }

  readonly condicoes = new EditorCondicoes(this.contexto);
}
