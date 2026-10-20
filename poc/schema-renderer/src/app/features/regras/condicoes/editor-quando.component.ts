import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Schema } from '../../../core/schema/schema-engine';
import { valoresJsonIguais } from '../../../core/schema/json-value';
import { obterNoSchema } from '../../builder/estrutura-builder';
import { EditorRegraBase } from '../compartilhado/editor-regra-base';
import { EditorCondicoes } from './edicao-condicoes';
import { EditorExpressaoComponent } from './editor-expressao.component';
import { EditorValorCondicaoComponent } from './editor-valor-condicao.component';

@Component({
  selector: 'app-editor-quando',
  standalone: true,
  imports: [CommonModule, FormsModule, EditorExpressaoComponent, EditorValorCondicaoComponent],
  templateUrl: './editor-quando.component.html',
  styleUrl: './editor-quando.component.css',
})
export class EditorQuandoComponent extends EditorRegraBase implements OnChanges {
  @Input() indice = 0;
  @Output() aplicar = new EventEmitter<Schema>();
  @ViewChild('expressao') expressao?: EditorExpressaoComponent;
  documentoEmEdicao: Schema = {};
  sessaoAtual = 0;
  erroDeEdicao = '';
  private original?: Schema;
  private aplicacaoEnviada?: Schema;
  private caminhoAnterior = '';
  private indiceAnterior = -1;
  readonly edicao = new EditorCondicoes({
    ...this.contexto,
    obterSchema: () => this.documentoEmEdicao,
    alterarSchema: (editar) => {
      const documento = structuredClone(this.documentoEmEdicao);
      editar(documento);
      this.documentoEmEdicao = documento;
      this.erroDeEdicao = '';
    },
    informarErro: (mensagem) => {
      this.erroDeEdicao = mensagem;
    },
  });
  get regra(): Schema | undefined {
    return obterNoSchema(this.documentoEmEdicao, this.caminhoObjeto)?.allOf?.[this.indice];
  }
  get editavel() {
    return (
      !!this.regra &&
      (!this.edicao.condicaoEhAvancada(this.regra) ||
        this.edicao.expressaoCompostaEhGuiada(this.regra))
    );
  }
  ngOnChanges() {
    const atual = obterNoSchema(this.schema, this.caminhoObjeto)?.allOf?.[this.indice]?.if;
    const mesmoContexto =
      this.caminhoAnterior === this.caminhoObjeto && this.indiceAnterior === this.indice;
    if (mesmoContexto && this.aplicacaoEnviada && valoresJsonIguais(this.aplicacaoEnviada, atual)) {
      this.original = structuredClone(atual);
      this.documentoEmEdicao = structuredClone(this.schema);
      this.aplicacaoEnviada = undefined;
      this.erroDeEdicao = '';
      return;
    }
    if (mesmoContexto && this.original && valoresJsonIguais(this.original, atual)) {
      // Atualizar os ramos e os campos de origem sem perder o rascunho do IF.
      const rascunho = this.regra?.if;
      this.documentoEmEdicao = structuredClone(this.schema);
      const regra = this.regra;
      if (regra && rascunho) regra.if = rascunho;
      return;
    }
    this.original = structuredClone(atual);
    this.caminhoAnterior = this.caminhoObjeto;
    this.indiceAnterior = this.indice;
    this.descartar();
  }
  descartar() {
    this.documentoEmEdicao = structuredClone(this.schema);
    this.aplicacaoEnviada = undefined;
    this.erroDeEdicao = '';
    this.edicao.mensagemErro = '';
    this.sessaoAtual++;
  }
  aplicarCondicao() {
    if (!this.editavel || this.edicao.mensagemErro) return;
    try {
      const expressao = this.expressao ? this.expressao.obterExpressaoEditada() : this.regra!.if;
      this.aplicacaoEnviada = structuredClone(expressao);
      this.aplicar.emit(structuredClone(expressao));
      this.erroDeEdicao = '';
    } catch {
      this.erroDeEdicao = 'Revise as comparações indicadas. Nenhuma alteração foi aplicada.';
    }
  }
}
