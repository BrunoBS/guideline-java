import {Component,Input,Output,EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Schema,deref,effective,initial} from './schema-engine';
@Component({selector:'app-field',standalone:true,imports:[CommonModule,FormsModule],template:`
<ng-container *ngIf="resolved as s">
  <fieldset *ngIf="s.type==='object'||s.properties; else nonObject">
    <legend>{{s.title||name||'Objeto'}}</legend>
    <div *ngFor="let item of entries(s.properties||{});trackBy:trackKey" class="field">
      <app-field [name]="item[0]" [schema]="item[1]" [root]="root" [value]="objectValue?.[item[0]]" [required]="(s.required||[]).includes(item[0])" (valueChange)="updateKey(item[0],$event)"></app-field>
    </div>
  </fieldset>
  <ng-template #nonObject>
    <fieldset *ngIf="s.type==='array'; else scalar">
      <legend>{{s.title||name||'Lista'}}</legend>
      <div *ngFor="let v of arrayValue;index as i;trackBy:trackIndex">
        <app-field [name]="'Item '+(i+1)" [schema]="s.items||{}" [root]="root" [value]="v" (valueChange)="updateItem(i,$event)"></app-field>
        <button type="button" (click)="remove(i)">Remover</button>
      </div>
      <button type="button" (click)="add(s.items||{})">Adicionar item</button>
    </fieldset>
    <ng-template #scalar>
      <label>{{s.title||name||'Valor'}} {{required?'*':''}}</label>
      <select *ngIf="s.enum||s.const!==undefined" [ngModel]="value" (ngModelChange)="emit($event)">
        <option *ngFor="let option of (s.enum||[s.const])" [ngValue]="option">{{option}}</option>
      </select>
      <input *ngIf="!s.enum && s.const===undefined && s.type==='boolean'" type="checkbox" style="width:auto" [ngModel]="value===true" (ngModelChange)="emit($event)"/>
      <input *ngIf="!s.enum && s.const===undefined && (s.type==='number'||s.type==='integer')" type="number" [step]="s.type==='integer'?1:'any'" [ngModel]="value" (ngModelChange)="emit($event===''?null:+$event)"/>
      <input *ngIf="!s.enum && s.const===undefined && s.type!=='boolean' && s.type!=='number' && s.type!=='integer'" [type]="s.format==='email'?'email':s.format==='date'?'date':'text'" [ngModel]="value" (ngModelChange)="emit($event)"/>
      <div class="muted" *ngIf="s.description">{{s.description}}</div>
    </ng-template>
  </ng-template>
</ng-container>
`})
export class FieldComponent {
 @Input() name='';@Input() schema:Schema={};@Input() root:Schema={};@Input() value:any;@Input() required=false;
 @Output() valueChange=new EventEmitter<any>();
 get resolved(){return effective(this.schema,this.value,this.root);}
 get objectValue():Record<string,any>{return this.value&&typeof this.value==='object'&&!Array.isArray(this.value)?this.value:{};}
 get arrayValue():any[]{return Array.isArray(this.value)?this.value:[];}
 entries(o:Record<string,Schema>):[string,Schema][]{return Object.entries(o);}
 trackKey(_i:number,v:[string,Schema]){return v[0];}
 trackIndex(i:number){return i;}
 emit(v:any){this.valueChange.emit(v);}
 updateKey(k:string,v:any){this.emit({...this.objectValue,[k]:v});}
 updateItem(i:number,v:any){const a=[...this.arrayValue];a[i]=v;this.emit(a);}
 add(s:Schema){this.emit([...this.arrayValue,initial(deref(s,this.root),this.root)]);}
 remove(i:number){this.emit(this.arrayValue.filter((_,j)=>j!==i));}
}
