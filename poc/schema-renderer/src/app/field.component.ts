import {Component,Input,Output,EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
 Schema,ValidationIssue,deref,effective,initial,primaryType,isNullable,reconcileValue,
 nonNullTypes,hasTypeUnion,narrowedSchema,runtimeType,isFalseSchema,isFreeSchema,
 arrayItemSchema,additionalSchemaForKey,propertyNameIssue,matches,merge,schemaLabel
} from './schema-engine';

@Component({selector:'app-field',standalone:true,imports:[CommonModule,FormsModule],template:`
<ng-container *ngIf="resolved as s">
  <ng-container *ngIf="required || value!==undefined; else omittedState">
    <div class="schema-impossible" *ngIf="isFalseSchema(s); else renderable">Este valor não é permitido pelo schema.</div>

    <ng-template #renderable>
      <div class="schema-meta-row" *ngIf="hasCompositionOptions() || hasTypeUnion(s)">
        <label *ngIf="hasCompositionOptions()" class="type-selector">
          <span>Alternativa</span>
          <select [ngModel]="activeAlternativeIndex()" (ngModelChange)="selectAlternative($event)">
            <option *ngFor="let option of compositionOptions();index as i" [ngValue]="i">{{alternativeLabel(option,i)}}</option>
          </select>
        </label>
        <label *ngIf="hasTypeUnion(s)" class="type-selector">
          <span>Tipo</span>
          <select [ngModel]="activeType(s)" (ngModelChange)="changeType($event,s)">
            <option *ngFor="let type of nonNullTypes(s)" [ngValue]="type">{{typeLabel(type)}}</option>
          </select>
        </label>
      </div>

      <ng-container *ngIf="viewSchema(s) as v">
        <div class="free-value" *ngIf="isFreeSchema(v); else typedRenderer">
          <div class="field-heading"><label>{{v.title||name||'Valor livre'}} {{required?'*':''}}</label></div>
          <div class="constraint-hint" *ngIf="v.__externalRef">Referência externa <code>{{v.__externalRef}}</code>. A POC não resolve esse recurso automaticamente; o valor permanece editável em JSON.</div>
          <textarea class="json-value-editor" [value]="jsonValue(value)" [disabled]="v.readOnly" (change)="freeChanged($any($event.target))" placeholder='Ex.: "texto", 123, true, null, {}, []'></textarea>
          <div class="muted">Valor livre em JSON.</div>
          <p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
        </div>

        <ng-template #typedRenderer>
          <fieldset *ngIf="primaryType(v)==='object'||hasProperties(v); else nonObject" [disabled]="v.readOnly" [class.invalid-fieldset]="isInvalid(path)">
            <legend>{{v.title||name||'Objeto'}}</legend>
            <div class="container-nullable-row" *ngIf="isNullable(s)">
              <label class="nullable-toggle" title="Definir como nulo">
                <span>Definir como nulo</span>
                <input type="checkbox" [checked]="value===null" (change)="setNull($any($event.target).checked,s)" />
                <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <ng-container *ngIf="value!==null; else nullObjectState">
              <p class="muted" *ngIf="v.description">{{v.description}}</p>
              <div class="annotation-row" *ngIf="v.readOnly || v.writeOnly"><span *ngIf="v.readOnly">Somente leitura</span><span *ngIf="v.writeOnly">Somente escrita</span></div>

              <div *ngFor="let item of entries(v.properties||{});trackBy:trackKey" class="field">
                <app-field [name]="item[0]" [schema]="item[1]" [root]="root" [value]="objectValue?.[item[0]]" [required]="(v.required||[]).includes(item[0])" [issues]="issues" [path]="childPath(item[0])" (valueChange)="updateKey(item[0],$event)"></app-field>
              </div>

              <section class="additional-properties-section" *ngIf="hasDynamicProperties(v)">
                <div class="additional-properties-heading">
                  <div>
                    <strong>Campos adicionais</strong>
                    <div class="muted">{{dynamicPropertiesDescription(v)}}</div>
                  </div>
                  <span class="property-count">{{objectPropertyCount}}<ng-container *ngIf="v.maxProperties!==undefined"> / {{v.maxProperties}}</ng-container></span>
                </div>

                <div *ngFor="let item of dynamicEntries(v);trackBy:trackKey" class="array-item map-item">
                  <div class="map-key">
                    <label>Chave</label>
                    <input type="text" [value]="item[0]" [disabled]="v.readOnly" (change)="renameDynamicKey(v,item[0],$any($event.target).value)" />
                    <p class="error" *ngIf="keyIssue(v,item[0])">{{keyIssue(v,item[0])}}</p>
                  </div>
                  <div class="map-value">
                    <app-field [name]="'Valor'" [schema]="dynamicSchema(v,item[0])" [root]="root" [value]="item[1]" [required]="true" [issues]="issues" [path]="childPath(item[0])" (valueChange)="updateMapValue(item[0],$event)"></app-field>
                  </div>
                  <div class="array-item-actions"><button type="button" class="secondary danger" [disabled]="v.readOnly || !canRemoveProperty(v)" (click)="removeDynamicKey(v,item[0])">Remover</button></div>
                </div>

                <div class="array-footer-actions"><span class="muted" *ngIf="v.minProperties!==undefined">Mínimo de {{v.minProperties}} propriedades.</span><button type="button" [disabled]="v.readOnly || !canAddProperty(v)" (click)="addDynamicProperty(v)">+ Adicionar campo</button></div>
              </section>

              <div class="constraint-hint" *ngIf="v.not">Existe uma restrição <code>not</code>; combinações proibidas serão indicadas pela validação.</div>
              <p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
            </ng-container>
            <ng-template #nullObjectState><div class="null-value-state">Valor definido como <code>null</code>.</div></ng-template>
          </fieldset>

          <ng-template #nonObject>
            <fieldset *ngIf="primaryType(v)==='array'; else scalar" [disabled]="v.readOnly" [class.invalid-fieldset]="isInvalid(path)">
              <legend>{{v.title||name||'Lista'}} ({{arrayValue.length}}<ng-container *ngIf="v.maxItems!==undefined"> / {{v.maxItems}}</ng-container>)</legend>
              <div class="container-nullable-row" *ngIf="isNullable(s)">
                <label class="nullable-toggle" title="Definir como nulo">
                  <span>Definir como nulo</span>
                  <input type="checkbox" [checked]="value===null" (change)="setNull($any($event.target).checked,s)" />
                  <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
                </label>
              </div>
              <p class="muted" *ngIf="v.description && value!==null">{{v.description}}</p>

              <ng-container *ngIf="value!==null; else nullArrayState">
                <ng-container *ngIf="isMultiSelect(v); else regularArray">
                  <div class="multi-select" role="group" [attr.aria-label]="v.title||name||'Seleção múltipla'">
                    <label class="multi-select-option" *ngFor="let option of multiSelectOptions(v)">
                      <input type="checkbox" [checked]="isMultiSelected(option)" [disabled]="v.readOnly || isMultiDisabled(v,option)" (change)="toggleMultiSelect(option,$any($event.target).checked)" />
                      <span>{{option}}</span>
                    </label>
                  </div>
                </ng-container>

                <ng-template #regularArray>
                  <div *ngFor="let item of arrayValue;index as i;trackBy:trackIndex" class="array-item" [class.contains-match]="matchesContains(v,item)">
                    <div class="array-index-heading"><strong>Item {{i+1}}</strong><span *ngIf="matchesContains(v,item)" class="match-badge">corresponde a contains</span></div>
                    <app-field [name]="'Item '+(i+1)" [schema]="itemSchema(v,i)" [root]="root" [value]="item" [required]="true" [issues]="issues" [path]="indexPath(i)" (valueChange)="updateItem(i,$event)"></app-field>
                    <div class="array-item-actions">
                      <button *ngIf="!hasTuple(v)" type="button" class="secondary" [disabled]="i===0 || v.readOnly" (click)="move(i,-1)">↑</button>
                      <button *ngIf="!hasTuple(v)" type="button" class="secondary" [disabled]="i===arrayValue.length-1 || v.readOnly" (click)="move(i,1)">↓</button>
                      <button type="button" class="secondary danger" [disabled]="v.readOnly || arrayValue.length <= (v.minItems||0)" (click)="remove(i)">Remover</button>
                    </div>
                  </div>
                  <div class="array-footer-actions"><span></span><button type="button" [disabled]="v.readOnly || !canAddArrayItem(v)" (click)="addArrayItem(v)">+ Adicionar item</button></div>
                </ng-template>

                <p class="muted" *ngIf="v.minItems!==undefined || v.maxItems!==undefined"><ng-container *ngIf="v.minItems!==undefined">Mínimo: {{v.minItems}}</ng-container><ng-container *ngIf="v.minItems!==undefined && v.maxItems!==undefined"> · </ng-container><ng-container *ngIf="v.maxItems!==undefined">Máximo: {{v.maxItems}}</ng-container></p>
                <div class="constraint-hint" *ngIf="v.contains">Contains ativo<ng-container *ngIf="v.minContains!==undefined"> · mínimo {{v.minContains}}</ng-container><ng-container *ngIf="v.maxContains!==undefined"> · máximo {{v.maxContains}}</ng-container>.</div>
                <p class="error" *ngIf="v.uniqueItems && hasDuplicates()">Os itens devem ser únicos.</p><p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
              </ng-container>
              <ng-template #nullArrayState><div class="null-value-state">Valor definido como <code>null</code>.</div></ng-template>
            </fieldset>

            <ng-template #scalar>
              <div class="control" [class.invalid-control]="isInvalid(path)">
                <div class="field-heading">
                  <label>{{v.title||name||'Valor'}} {{required?'*':''}}</label>
                  <label *ngIf="isNullable(s)" class="nullable-toggle" title="Definir como nulo">
                    <span>Definir como nulo</span>
                    <input type="checkbox" [checked]="value===null" (change)="setNull($any($event.target).checked,s)" />
                    <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
                  </label>
                </div>

                <select *ngIf="(v.enum||v.const!==undefined) && value!==null" [ngModel]="value" [disabled]="v.readOnly" (ngModelChange)="emit($event)"><option *ngFor="let option of (v.enum||[v.const])" [ngValue]="option">{{option}}</option></select>
                <label class="boolean-toggle" *ngIf="!v.enum && v.const===undefined && primaryType(v)==='boolean' && value!==null">
                  <span>{{value===true?'Ligado':'Desligado'}}</span>
                  <input type="checkbox" [disabled]="v.readOnly" [checked]="value===true" (change)="emit($any($event.target).checked)" />
                  <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
                </label>
                <input *ngIf="!v.enum && v.const===undefined && (primaryType(v)==='number'||primaryType(v)==='integer') && value!==null" type="number" [step]="v.multipleOf|| (primaryType(v)==='integer'?1:'any')" [attr.min]="v.minimum ?? null" [attr.max]="v.maximum ?? null" [disabled]="v.readOnly" [value]="value ?? ''" [placeholder]="placeholder(v)" (change)="numericChanged($any($event.target),v)"/>
                <input *ngIf="!v.enum && v.const===undefined && primaryType(v)==='string' && value!==null" [type]="inputType(v)" [ngModel]="value" [disabled]="v.readOnly" [attr.minlength]="v.minLength ?? null" [attr.maxlength]="v.maxLength ?? null" [attr.pattern]="v.pattern ?? null" [placeholder]="placeholder(v)" (ngModelChange)="emit($event)"/>
                <div class="null-value-state" *ngIf="value===null && isNullable(s)">Valor definido como <code>null</code>.</div>
                <div class="annotation-row" *ngIf="v.readOnly || v.writeOnly"><span *ngIf="v.readOnly">Somente leitura</span><span *ngIf="v.writeOnly">Somente escrita</span></div>
                <div class="constraint-hint" *ngIf="v.not">Existe uma restrição <code>not</code> aplicada a este valor.</div>
                <div class="muted" *ngIf="v.description">{{v.description}}</div><p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
              </div>
            </ng-template>
          </ng-template>
        </ng-template>
      </ng-container>
    </ng-template>

    <div class="array-item-actions" *ngIf="!required">
      <button type="button" class="secondary danger" (click)="setIncluded(false,s)">Remover campo</button>
    </div>
  </ng-container>

  <ng-template #omittedState>
    <button type="button" class="secondary" (click)="setIncluded(true,s)">+ Adicionar {{fieldLabel(s)}}</button>
  </ng-template>
</ng-container>`})
export class FieldComponent {
 @Input() name='';@Input() schema:Schema={};@Input() root:Schema={};@Input() value:any;@Input() required=false;@Input() issues:ValidationIssue[]=[];@Input() path='';@Output() valueChange=new EventEmitter<any>();
 chosenType?:string;

 get resolved(){return effective(this.schema,this.value,this.root);}
 get objectValue():Record<string,any>{return this.value&&typeof this.value==='object'&&!Array.isArray(this.value)?this.value:{};}
 get arrayValue():any[]{return Array.isArray(this.value)?this.value:[];}
 get objectPropertyCount(){return Object.keys(this.objectValue).length;}

 entries(object:Record<string,any>):[string,any][]{return Object.entries(object||{});}
 trackKey(_i:number,item:[string,any]){return item[0];}trackIndex(index:number){return index;}
 primaryType=primaryType;isNullable=isNullable;isFalseSchema=isFalseSchema;isFreeSchema=isFreeSchema;hasTypeUnion=hasTypeUnion;nonNullTypes=nonNullTypes;
 fieldLabel(s:Schema){return s.title||this.name||'campo';}

 viewSchema(s:Schema):Schema{return hasTypeUnion(s)?narrowedSchema(s,this.activeType(s),this.root):s;}
 activeType(s:Schema):string{
  const allowed=nonNullTypes(s);if(this.chosenType&&allowed.includes(this.chosenType))return this.chosenType;
  const current=runtimeType(this.value);if(allowed.includes(current))return current;if(current==='integer'&&allowed.includes('number')&&!allowed.includes('integer'))return 'number';return allowed[0]||primaryType(s);
 }
 changeType(type:string,s:Schema){this.chosenType=type;this.emit(initial(narrowedSchema(s,type,this.root),this.root));}
 typeLabel(type:string){return ({string:'Texto',integer:'Inteiro',number:'Número',boolean:'Booleano',object:'Objeto',array:'Lista',null:'Nulo'} as Record<string,string>)[type]||type;}

 compositionOptions():Schema[]{const s:any=this.schema||{};return [...(s.oneOf||[]),...(s.anyOf||[])].map((option:any)=>deref(option,this.root));}
 hasCompositionOptions(){return this.compositionOptions().length>1;}
 activeAlternativeIndex(){const options=this.compositionOptions();const index=options.findIndex(option=>matches(option,this.value,this.root));return index>=0?index:0;}
 alternativeLabel(option:Schema,index:number){return schemaLabel(option,index,this.root);}
 selectAlternative(index:number){const options=this.compositionOptions();const option=options[Number(index)];if(!option)return;const raw:any={...(this.schema||{})};delete raw.oneOf;delete raw.anyOf;const composed=merge(raw,option);this.chosenType=undefined;this.emit(initial(composed,this.root));}

 setIncluded(included:boolean,s:Schema){if(!included){this.emit(undefined);return;}this.emit(this.nonNullInitial(s));}
 setNull(checked:boolean,s:Schema){if(checked)this.emit(null);else this.emit(this.nonNullInitial(s));}
 private nonNullInitial(s:Schema){const type=nonNullTypes(s)[0]||primaryType(s);return initial({...s,type,default:s.default===null?undefined:s.default},this.root);}
 emit(value:any){this.valueChange.emit(value);}

 hasProperties(s:Schema){return Object.keys(s.properties||{}).length>0;}
 hasDynamicProperties(s:Schema){return !!s.patternProperties||s.additionalProperties===true||(s.additionalProperties&&typeof s.additionalProperties==='object')||s.unevaluatedProperties===true||(s.unevaluatedProperties&&typeof s.unevaluatedProperties==='object');}
 dynamicPropertiesDescription(s:Schema){if(s.patternProperties&&s.additionalProperties===false)return 'Atributos extras devem corresponder aos padrões definidos em patternProperties.';if(s.unevaluatedProperties!==undefined)return 'Atributos extras seguem as regras de patternProperties/additionalProperties e unevaluatedProperties.';if(s.patternProperties)return 'Atributos extras podem usar patternProperties e additionalProperties.';return 'Atributos extras permitidos por additionalProperties.';}
 dynamicEntries(s:Schema):[string,any][]{const fixed=new Set(Object.keys(s.properties||{}));return Object.entries(this.objectValue).filter(([key])=>!fixed.has(key));}
 dynamicSchema(s:Schema,key:string){return additionalSchemaForKey(s,key,this.root);}
 keyIssue(s:Schema,key:string){const propertyIssue=propertyNameIssue(s,key,this.root);if(propertyIssue)return propertyIssue;const dynamic=additionalSchemaForKey(s,key,this.root);return isFalseSchema(dynamic)?'Esta chave não é permitida pelo schema.':'';}
 updateKey(key:string,value:any){const next={...this.objectValue};if(value===undefined)delete next[key];else next[key]=value;this.emit(reconcileValue(this.schema,next,this.root));}
 updateMapValue(key:string,value:any){const next={...this.objectValue};if(value===undefined)delete next[key];else next[key]=value;this.emit(reconcileValue(this.schema,next,this.root));}
 renameDynamicKey(s:Schema,oldKey:string,newKey:string){const key=newKey.trim();if(!key||key===oldKey||key in this.objectValue||key in (s.properties||{}))return;const next:Record<string,any>={};for(const [current,value] of Object.entries(this.objectValue))next[current===oldKey?key:current]=value;this.emit(next);}
 removeDynamicKey(s:Schema,key:string){if(key in (s.properties||{})||!this.canRemoveProperty(s))return;const next={...this.objectValue};delete next[key];this.emit(next);}
 addDynamicProperty(s:Schema){if(!this.canAddProperty(s))return;let index=1,key='key';while(key in this.objectValue||key in (s.properties||{}))key=`key${++index}`;const child=additionalSchemaForKey(s,key,this.root);this.emit({...this.objectValue,[key]:isFalseSchema(child)?'':initial(child,this.root)});}
 canAddProperty(s:Schema){return s.maxProperties===undefined||this.objectPropertyCount<s.maxProperties;}
 canRemoveProperty(s:Schema){return s.minProperties===undefined||this.objectPropertyCount>s.minProperties;}

 isMultiSelect(s:Schema){const item=arrayItemSchema(s,0,this.root);return !s.prefixItems&&Array.isArray(item.enum)&&item.enum.length>0;}
 multiSelectOptions(s:Schema):any[]{return arrayItemSchema(s,0,this.root).enum||[];}
 isMultiSelected(option:any){return this.arrayValue.some(value=>Object.is(value,option));}
 isMultiDisabled(s:Schema,option:any){return !this.isMultiSelected(option)&&s.maxItems!==undefined&&this.arrayValue.length>=s.maxItems;}
 toggleMultiSelect(option:any,checked:boolean){const next=checked?[...this.arrayValue.filter(value=>!Object.is(value,option)),option]:this.arrayValue.filter(value=>!Object.is(value,option));this.emit(next);}
 itemSchema(s:Schema,index:number){return arrayItemSchema(s,index,this.root);}
 hasTuple(s:Schema){return Array.isArray(s.prefixItems)&&s.prefixItems.length>0;}
 canAddArrayItem(s:Schema){if(s.maxItems!==undefined&&this.arrayValue.length>=s.maxItems)return false;return !isFalseSchema(arrayItemSchema(s,this.arrayValue.length,this.root));}
 addArrayItem(s:Schema){if(!this.canAddArrayItem(s))return;this.emit([...this.arrayValue,initial(arrayItemSchema(s,this.arrayValue.length,this.root),this.root)]);}
 updateItem(index:number,value:any){const next=[...this.arrayValue];next[index]=value;this.emit(reconcileValue(this.schema,next,this.root));}
 remove(index:number){this.emit(this.arrayValue.filter((_,current)=>current!==index));}
 move(index:number,direction:number){const target=index+direction;if(target<0||target>=this.arrayValue.length)return;const next=[...this.arrayValue];[next[index],next[target]]=[next[target],next[index]];this.emit(next);}
 hasDuplicates(){return new Set(this.arrayValue.map(value=>JSON.stringify(value))).size!==this.arrayValue.length;}
 matchesContains(s:Schema,item:any){return !!s.contains&&matches(s.contains,item,this.root);}

 numericChanged(input:HTMLInputElement,s:Schema){const raw=input.value.trim();if(raw===''){this.emit(isNullable(s)?null:undefined);return;}const number=Number(raw);if(!Number.isFinite(number)){input.value=String(this.value??'');return;}if(primaryType(s)==='integer'&&!Number.isInteger(number)){input.value=String(this.value??'');return;}this.emit(number);}
 inputType(s:Schema){switch(s.format){case 'email':return 'email';case 'date':return 'date';case 'date-time':return 'datetime-local';case 'time':return 'time';case 'uri':case 'url':return 'url';default:return 'text';}}
 placeholder(s:Schema){const example=Array.isArray(s.examples)?s.examples[0]:s.example;return example===undefined?'':typeof example==='string'?example:JSON.stringify(example);}
 jsonValue(value:any){try{return JSON.stringify(value,null,2)??'';}catch{return String(value??'');}}
 freeChanged(input:HTMLTextAreaElement){try{this.emit(JSON.parse(input.value));input.setCustomValidity('');}catch{input.setCustomValidity('JSON inválido');input.reportValidity();}}

 childPath(key:string){return `${this.path}/${this.escapePointer(key)}`;}indexPath(index:number){return `${this.path}/${index}`;}
 isInvalid(path:string){return this.issues.some(issue=>issue.path===this.normalizedPath(path));}
 firstError(path:string){return this.issues.find(issue=>issue.path===this.normalizedPath(path))?.message||'';}
 private normalizedPath(path:string){return path||'/';}
 private escapePointer(value:string){return value.replace(/~/g,'~0').replace(/\//g,'~1');}
}