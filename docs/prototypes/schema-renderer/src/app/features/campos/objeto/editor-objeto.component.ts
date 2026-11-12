import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorCampoBase } from '../compartilhado/editor-campo-base';

@Component({
  selector: 'app-editor-objeto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-objeto.component.html',
  styles: [':host { display: contents; }'],
})
export class EditorObjetoComponent extends EditorCampoBase {}
