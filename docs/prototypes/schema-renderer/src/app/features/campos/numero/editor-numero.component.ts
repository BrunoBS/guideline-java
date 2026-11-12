import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorCampoBase } from '../compartilhado/editor-campo-base';

@Component({
  selector: 'app-editor-numero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-numero.component.html',
  styles: [':host { display: contents; }'],
})
export class EditorNumeroComponent extends EditorCampoBase {}
