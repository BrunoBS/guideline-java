import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorCampoBase } from '../compartilhado/editor-campo-base';

@Component({
  selector: 'app-editor-booleano',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-booleano.component.html',
  styles: [':host { display: contents; }'],
})
export class EditorBooleanoComponent extends EditorCampoBase {}
