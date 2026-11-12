import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AlteracaoLista } from '../compartilhado/alteracao-campo';
import { EditorCampoBase } from '../compartilhado/editor-campo-base';
import {
  listarOpcoesDaLista,
  obterControleDaLista,
  obterTipoDoItemDaLista,
} from './configuracao-lista';

@Component({
  selector: 'app-editor-lista',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-lista.component.html',
  styles: [':host { display: contents; }'],
})
export class EditorListaComponent extends EditorCampoBase {
  @Output() alteracaoLista = new EventEmitter<AlteracaoLista>();
  readonly obterControleDaLista = obterControleDaLista;
  readonly obterTipoDoItemDaLista = obterTipoDoItemDaLista;
  readonly listarOpcoesDaLista = listarOpcoesDaLista;
  definirTipoDoItemDaLista(tipo: string) {
    this.alteracaoLista.emit({ metodo: 'definirTipoDoItemDaLista', argumentos: [tipo] });
  }
  definirControleDaLista(modo: string) {
    this.alteracaoLista.emit({ metodo: 'definirControleDaLista', argumentos: [modo] });
  }
  atualizarOpcaoDaLista(indice: number, atributo: 'value' | 'label', texto: string) {
    this.alteracaoLista.emit({
      metodo: 'atualizarOpcaoDaLista',
      argumentos: [indice, atributo, texto],
    });
  }
  removerOpcaoDaLista(indice: number) {
    this.alteracaoLista.emit({ metodo: 'removerOpcaoDaLista', argumentos: [indice] });
  }
  adicionarOpcaoDaLista() {
    this.alteracaoLista.emit({ metodo: 'adicionarOpcaoDaLista', argumentos: [] });
  }
}
