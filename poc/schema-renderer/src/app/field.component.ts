import {Component,Input,Output,EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
 Schema,ValidationIssue,deref,effective,initial,primaryType,isNullable,
 nonNullTypes,hasTypeUnion,narrowedSchema,runtimeType,isFalseSchema,isFreeSchema,
 arrayItemSchema,additionalSchemaForKey,propertyNameIssue,matches,merge,schemaLabel
} from './schema-engine';

@Component({selector:'app-field',standalone:true,imports:[CommonModule,FormsModule],styles:[`.visual-form-group{border:1px solid #dce4ef;border-radius:12px;padding:16px;margin:14px 0;background:#fbfcff}.visual-form-group h3{margin:0 0 8px;font-size:16px;color:#243b59}.visual-form-group p{margin:0 0 12px;font-size:13px;color:#64748b}`],template:`
<ng-container *ngIf="resolved as s">
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
        <div class="field-heading">
          <label>{{v.title||name||'Valor livre'}} {{required?'*':''}}</label>
          <label *ngIf="showNullToggle(s)" class="nullable-toggle" title="Definir como nulo">
            <span>Definir como nulo</span>
            <input type="checkbox" [checked]="isNullState()" (change)="setNull($any($event.target).checked,s)" />
            <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
          </label>
        </div>
        <ng-container *ngIf="!isNullState(); else nullFreeState">
          <div class="constraint-hint" *ngIf="v.__externalRef">Referência externa <code>{{v.__externalRef}}</code>. A POC não resolve esse recurso automaticamente; o valor permanece editável em JSON.</div>
          <textarea class="json-value-editor" [value]="jsonValue(value)" [disabled]="v.readOnly" (change)="freeChanged($any($event.target))" [placeholder]="freeValuePlaceholder()"></textarea>
          <div class="muted">Valor livre em JSON.</div>
        </ng-container>
        <ng-template #nullFreeState><div class="null-value-state">{{nullStateLabel(s)}}</div></ng-template>
        <p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
      </div>

      <ng-template #typedRenderer>
        <fieldset *ngIf="primaryType(v)==='object'||hasProperties(v); else nonObject" [disabled]="v.readOnly" [class.invalid-fieldset]="isInvalid(path)">
          <legend>{{v.title||name||'Objeto'}}</legend>
          <div class="container-nullable-row" *ngIf="showNullToggle(s)">
            <label class="nullable-toggle" title="Definir como nulo">
              <span>Definir como nulo</span>
              <input type="checkbox" [checked]="isNullState()" (change)="setNull($any($event.target).checked,s)" />
              <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
            </label>
          </div>

          <ng-container *ngIf="!isNullState(); else nullObjectState">
            <p class="muted" *ngIf="v.description">{{v.description}}</p>
            <div class="annotation-row" *ngIf="v.readOnly || v.writeOnly"><span *ngIf="v.readOnly">Somente leitura</span><span *ngIf="v.writeOnly">Somente escrita</span></div>

            <section *ngFor="let group of visualGroups(v)" class="visual-form-group">
              <h3>{{group.title||'Grupo'}}</h3>
              <p *ngIf="group.description">{{group.description}}</p>
              <div *ngFor="let key of group.fields" class="field">
                <app-field *ngIf="v.properties?.[key]" [name]="key" [schema]="v.properties[key]" [root]="root" [value]="objectValue?.[key]" [required]="(v.required||[]).includes(key)" [issues]="issues" [path]="childPath(key)" (valueChange)="updateKey(key,$event)"></app-field>
              </div>
            </section>
            <div *ngFor="let item of ungroupedEntries(v);trackBy:trackKey" class="field">
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

              <div *ngFor="let item of dynamicEntries(v);trackBy:trackKey" class="array-item map-item"
                   [style.grid-template-columns]="isDynamicJsonStructure(v,item[0],item[1]) ? 'minmax(180px,1fr) minmax(140px,.45fr) auto' : null">
                <div *ngIf="dynamicAllowsNull(v,item[0])" style="grid-column:1/-1;display:flex;justify-content:flex-end;align-items:center;margin-bottom:-2px">
                  <label class="nullable-toggle" style="position:relative;right:auto;top:auto" title="Definir como nulo">
                    <span>Definir como nulo</span>
                    <input type="checkbox" [checked]="item[1]===null" [disabled]="v.readOnly" (change)="setDynamicNull(v,item[0],$any($event.target).checked)" />
                    <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
                  </label>
                </div>

                <div class="map-key">
                  <label>Chave</label>
                  <input type="text" [value]="item[0]" [disabled]="v.readOnly" (change)="renameDynamicKey(v,item[0],$any($event.target).value)" />
                  <p class="error" *ngIf="keyIssue(v,item[0])">{{keyIssue(v,item[0])}}</p>
                </div>

                <div class="map-type">
                  <label>Tipo</label>
                  <select *ngIf="dynamicTypeOptions(v,item[0]).length > 1; else staticDynamicType"
                          [ngModel]="dynamicActiveType(v,item[0],item[1])"
                          [disabled]="v.readOnly || item[1]===null"
                          (ngModelChange)="changeDynamicType(v,item[0],$event)">
                    <option *ngFor="let type of dynamicTypeOptions(v,item[0])" [ngValue]="type">{{typeLabel(type)}}</option>
                  </select>
                  <ng-template #staticDynamicType>
                    <div class="map-type-static">{{typeLabel(dynamicActiveType(v,item[0],item[1]))}}</div>
                  </ng-template>
                </div>

                <div class="map-value" *ngIf="!isDynamicJsonStructure(v,item[0],item[1])">
                  <div class="null-value-state" *ngIf="item[1]===null; else dynamicTypedValue">Valor definido como <code>null</code>.</div>
                  <ng-template #dynamicTypedValue>
                    <app-field [name]="'Valor'" [schema]="dynamicValueSchema(v,item[0],item[1])" [root]="root" [value]="item[1]" [required]="true" [issues]="issues" [path]="childPath(item[0])" (valueChange)="updateMapValue(item[0],$event)"></app-field>
                  </ng-template>
                </div>

                <div class="map-action"><button type="button" class="secondary danger" [disabled]="v.readOnly || !canRemoveProperty(v)" (click)="removeDynamicKey(v,item[0])">Remover</button></div>

                <div *ngIf="isDynamicJsonStructure(v,item[0],item[1])" style="grid-column:1/-1;margin-top:4px">
                  <ng-container *ngIf="item[1]!==null; else dynamicNullState">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px">
                      <label style="margin:0">Valor (JSON)</label>
                      <span class="muted">{{dynamicActiveType(v,item[0],item[1])==='array'?'Informe uma lista JSON.':'Informe um objeto JSON.'}}</span>
                    </div>
                    <textarea class="json-value-editor"
                              style="min-height:150px"
                              [class.invalid-json-editor]="!!dynamicJsonError(item[0])"
                              [value]="dynamicJsonText(v,item[0],item[1])"
                              [disabled]="v.readOnly"
                              (input)="dynamicJsonChanged(v,item[0],$any($event.target).value)"
                              [placeholder]="dynamicJsonPlaceholder(v,item[0],item[1])"></textarea>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px">
                      <span class="success" *ngIf="!dynamicJsonError(item[0])">✓ JSON válido</span>
                      <span class="error" *ngIf="dynamicJsonError(item[0])">{{dynamicJsonError(item[0])}}</span>
                      <button type="button" class="secondary" style="margin:0" [disabled]="v.readOnly" (click)="formatDynamicJson(v,item[0],item[1])">Formatar JSON</button>
                    </div>
                  </ng-container>
                  <ng-template #dynamicNullState><div class="null-value-state">Valor definido como <code>null</code>.</div></ng-template>
                </div>
              </div>

              <div class="array-footer-actions"><span class="muted" *ngIf="v.minProperties!==undefined">Mínimo de {{v.minProperties}} propriedades.</span><button type="button" [disabled]="v.readOnly || !canAddProperty(v)" (click)="addDynamicProperty(v)">+ Adicionar campo</button></div>
            </section>

            <p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
          </ng-container>
          <ng-template #nullObjectState><div class="null-value-state">{{nullStateLabel(s)}}</div></ng-template>
        </fieldset>

        <ng-template #nonObject>
          <fieldset *ngIf="primaryType(v)==='array'; else scalar" [disabled]="v.readOnly" [class.invalid-fieldset]="isInvalid(path)">
            <legend>{{v.title||name||'Lista'}} ({{arrayValue.length}}<ng-container *ngIf="v.maxItems!==undefined"> / {{v.maxItems}}</ng-container>)</legend>
            <div class="container-nullable-row" *ngIf="showNullToggle(s)">
              <label class="nullable-toggle" title="Definir como nulo">
                <span>Definir como nulo</span>
                <input type="checkbox" [checked]="isNullState()" (change)="setNull($any($event.target).checked,s)" />
                <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
              </label>
            </div>
            <p class="muted" *ngIf="v.description && !isNullState()">{{v.description}}</p>

            <ng-container *ngIf="!isNullState(); else nullArrayState">
              <ng-container *ngIf="isMultiSelect(v); else regularArray">
                <div *ngIf="arrayWidget(v)==='multiselect'" class="multi-select-chips"><span *ngFor="let option of arrayValue" class="multi-select-chip">{{multiOptionLabel(v,option)}} <button type="button" [disabled]="v.readOnly" (click)="toggleMultiSelect(option,false)">×</button></span></div>
                <input *ngIf="arrayWidget(v)==='multiselect'" type="search" placeholder="Pesquisar opções..." [ngModel]="multiSearch" (ngModelChange)="multiSearch=$event"/>
                <div class="multi-select" role="group" [attr.aria-label]="v.title||name||'Seleção múltipla'">
                  <label class="multi-select-option" *ngFor="let option of filteredMultiOptions(v)">
                    <input type="checkbox" [checked]="isMultiSelected(option)" [disabled]="v.readOnly || isMultiDisabled(v,option)" (change)="toggleMultiSelect(option,$any($event.target).checked)" />
                    <span>{{multiOptionLabel(v,option)}}</span>
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
            <ng-template #nullArrayState><div class="null-value-state">{{nullStateLabel(s)}}</div></ng-template>
          </fieldset>

          <ng-template #scalar>
            <div class="control" [class.invalid-control]="isInvalid(path)">
              <div class="field-heading">
                <label>{{v.title||name||'Valor'}} {{required?'*':''}}</label>
                <label *ngIf="showNullToggle(s)" class="nullable-toggle" title="Definir como nulo">
                  <span>Definir como nulo</span>
                  <input type="checkbox" [checked]="isNullState()" (change)="setNull($any($event.target).checked,s)" />
                  <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
                </label>
              </div>

              <select *ngIf="(v.enum||v.const!==undefined) && !isNullState()" [ngModel]="value" [disabled]="v.readOnly" (ngModelChange)="emit($event)"><option *ngFor="let option of (v.enum||[v.const])" [ngValue]="option">{{option}}</option></select>
              <label class="boolean-toggle" *ngIf="!v.enum && v.const===undefined && primaryType(v)==='boolean' && !isNullState()">
                <span>{{value===true?'Ligado':'Desligado'}}</span>
                <input type="checkbox" [disabled]="v.readOnly" [checked]="value===true" (change)="emit($any($event.target).checked)" />
                <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
              </label>
              <input *ngIf="!v.enum && v.const===undefined && (primaryType(v)==='number'||primaryType(v)==='integer') && !isNullState()" type="number" [step]="v.multipleOf|| (primaryType(v)==='integer'?1:'any')" [attr.min]="v.minimum ?? null" [attr.max]="v.maximum ?? null" [disabled]="v.readOnly" [value]="value ?? ''" [placeholder]="placeholder(v)" (change)="numericChanged($any($event.target),v)"/>
              <input *ngIf="!v.enum && v.const===undefined && primaryType(v)==='string' && !isNullState()" [type]="inputType(v)" [ngModel]="formattedInputValue(v)" [disabled]="v.readOnly" [attr.minlength]="v.minLength ?? null" [attr.maxlength]="v.maxLength ?? null" [attr.pattern]="v.pattern ?? null" [placeholder]="placeholder(v)" (ngModelChange)="formattedInputChanged(v,$event)"/>
              <div class="null-value-state" *ngIf="isNullState() && showNullToggle(s)">{{nullStateLabel(s)}}</div>
              <div class="annotation-row" *ngIf="v.readOnly || v.writeOnly"><span *ngIf="v.readOnly">Somente leitura</span><span *ngIf="v.writeOnly">Somente escrita</span></div>
              <div class="muted" *ngIf="v.description">{{v.description}}</div><p class="error" *ngIf="firstError(path)">{{firstError(path)}}</p>
            </div>
          </ng-template>
        </ng-template>
      </ng-template>
    </ng-container>
  </ng-template>
</ng-container>`})
export class FieldComponent {
 @Input() name='';@Input() schema:Schema={};@Input() root:Schema={};@Input() value:any;@Input() required=false;@Input() issues:ValidationIssue[]=[];@Input() path='';@Output() valueChange=new EventEmitter<any>();
 chosenType?:string;
 private dynamicChosenTypes:Record<string,string>={};
 private dynamicJsonDraftValues:Record<string,string>={};
 private dynamicJsonErrors:Record<string,string>={};
 private readonly jsonTypes=['string','password','integer','number','boolean','object','array'];

 get resolved(){return effective(this.schema,this.value,this.root);}
 get objectValue():Record<string,any>{return this.value&&typeof this.value==='object'&&!Array.isArray(this.value)?this.value:{};}
 get arrayValue():any[]{return Array.isArray(this.value)?this.value:[];}
 get objectPropertyCount(){return Object.keys(this.objectValue).length;}

 visualGroups(s:Schema):{id:string;title:string;description?:string;fields:string[]}[]{const groups=s['x-ui']?.groups;return Array.isArray(groups)?groups.filter((g:any)=>g&&Array.isArray(g.fields)):[];}
 ungroupedEntries(s:Schema):[string,any][]{const assigned=new Set(this.visualGroups(s).flatMap(g=>g.fields));return Object.entries(s.properties||{}).filter(([key])=>!assigned.has(key));}
 entries(object:Record<string,any>):[string,any][]{return Object.entries(object||{});}
 trackKey(_i:number,item:[string,any]){return item[0];}trackIndex(index:number){return index;}
 primaryType=primaryType;isNullable=isNullable;isFalseSchema=isFalseSchema;isFreeSchema=isFreeSchema;hasTypeUnion=hasTypeUnion;nonNullTypes=nonNullTypes;
 showNullToggle(s:Schema){const source=this.nullToggleSource(s);return isNullable(source)||!this.required;}
 isNullState(){return this.value===null||(!this.required&&this.value===undefined);}
 nullStateLabel(s:Schema){return isNullable(this.nullToggleSource(s))?'Valor definido como null.':'Campo opcional sem valor.';}

 viewSchema(s:Schema):Schema{return hasTypeUnion(s)?narrowedSchema(s,this.activeType(s),this.root):s;}
 activeType(s:Schema):string{
  const allowed=nonNullTypes(s);if(this.chosenType&&allowed.includes(this.chosenType))return this.chosenType;
  const current=runtimeType(this.value);if(allowed.includes(current))return current;if(current==='integer'&&allowed.includes('number')&&!allowed.includes('integer'))return 'number';return allowed[0]||primaryType(s);
 }
 changeType(type:string,s:Schema){this.chosenType=type;this.emit(initial(narrowedSchema(s,type,this.root),this.root));}
 typeLabel(type:string){return ({string:'Texto',password:'Senha',integer:'Inteiro',number:'Número',boolean:'Booleano',object:'Objeto',array:'Lista',null:'Nulo'} as Record<string,string>)[type]||type;}

 compositionOptions():Schema[]{const s:any=this.schema||{};return [...(s.oneOf||[]),...(s.anyOf||[])].map((option:any)=>deref(option,this.root));}
 hasCompositionOptions(){return this.compositionOptions().length>1;}
 activeAlternativeIndex(){const options=this.compositionOptions();const index=options.findIndex(option=>matches(option,this.value,this.root));return index>=0?index:0;}
 alternativeLabel(option:Schema,index:number){return schemaLabel(option,index,this.root);}
 selectAlternative(index:number){const options=this.compositionOptions();const option=options[Number(index)];if(!option)return;const raw:any={...(this.schema||{})};delete raw.oneOf;delete raw.anyOf;const composed=merge(raw,option);this.chosenType=undefined;this.emit(initial(composed,this.root));}

 setNull(checked:boolean,s:Schema){const source=this.nullToggleSource(s);if(checked)this.emit(isNullable(source)?null:undefined);else this.emit(this.nonNullInitial(source));}
 private nullToggleSource(s:Schema):Schema{
  const base=this.baseSchemaAtPath();
  return base&&nonNullTypes(base).length?base:s;
 }
 private baseSchemaAtPath():Schema|undefined{
  if(!this.path)return this.schema;
  const parts=this.path.split('/').filter(Boolean).map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
  let current:any=this.root;
  for(const part of parts){
   if(!current||typeof current!=='object')return undefined;
   if(current.properties?.[part]!==undefined){current=current.properties[part];continue;}
   return undefined;
  }
  return current as Schema;
 }
 private nonNullInitial(s:Schema){const type=nonNullTypes(s)[0]||primaryType(s);return initial({...s,type,default:s.default===null?undefined:s.default},this.root);}
 emit(value:any){this.valueChange.emit(value);}

 hasProperties(s:Schema){return Object.keys(s.properties||{}).length>0;}
 hasDynamicProperties(s:Schema){return !!s.patternProperties||s.additionalProperties===true||(s.additionalProperties&&typeof s.additionalProperties==='object')||s.unevaluatedProperties===true||(s.unevaluatedProperties&&typeof s.unevaluatedProperties==='object');}
 dynamicPropertiesDescription(s:Schema){if(s.patternProperties&&s.additionalProperties===false)return 'Atributos extras devem corresponder aos padrões definidos em patternProperties.';if(s.unevaluatedProperties!==undefined)return 'Atributos extras seguem as regras de patternProperties/additionalProperties e unevaluatedProperties.';if(s.patternProperties)return 'Atributos extras podem usar patternProperties e additionalProperties.';return 'Atributos extras permitidos por additionalProperties.';}
 dynamicEntries(s:Schema):[string,any][]{const fixed=new Set(Object.keys(s.properties||{}));return Object.entries(this.objectValue).filter(([key])=>!fixed.has(key));}
 dynamicSchema(s:Schema,key:string){return additionalSchemaForKey(s,key,this.root);}
 private declaredDynamicTypes(schema:Schema):string[]{return Array.isArray(schema.type)?schema.type:(typeof schema.type==='string'?[schema.type]:[]);}
 dynamicTypeOptions(s:Schema,key:string):string[]{
  const schema=this.dynamicSchema(s,key),declared=this.declaredDynamicTypes(schema);
  if(declared.length)return declared.filter(type=>type!=='null');
  if(isFreeSchema(schema))return [...this.jsonTypes];
  const inferred=primaryType(schema);
  return inferred&&inferred!=='null'?[inferred]:[];
 }
 dynamicAllowsNull(s:Schema,key:string):boolean{
  const schema=this.dynamicSchema(s,key),declared=this.declaredDynamicTypes(schema);
  if(declared.length)return declared.includes('null');
  return isFreeSchema(schema);
 }
 dynamicActiveType(s:Schema,key:string,value:any):string{
  const options=this.dynamicTypeOptions(s,key),chosen=this.dynamicChosenTypes[key];
  if(chosen&&options.includes(chosen))return chosen;
  const current=runtimeType(value);
  if(options.includes(current))return current;
  if(current==='integer'&&options.includes('number')&&!options.includes('integer'))return 'number';
  return options[0]||(value===null?'null':primaryType(this.dynamicSchema(s,key)));
 }
 dynamicValueSchema(s:Schema,key:string,value:any):Schema{
  const base=this.dynamicSchema(s,key),type=this.dynamicActiveType(s,key,value);
  if(value===null)return {type:'null'};
  const declared=this.declaredDynamicTypes(base);
  if(!declared.length&&isFreeSchema(base))return type==='password'?{type:'string',format:'password'}:{type};
  const options=this.dynamicTypeOptions(s,key);
  if(options.length<=1)return base;
  return {...base,type};
 }
 private isUnconstrainedArray(schema:Schema):boolean{
  return primaryType(schema)==='array' && schema.items===undefined && !schema.prefixItems && !schema.contains && schema.minItems===undefined && schema.maxItems===undefined && schema.uniqueItems===undefined;
 }
 isDynamicJsonStructure(s:Schema,key:string,value:any):boolean{
  if(value===null)return false;
  const type=this.dynamicActiveType(s,key,value),schema=this.dynamicValueSchema(s,key,value);
  if(type==='object')return isFreeSchema(schema);
  if(type==='array')return this.isUnconstrainedArray(schema);
  return false;
 }
 changeDynamicType(s:Schema,key:string,type:string){
  const base=this.dynamicSchema(s,key);
  this.dynamicChosenTypes[key]=type;
  delete this.dynamicJsonDraftValues[key];delete this.dynamicJsonErrors[key];
  const selected:Schema=type==='password'?{type:'string',format:'password'}:this.declaredDynamicTypes(base).length?{...base,type}:{type};
  let next:any;
  if(type==='object'&&isFreeSchema(selected))next={};
  else if(type==='array'&&this.isUnconstrainedArray(selected))next=[];
  else next=initial(selected,this.root);
  this.updateMapValue(key,next);
 }
 setDynamicNull(s:Schema,key:string,checked:boolean){
  if(!this.dynamicAllowsNull(s,key))return;
  delete this.dynamicJsonDraftValues[key];delete this.dynamicJsonErrors[key];
  if(checked){this.updateMapValue(key,null);return;}
  const options=this.dynamicTypeOptions(s,key),type=this.dynamicChosenTypes[key]&&options.includes(this.dynamicChosenTypes[key])?this.dynamicChosenTypes[key]:options[0];
  if(!type){this.updateMapValue(key,null);return;}
  this.dynamicChosenTypes[key]=type;
  const base=this.dynamicSchema(s,key),selected:Schema=this.declaredDynamicTypes(base).length?{...base,type}:{type};
  const next=type==='object'&&isFreeSchema(selected)?{}:type==='array'&&this.isUnconstrainedArray(selected)?[]:initial(selected,this.root);
  this.updateMapValue(key,next);
 }
 dynamicJsonText(s:Schema,key:string,value:any):string{
  if(Object.prototype.hasOwnProperty.call(this.dynamicJsonDraftValues,key))return this.dynamicJsonDraftValues[key];
  const type=this.dynamicActiveType(s,key,value);
  if(type==='array')return this.jsonValue(Array.isArray(value)?value:[]);
  return this.jsonValue(value&&typeof value==='object'&&!Array.isArray(value)?value:{});
 }
 dynamicJsonError(key:string){return this.dynamicJsonErrors[key]||'';}
 private validateDynamicStructure(s:Schema,key:string,text:string):any{
  const parsed=JSON.parse(text),type=this.dynamicActiveType(s,key,this.objectValue[key]);
  if(type==='array'&&!Array.isArray(parsed))throw new Error('O valor deve ser uma lista JSON.');
  if(type==='object'&&(!parsed||typeof parsed!=='object'||Array.isArray(parsed)))throw new Error('O valor deve ser um objeto JSON.');
  return parsed;
 }
 dynamicJsonChanged(s:Schema,key:string,text:string){
  this.dynamicJsonDraftValues[key]=text;
  try{const parsed=this.validateDynamicStructure(s,key,text);this.dynamicJsonErrors[key]='';this.updateMapValue(key,parsed);}
  catch(error){this.dynamicJsonErrors[key]=error instanceof Error?error.message:'JSON inválido.';}
 }
 formatDynamicJson(s:Schema,key:string,value:any){
  const source=this.dynamicJsonText(s,key,value);
  try{const parsed=this.validateDynamicStructure(s,key,source);this.dynamicJsonDraftValues[key]=JSON.stringify(parsed,null,2);this.dynamicJsonErrors[key]='';this.updateMapValue(key,parsed);}
  catch(error){this.dynamicJsonErrors[key]=error instanceof Error?error.message:'JSON inválido.';}
 }
 dynamicJsonPlaceholder(s:Schema,key:string,value:any){return this.dynamicActiveType(s,key,value)==='array'?'[\n  "valor"\n]':'{\n  "chave": "valor"\n}';}
 freeValuePlaceholder(){return 'Ex.: "texto", 123, true, null, objeto JSON ou lista JSON';}
 keyIssue(s:Schema,key:string){const propertyIssue=propertyNameIssue(s,key,this.root);if(propertyIssue)return propertyIssue;const dynamic=additionalSchemaForKey(s,key,this.root);return isFalseSchema(dynamic)?'Esta chave não é permitida pelo schema.':'';}
 updateKey(key:string,value:any){const next={...this.objectValue};if(value===undefined)delete next[key];else next[key]=value;this.emit(next);}
 updateMapValue(key:string,value:any){const next={...this.objectValue};if(value===undefined)delete next[key];else next[key]=value;this.emit(next);}
 renameDynamicKey(s:Schema,oldKey:string,newKey:string){
  const key=newKey.trim();if(!key||key===oldKey||key in this.objectValue||key in (s.properties||{}))return;
  const next:Record<string,any>={};for(const [current,value] of Object.entries(this.objectValue))next[current===oldKey?key:current]=value;
  if(this.dynamicChosenTypes[oldKey]){this.dynamicChosenTypes[key]=this.dynamicChosenTypes[oldKey];delete this.dynamicChosenTypes[oldKey];}
  if(Object.prototype.hasOwnProperty.call(this.dynamicJsonDraftValues,oldKey)){this.dynamicJsonDraftValues[key]=this.dynamicJsonDraftValues[oldKey];delete this.dynamicJsonDraftValues[oldKey];}
  if(Object.prototype.hasOwnProperty.call(this.dynamicJsonErrors,oldKey)){this.dynamicJsonErrors[key]=this.dynamicJsonErrors[oldKey];delete this.dynamicJsonErrors[oldKey];}
  this.emit(next);
 }
 removeDynamicKey(s:Schema,key:string){if(key in (s.properties||{})||!this.canRemoveProperty(s))return;const next={...this.objectValue};delete next[key];delete this.dynamicChosenTypes[key];delete this.dynamicJsonDraftValues[key];delete this.dynamicJsonErrors[key];this.emit(next);}
 private nextDynamicKey(s:Schema):string|undefined {
  const patterns=Object.keys(s.patternProperties||{});
  const prefixes=patterns.map(pattern=>{
   if(!pattern.startsWith('^'))return '';
   const match=pattern.slice(1).match(/^(?:[a-zA-Z0-9_-]|\\[.\\-])+/);
   return match?match[0].replace(/\\([.\\-])/g,'$1'):'';
  });
  const bases=[...prefixes.filter(Boolean).map(prefix=>prefix+'key'),'key'];
  for(const base of bases){
   for(let index=0;index<1000;index++){
    const key=index===0?base:`${base}${index+1}`;
    if(key in this.objectValue||key in (s.properties||{}))continue;
    if(propertyNameIssue(s,key,this.root))continue;
    if(isFalseSchema(additionalSchemaForKey(s,key,this.root)))continue;
    return key;
   }
  }
  return undefined;
 }
 addDynamicProperty(s:Schema){
  if(!this.canAddProperty(s))return;
  const key=this.nextDynamicKey(s);
  if(!key)return;
  const child=additionalSchemaForKey(s,key,this.root),types=this.dynamicTypeOptions(s,key),type=types[0];
  if(!type&&this.dynamicAllowsNull(s,key)){this.emit({...this.objectValue,[key]:null});return;}
  if(type)this.dynamicChosenTypes[key]=type;
  const selected:Schema=type==='password'?{type:'string',format:'password'}:this.declaredDynamicTypes(child).length&&type?{...child,type}:type?{type}:child;
  const next=type==='object'&&isFreeSchema(selected)?{}:type==='array'&&this.isUnconstrainedArray(selected)?[]:initial(selected,this.root);
  this.emit({...this.objectValue,[key]:next});
 }
 canAddProperty(s:Schema){return s.maxProperties===undefined||this.objectPropertyCount<s.maxProperties;}
 canRemoveProperty(s:Schema){return s.minProperties===undefined||this.objectPropertyCount>s.minProperties;}

 multiSearch='';
 arrayWidget(s:Schema):string{return s['x-ui']?.widget||'list';}
 multiOptionLabel(s:Schema,option:any):string{return String((s['x-ui']?.options||[]).find((entry:any)=>Object.is(entry.value,option))?.label??option);}
 filteredMultiOptions(s:Schema):any[]{const options=this.multiSelectOptions(s);return this.arrayWidget(s)==='multiselect'&&this.multiSearch?options.filter(option=>this.multiOptionLabel(s,option).toLowerCase().includes(this.multiSearch.toLowerCase())):options;}
 isMultiSelect(s:Schema){const item=arrayItemSchema(s,0,this.root);return !s.prefixItems&&Array.isArray(item.enum)&&item.enum.length>0&&this.arrayWidget(s)!=='list';}
 multiSelectOptions(s:Schema):any[]{return arrayItemSchema(s,0,this.root).enum||[];}
 isMultiSelected(option:any){return this.arrayValue.some(value=>Object.is(value,option));}
 isMultiDisabled(s:Schema,option:any){return !this.isMultiSelected(option)&&s.maxItems!==undefined&&this.arrayValue.length>=s.maxItems;}
 toggleMultiSelect(option:any,checked:boolean){const next=checked?[...this.arrayValue.filter(value=>!Object.is(value,option)),option]:this.arrayValue.filter(value=>!Object.is(value,option));this.emit(next);}
 itemSchema(s:Schema,index:number){return arrayItemSchema(s,index,this.root);}
 hasTuple(s:Schema){return Array.isArray(s.prefixItems)&&s.prefixItems.length>0;}
 canAddArrayItem(s:Schema){if(s.maxItems!==undefined&&this.arrayValue.length>=s.maxItems)return false;return !isFalseSchema(arrayItemSchema(s,this.arrayValue.length,this.root));}
 addArrayItem(s:Schema){if(!this.canAddArrayItem(s))return;this.emit([...this.arrayValue,initial(arrayItemSchema(s,this.arrayValue.length,this.root),this.root)]);}
 updateItem(index:number,value:any){const next=[...this.arrayValue];next[index]=value;this.emit(next);}
 remove(index:number){this.emit(this.arrayValue.filter((_,current)=>current!==index));}
 move(index:number,direction:number){const target=index+direction;if(target<0||target>=this.arrayValue.length)return;const next=[...this.arrayValue];[next[index],next[target]]=[next[target],next[index]];this.emit(next);}
 hasDuplicates(){return new Set(this.arrayValue.map(value=>JSON.stringify(value))).size!==this.arrayValue.length;}
 matchesContains(s:Schema,item:any){return !!s.contains&&matches(s.contains,item,this.root);}

 numericChanged(input:HTMLInputElement,s:Schema){const raw=input.value.trim();if(raw===''){this.emit(isNullable(s)?null:(!this.required?undefined:undefined));return;}const number=Number(raw);if(!Number.isFinite(number)){input.value=String(this.value??'');return;}if(primaryType(s)==='integer'&&!Number.isInteger(number)){input.value=String(this.value??'');return;}this.emit(number);}
 formattedInputValue(s:Schema):string {
  if(typeof this.value!=='string')return '';
  if(s.format==='date-time'){
   const match=this.value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/);
   if(match){
    const date=new Date(this.value);
    if(!Number.isNaN(date.getTime())){
     const pad=(n:number)=>String(n).padStart(2,'0');
     return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
   }
   return this.value;
  }
  if(s.format==='time')return this.value.replace(/^(\d{2}:\d{2}):\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,'$1');
  return this.value;
 }
 formattedInputChanged(s:Schema,value:string){
  if(s.format==='date-time' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)){
   const date=new Date(value);
   if(!Number.isNaN(date.getTime())){this.emit(date.toISOString());return;}
  }
  if(s.format==='time' && /^\d{2}:\d{2}(?::\d{2})?$/.test(value)){
   const offsetMinutes=-new Date().getTimezoneOffset();
   const sign=offsetMinutes>=0?'+':'-';
   const pad=(n:number)=>String(n).padStart(2,'0');
   const offset=`${sign}${pad(Math.floor(Math.abs(offsetMinutes)/60))}:${pad(Math.abs(offsetMinutes)%60)}`;
   this.emit((value.length===5?value+':00':value)+offset);
   return;
  }
  this.emit(value);
 }
 inputType(s:Schema){switch(s.format){case 'password':return 'password';case 'email':return 'email';case 'date':return 'date';case 'date-time':return 'datetime-local';case 'time':return 'time';case 'uri':case 'url':return 'url';default:return 'text';}}
 placeholder(s:Schema){const example=Array.isArray(s.examples)?s.examples[0]:s.example;return example===undefined?'':typeof example==='string'?example:JSON.stringify(example);}
 jsonValue(value:any){try{return JSON.stringify(value,null,2)??'';}catch{return String(value??'');}}
 freeChanged(input:HTMLTextAreaElement){try{this.emit(JSON.parse(input.value));input.setCustomValidity('');}catch{input.setCustomValidity('JSON inválido');input.reportValidity();}}

 childPath(key:string){return `${this.path}/${this.escapePointer(key)}`;}indexPath(index:number){return `${this.path}/${index}`;}
 isInvalid(path:string){return this.issues.some(issue=>issue.path===this.normalizedPath(path));}
 firstError(path:string){return this.issues.find(issue=>issue.path===this.normalizedPath(path))?.message||'';}
 private normalizedPath(path:string){return path||'/';}
 private escapePointer(value:string){return value.replace(/~/g,'~0').replace(/\//g,'~1');}
}
