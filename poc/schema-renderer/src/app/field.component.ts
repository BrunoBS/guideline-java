import {Component,Input,Output,EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Schema,deref,effective,initial,primaryType,isNullable} from './schema-engine';
@Component({selector:'app-field',standalone:true,imports:[CommonModule,FormsModule],template:`
<ng-container *ngIf="resolved as s">
  <fieldset *ngIf="primaryType(s)==='object'||(s.properties && hasProperties(s)); else nonObject">
    <legend>{{s.title||name||'Objeto'}}</legend>
    <div *ngFor="let item of visibleEntries(s);trackBy:trackKey" class="field">
      <app-field [name]="item[0]" [schema]="item[1]" [root]="root" [value]="objectValue?.[item[0]]" [required]="(s.required||[]).includes(item[0])" (valueChange)="updateKey(item[0],$event)"></app-field>
    </div>
  </fieldset>
  <ng-template #nonObject>
    <fieldset *ngIf="primaryType(s)==='array'; else scalar">
      <legend>{{s.title||name||'Lista'}} ({{arrayValue.length}}<ng-container *ngIf="s.maxItems!==undefined"> / {{s.maxItems}}</ng-container>)</legend><p class="muted" *ngIf="s.description">{{s.description}}</p>
      <div *ngFor="let v of arrayValue;index as i;trackBy:trackIndex">
        <app-field [name]="'Item '+(i+1)" [schema]="s.items||{}" [root]="root" [value]="v" (valueChange)="updateItem(i,$event)"></app-field>
        <button type="button" [disabled]="arrayValue.length <= (s.minItems||0)" (click)="remove(i)">Remover</button>
      </div>
      <button type="button" [disabled]="s.maxItems!==undefined && arrayValue.length>=s.maxItems" (click)="add(s.items||{})">+ Adicionar item</button>
<p class="error" *ngIf="s.minItems!==undefined && arrayValue.length<s.minItems">Mínimo de {{s.minItems}} itens.</p>
<p class="error" *ngIf="s.uniqueItems && hasDuplicates()">Os itens devem ser únicos.</p>
    </fieldset>
    <ng-template #scalar>
      <label>{{s.title||name||'Valor'}} {{required?'*':''}}</label>
      <label *ngIf="isNullable(s)" style="display:block;font-weight:normal"><input type="checkbox" style="width:auto" [ngModel]="value===null" (ngModelChange)="setNull($event,s)"/> Valor nulo (null)</label>
      <select *ngIf="(s.enum||s.const!==undefined) && value!==null" [ngModel]="value" (ngModelChange)="emit($event)">
        <option *ngFor="let option of (s.enum||[s.const])" [ngValue]="option">{{option}}</option>
      </select>
      <input *ngIf="!s.enum && s.const===undefined && primaryType(s)==='boolean' && value!==null" type="checkbox" style="width:auto" [ngModel]="value===true" (ngModelChange)="emit($event)"/>
      <input *ngIf="!s.enum && s.const===undefined && (primaryType(s)==='number'||primaryType(s)==='integer') && value!==null" type="text" [attr.inputmode]="primaryType(s)==='integer'?'numeric':'decimal'" [value]="value ?? ''" (input)="filterNumericInput($any($event.target),s)" (change)="numericChanged($any($event.target),s)"/>
      <input *ngIf="!s.enum && s.const===undefined && primaryType(s)!=='boolean' && primaryType(s)!=='number' && primaryType(s)!=='integer' && value!==null" [type]="s.format==='email'?'email':s.format==='date'?'date':'text'" [ngModel]="value" (ngModelChange)="emit($event)"/>
      <div class="muted" *ngIf="s.description">{{s.description}}</div>
    </ng-template>
  </ng-template>
</ng-container>
`})
export class FieldComponent {
 @Input() name='';@Input() schema:Schema={};@Input() root:Schema={};@Input() value:any;@Input() required=false;
 @Output() valueChange=new EventEmitter<any>();
 filterNumericInput(input:HTMLInputElement,s:Schema){
  const integer=primaryType(s)==='integer';
  const before=input.value;
  const filtered=integer
   ? before.replace(/[^0-9+-]/g,'').replace(/(?!^)[+-]/g,'')
   : before.replace(/[^0-9.,+-]/g,'').replace(/(?!^)[+-]/g,'');
  if(before!==filtered)input.value=filtered;
 }

 numericChanged(input:HTMLInputElement,s:Schema){
  const raw=input.value.trim().replace(',', '.');
  if(raw===''){this.emit(isNullable(s)?null:undefined);return;}
  const integer=primaryType(s)==='integer';
  const valid=integer ? /^[+-]?\d+$/ : /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
  if(!valid.test(raw)){input.value=String(this.value??'');return;}
  const n=Number(raw);
  if(!Number.isFinite(n)||(integer&&!Number.isInteger(n))){input.value=String(this.value??'');return;}
  this.emit(n);
 }
 hasProperties(s:Schema){return Object.keys(s.properties||{}).length>0;}
 get resolved(){return effective(this.schema,this.value,this.root);}
 get objectValue():Record<string,any>{return this.value&&typeof this.value==='object'&&!Array.isArray(this.value)?this.value:{};}
 get arrayValue():any[]{return Array.isArray(this.value)?this.value:[];}
 entries(o:Record<string,Schema>):[string,Schema][]{return Object.entries(o);}
 visibleEntries(s:Schema):[string,Schema][]{
  const updating=this.name==='' && Number.isInteger(this.objectValue['version']) && this.objectValue['version']!==null;
  return this.entries(s.properties||{}).filter(([key])=>!updating || (key!=='key' && key!=='microserviceIdentifier'));
 }
 trackKey(_i:number,v:[string,Schema]){return v[0];}
 trackIndex(i:number){return i;}
 primaryType=primaryType;isNullable=isNullable;
 setNull(checked:boolean,s:Schema){if(checked)this.emit(null);else this.emit(initial({...s,type:primaryType(s),default:undefined},this.root));}
 emit(v:any){this.valueChange.emit(v);}
 updateKey(k:string,v:any){
  const next={...this.objectValue,[k]:v};
  if(k==='version' && typeof v==='number' && Number.isInteger(v)){
   delete next.key;delete next.microserviceIdentifier;
  }
  // Changing a discriminator can switch the shape of sibling fields.
  // Reconcile only incompatible values; preserve valid user input.
  const resolved=effective(this.schema,next,this.root);
  for(const [name,rule] of Object.entries(resolved.properties||{})){
   if(!(name in next))continue;
   const kind=primaryType(rule as Schema),current=next[name];
   if(kind==='array'&&!Array.isArray(current))next[name]=initial(rule as Schema,this.root);
   else if(kind==='integer' && (typeof current!=='number'||!Number.isInteger(current)))next[name]=initial(rule as Schema,this.root);
   else if(kind==='number' && typeof current!=='number')next[name]=initial(rule as Schema,this.root);
   else if(kind==='object' && (current===null||typeof current!=='object'||Array.isArray(current)))next[name]=initial(rule as Schema,this.root);
   else if(kind==='string' && current!==null && typeof current!=='string')next[name]=initial(rule as Schema,this.root);
  }
  this.emit(next);
 }
 updateItem(i:number,v:any){const a=[...this.arrayValue];a[i]=v;this.emit(a);}
 add(s:Schema){this.emit([...this.arrayValue,initial(deref(s,this.root),this.root)]);}
 hasDuplicates(){const a=this.arrayValue;return new Set(a.map(v=>JSON.stringify(v))).size!==a.length;}
 remove(i:number){this.emit(this.arrayValue.filter((_,j)=>j!==i));}
}
