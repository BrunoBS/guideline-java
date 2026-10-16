import {Component,Input,Output,EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Schema,ValidationIssue,deref,effective,initial,primaryType,isNullable,reconcileValue} from './schema-engine';
@Component({selector:'app-field',standalone:true,imports:[CommonModule,FormsModule],template:`
<ng-container *ngIf="resolved as s">
  <fieldset *ngIf="primaryType(s)==='object'||(s.properties && hasProperties(s)); else nonObject">
    <legend>{{s.title||name||'Objeto'}}</legend>
    <div class="container-nullable-row" *ngIf="isNullable(s)">
      <label class="nullable-toggle" title="Definir como nulo">
        <span>Definir como nulo</span>
        <input type="checkbox" [checked]="value===null" (change)="setNull($any($event.target).checked,s)" />
        <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
      </label>
    </div>

    <ng-container *ngIf="value!==null; else nullObjectState">
      <ng-container *ngIf="hasDictionary(s); else regularObject">
        <p class="muted" *ngIf="s.description">{{s.description}}</p>
        <div *ngFor="let item of dictionaryEntries();trackBy:trackKey" class="array-item map-item">
          <div class="map-key">
            <label>Chave</label>
            <input type="text" [value]="item[0]" (change)="renameAdditionalKey(s,item[0],$any($event.target).value)" />
          </div>
          <div class="map-value">
            <app-field [name]="'Valor'" [schema]="dictionarySchema(s)" [root]="root" [value]="item[1]" [issues]="issues" [path]="childPath(item[0])" (valueChange)="updateMapValue(item[0],$event)"></app-field>
          </div>
          <div class="array-item-actions"><button type="button" class="secondary danger" (click)="removeAdditionalKey(s,item[0])">Remover</button></div>
        </div>
        <div class="array-footer-actions"><span></span><button type="button" (click)="addMapEntry(s)">+ Adicionar campo</button></div>
        <p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
      </ng-container>

      <ng-template #regularObject>
        <p class="muted" *ngIf="s.description">{{s.description}}</p>
        <div *ngFor="let item of visibleEntries(s);trackBy:trackKey" class="field">
          <app-field [name]="item[0]" [schema]="item[1]" [root]="root" [value]="objectValue?.[item[0]]" [required]="(s.required||[]).includes(item[0])" [issues]="issues" [path]="childPath(item[0])" (valueChange)="updateKey(item[0],$event)"></app-field>
        </div>

        <section class="additional-properties-section" *ngIf="hasHybridAdditionalProperties(s)">
          <div class="additional-properties-heading">
            <div>
              <strong>Campos adicionais</strong>
              <div class="muted">Atributos extras permitidos por additionalProperties.</div>
            </div>
          </div>
          <div *ngFor="let item of additionalEntries(s);trackBy:trackKey" class="array-item map-item">
            <div class="map-key">
              <label>Chave</label>
              <input type="text" [value]="item[0]" (change)="renameAdditionalKey(s,item[0],$any($event.target).value)" />
            </div>
            <div class="map-value">
              <app-field [name]="'Valor'" [schema]="dictionarySchema(s)" [root]="root" [value]="item[1]" [issues]="issues" [path]="childPath(item[0])" (valueChange)="updateMapValue(item[0],$event)"></app-field>
            </div>
            <div class="array-item-actions"><button type="button" class="secondary danger" (click)="removeAdditionalKey(s,item[0])">Remover</button></div>
          </div>
          <div class="array-footer-actions"><span></span><button type="button" (click)="addMapEntry(s)">+ Adicionar campo</button></div>
        </section>
      </ng-template>
    </ng-container>
    <ng-template #nullObjectState><div class="null-value-state">Valor definido como <code>null</code>.</div></ng-template>
  </fieldset>
  <ng-template #nonObject>
    <fieldset *ngIf="primaryType(s)==='array'; else scalar" [class.invalid-fieldset]="isInvalid(path)">
      <legend>{{s.title||name||'Lista'}} ({{arrayValue.length}}<ng-container *ngIf="s.maxItems!==undefined"> / {{s.maxItems}}</ng-container>)</legend>
      <div class="container-nullable-row" *ngIf="isNullable(s)">
        <label class="nullable-toggle" title="Definir como nulo">
          <span>Definir como nulo</span>
          <input type="checkbox" [checked]="value===null" (change)="setNull($any($event.target).checked,s)" />
          <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
        </label>
      </div>
      <p class="muted" *ngIf="s.description && value!==null">{{s.description}}</p>

      <ng-container *ngIf="value!==null; else nullArrayState">
        <ng-container *ngIf="isMultiSelect(s); else regularArray">
          <div class="multi-select" role="group" [attr.aria-label]="s.title||name||'Seleção múltipla'">
            <label class="multi-select-option" *ngFor="let option of multiSelectOptions(s)">
              <input type="checkbox" [checked]="isMultiSelected(option)" [disabled]="isMultiDisabled(s,option)" (change)="toggleMultiSelect(option,$any($event.target).checked)" />
              <span>{{option}}</span>
            </label>
          </div>
          <p class="muted" *ngIf="s.minItems!==undefined || s.maxItems!==undefined">
            <ng-container *ngIf="s.minItems!==undefined">Mínimo: {{s.minItems}}</ng-container>
            <ng-container *ngIf="s.minItems!==undefined && s.maxItems!==undefined"> · </ng-container>
            <ng-container *ngIf="s.maxItems!==undefined">Máximo: {{s.maxItems}}</ng-container>
          </p>
        </ng-container>

        <ng-template #regularArray>
          <div *ngFor="let v of arrayValue;index as i;trackBy:trackIndex" class="array-item">
            <app-field [name]="'Item '+(i+1)" [schema]="s.items||{}" [root]="root" [value]="v" [issues]="issues" [path]="indexPath(i)" (valueChange)="updateItem(i,$event)"></app-field>
            <div class="array-item-actions"><button type="button" class="secondary danger" [disabled]="arrayValue.length <= (s.minItems||0)" (click)="remove(i)">Remover</button></div>
          </div>
          <div class="array-footer-actions"><span></span><button type="button" [disabled]="s.maxItems!==undefined && arrayValue.length>=s.maxItems" (click)="add(s.items||{})">+ Adicionar item</button></div>
        </ng-template>

        <p class="error" *ngIf="s.minItems!==undefined && arrayValue.length<s.minItems">Mínimo de {{s.minItems}} itens.</p><p class="error" *ngIf="s.uniqueItems && hasDuplicates()">Os itens devem ser únicos.</p><p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
      </ng-container>
      <ng-template #nullArrayState><div class="null-value-state">Valor definido como <code>null</code>.</div></ng-template>
    </fieldset>
    <ng-template #scalar>
      <div class="control" [class.invalid-control]="isInvalid(path)">
        <div class="field-heading">
          <label>{{s.title||name||'Valor'}} {{required?'*':''}}</label>
          <label *ngIf="isNullable(s)" class="nullable-toggle" title="Definir como nulo">
            <span>Definir como nulo</span>
            <input type="checkbox" [checked]="value===null" (change)="setNull($any($event.target).checked,s)" />
            <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
          </label>
        </div>
        <select *ngIf="(s.enum||s.const!==undefined) && value!==null" [ngModel]="value" (ngModelChange)="emit($event)"><option *ngFor="let option of (s.enum||[s.const])" [ngValue]="option">{{option}}</option></select>
        <input *ngIf="!s.enum && s.const===undefined && primaryType(s)==='boolean' && value!==null" type="checkbox" style="width:auto" [ngModel]="value===true" (ngModelChange)="emit($event)"/>
        <input *ngIf="!s.enum && s.const===undefined && (primaryType(s)==='number'||primaryType(s)==='integer') && value!==null" type="text" [attr.inputmode]="primaryType(s)==='integer'?'numeric':'decimal'" [value]="value ?? ''" (input)="filterNumericInput($any($event.target),s)" (change)="numericChanged($any($event.target),s)"/>
        <input *ngIf="!s.enum && s.const===undefined && primaryType(s)!=='boolean' && primaryType(s)!=='number' && primaryType(s)!=='integer' && value!==null" [type]="s.format==='email'?'email':s.format==='date'?'date':'text'" [ngModel]="value" (ngModelChange)="emit($event)"/>
        <div class="null-value-state" *ngIf="value===null && isNullable(s)">Valor definido como <code>null</code>.</div>
        <div class="muted" *ngIf="s.description">{{s.description}}</div><p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
      </div>
    </ng-template>
  </ng-template>
</ng-container>`})
export class FieldComponent {
 @Input() name='';@Input() schema:Schema={};@Input() root:Schema={};@Input() value:any;@Input() required=false;@Input() issues:ValidationIssue[]=[];@Input() path='';@Output() valueChange=new EventEmitter<any>();
 filterNumericInput(input:HTMLInputElement,s:Schema){const integer=primaryType(s)==='integer',before=input.value;const filtered=integer?before.replace(/[^0-9+-]/g,'').replace(/(?!^)[+-]/g,''):before.replace(/[^0-9.,+-]/g,'').replace(/(?!^)[+-]/g,'');if(before!==filtered)input.value=filtered;}
 numericChanged(input:HTMLInputElement,s:Schema){const raw=input.value.trim().replace(',', '.');if(raw===''){this.emit(isNullable(s)?null:undefined);return;}const integer=primaryType(s)==='integer';const valid=integer?/^[+-]?\d+$/:/^[+-]?(?:\d+\.?\d*|\.\d+)$/;if(!valid.test(raw)){input.value=String(this.value??'');return;}const n=Number(raw);if(!Number.isFinite(n)||(integer&&!Number.isInteger(n))){input.value=String(this.value??'');return;}this.emit(n);}
 hasProperties(s:Schema){return Object.keys(s.properties||{}).length>0;}
 hasTypedAdditionalProperties(s:Schema){return s.additionalProperties!==undefined&&s.additionalProperties!==true&&s.additionalProperties!==false&&typeof s.additionalProperties==='object';}
 hasDictionary(s:Schema){return primaryType(s)==='object'&&!this.hasProperties(s)&&this.hasTypedAdditionalProperties(s);}
 hasHybridAdditionalProperties(s:Schema){return primaryType(s)==='object'&&this.hasProperties(s)&&this.hasTypedAdditionalProperties(s);}
 dictionarySchema(s:Schema):Schema{return deref(s.additionalProperties||{},this.root);}
 dictionaryEntries():[string,any][]{return Object.entries(this.objectValue);}
 additionalEntries(s:Schema):[string,any][]{const fixed=new Set(Object.keys(s.properties||{}));return Object.entries(this.objectValue).filter(([key])=>!fixed.has(key));}
 isMultiSelect(s:Schema){const item=deref(s.items||{},this.root);return primaryType(s)==='array'&&Array.isArray(item.enum)&&item.enum.length>0;}
 multiSelectOptions(s:Schema):any[]{return deref(s.items||{},this.root).enum||[];}
 isMultiSelected(option:any){return this.arrayValue.some(value=>Object.is(value,option));}
 isMultiDisabled(s:Schema,option:any){return !this.isMultiSelected(option)&&s.maxItems!==undefined&&this.arrayValue.length>=s.maxItems;}
 toggleMultiSelect(option:any,checked:boolean){const next=checked?[...this.arrayValue.filter(v=>!Object.is(v,option)),option]:this.arrayValue.filter(v=>!Object.is(v,option));this.emit(next);}
 get resolved(){return this.previewOneOf(effective(this.schema,this.value,this.root));}
 get objectValue():Record<string,any>{return this.value&&typeof this.value==='object'&&!Array.isArray(this.value)?this.value:{};}get arrayValue():any[]{return Array.isArray(this.value)?this.value:[];}
 entries(o:Record<string,Schema>):[string,Schema][]{return Object.entries(o);}visibleEntries(s:Schema):[string,Schema][]{const updating=this.name===''&&Number.isInteger(this.objectValue['version'])&&this.objectValue['version']!==null;return this.entries(s.properties||{}).filter(([key])=>!updating||(key!=='key'&&key!=='microserviceIdentifier'));}
 childPath(key:string){return `${this.path}/${this.escapePointer(key)}`;}indexPath(index:number){return `${this.path}/${index}`;}isInvalid(path:string){return this.issues.some(issue=>issue.path===this.normalizedPath(path));}firstError(path:string){return this.issues.find(issue=>issue.path===this.normalizedPath(path))?.message||'';}private normalizedPath(path:string){return path||'/';}private escapePointer(value:string){return value.replace(/~/g,'~0').replace(/\//g,'~1');}
 trackKey(_i:number,v:[string,any]){return v[0];}trackIndex(i:number){return i;}primaryType=primaryType;isNullable=isNullable;setNull(checked:boolean,s:Schema){if(checked)this.emit(null);else this.emit(initial({...s,type:primaryType(s),default:undefined},this.root));}emit(v:any){this.valueChange.emit(v);}
 updateKey(k:string,v:any){const next={...this.objectValue,[k]:v};if(k==='version'&&typeof v==='number'&&Number.isInteger(v)){delete next.key;delete next.microserviceIdentifier;}this.emit(reconcileValue(this.schema,next,this.root));}
 updateMapValue(key:string,v:any){this.emit({...this.objectValue,[key]:v});}
 renameAdditionalKey(s:Schema,oldKey:string,newKey:string){const key=newKey.trim();if(!key||key===oldKey)return;if(key in this.objectValue||key in (s.properties||{}))return;const fixed=new Set(Object.keys(s.properties||{}));if(fixed.has(oldKey))return;const next:Record<string,any>={};for(const [current,value] of Object.entries(this.objectValue))next[current===oldKey?key:current]=value;this.emit(next);}
 removeAdditionalKey(s:Schema,key:string){if(key in (s.properties||{}))return;const next={...this.objectValue};delete next[key];this.emit(next);}
 addMapEntry(s:Schema){let index=1,key='key';const fixed=s.properties||{};while(key in this.objectValue||key in fixed)key=`key${++index}`;this.emit({...this.objectValue,[key]:initial(this.dictionarySchema(s),this.root)});}
 updateItem(i:number,v:any){const a=[...this.arrayValue];a[i]=v;this.emit(a);}add(s:Schema){this.emit([...this.arrayValue,initial(deref(s,this.root),this.root)]);}hasDuplicates(){const a=this.arrayValue;return new Set(a.map(v=>JSON.stringify(v))).size!==a.length;}remove(i:number){this.emit(this.arrayValue.filter((_,j)=>j!==i));}
 private previewOneOf(resolved:Schema):Schema{
  if(!Array.isArray(this.schema?.oneOf))return resolved;
  const options=this.schema.oneOf.map((o:Schema)=>deref(o,this.root));
  if(!options.length)return resolved;
  const common=Object.keys(options[0].properties||{}).filter(key=>options.every((o:Schema)=>key in (o.properties||{})));
  const properties:Record<string,Schema>={...(resolved.properties||{})};
  for(const key of common){
   const rules=options.map((o:Schema)=>deref(o.properties[key],this.root));
   const constants=rules.map((r:Schema)=>r.const);
   if(constants.every((v:any)=>v!==undefined)){
    const current={...(properties[key]||rules[0])};
    delete current.const;
    properties[key]={...current,enum:[...new Set(constants)]};
   }
  }
  const required=[...new Set([...(resolved.required||[]),...(options[0].required||[]).filter((key:string)=>options.every((o:Schema)=>(o.required||[]).includes(key)))])];
  return Object.keys(properties).length?{...resolved,type:'object',properties,required}:resolved;
 }
}
