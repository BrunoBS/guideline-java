import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorCampoBase } from '../compartilhado/editor-campo-base';

@Component({
  selector: 'app-editor-texto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-texto.component.html',
  styles: [':host { display: contents; }'],
})
export class EditorTextoComponent extends EditorCampoBase {
  @Input() secao: 'propriedade' | 'validacao' = 'validacao';
  readonly formats = [
    'email',
    'uri',
    'uuid',
    'date',
    'date-time',
    'time',
    'hostname',
    'ipv4',
    'ipv6',
    'password',
    'regex',
  ];
}
