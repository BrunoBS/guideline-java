import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CampoBase } from '../compartilhado/campo-base';
@Component({
  selector: 'app-campo-booleano',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campo-booleano.component.html',
  styleUrl: './campo-booleano.component.css',
})
export class CampoBooleanoComponent extends CampoBase {}
