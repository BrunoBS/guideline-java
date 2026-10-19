import { EditorValorCondicaoComponent } from './editor-valor-condicao.component';
import { EditorExpressaoComponent } from './editor-expressao.component';
import { EditorRestricaoComponent } from './editor-restricao.component';
import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorRegraBase } from '../compartilhado/editor-regra-base';
import { EditorCondicoes } from './edicao-condicoes';

@Component({
  selector: 'app-editor-condicoes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EditorRestricaoComponent,
    EditorExpressaoComponent,
    EditorValorCondicaoComponent,
  ],
  templateUrl: './editor-condicoes.component.html',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents' },
  styleUrls: ['../compartilhado/editor-regra.css'],
})
export class EditorCondicoesComponent extends EditorRegraBase {
  readonly condicoes = new EditorCondicoes(this.contexto);
}
