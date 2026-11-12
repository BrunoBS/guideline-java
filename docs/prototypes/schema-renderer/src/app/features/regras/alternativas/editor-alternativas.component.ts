import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorRegraBase } from '../compartilhado/editor-regra-base';
import { EditorAlternativas } from './edicao-alternativas';

@Component({
  selector: 'app-editor-alternativas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-alternativas.component.html',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents' },
  styleUrls: ['../compartilhado/editor-regra.css', './editor-alternativas.component.css'],
})
export class EditorAlternativasComponent extends EditorRegraBase {
  readonly alternativas = new EditorAlternativas(this.contexto);
}
