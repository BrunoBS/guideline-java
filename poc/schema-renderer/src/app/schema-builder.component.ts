import {Component,EventEmitter,Input,Output,OnChanges,SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Schema} from './schema-engine';

type NodeRow={path:string;label:string;depth:number;schema:Schema;required:boolean};
@Component({
 selector:'app-schema-builder',
 standalone:true,
 imports:[CommonModule,FormsModule],
 styles:[`
 .builder.simplified{grid-template-columns:minmax(330px,1fr) minmax(320px,1fr)}
 .builder.simplified .palette{grid-column:1;grid-row:2;position:static}
 .builder.simplified .canvas{grid-column:1;grid-row:1;min-height:340px}
 .builder.simplified .inspector{grid-column:2;grid-row:1 / span 2}
 @media(max-width:760px){.builder.simplified{grid-template-columns:1fr}.builder.simplified .palette,.builder.simplified .canvas,.builder.simplified .inspector{grid-column:1;grid-row:auto}}
 .builder{display:grid;grid-template-columns:minmax(180px,.72fr) minmax(300px,1.4fr) minmax(280px,1.12fr);gap:16px;align-items:start}
 .palette,.canvas{border:1px solid #d9dfe9;border-radius:12px;padding:18px;background:#fff;min-width:0}
 .palette{position:sticky;top:12px}
 .palette-item{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:#f7f9fd;color:#17315c;border:1px solid #e0e7f3;border-radius:9px;padding:11px;margin:7px 0;cursor:pointer;font-weight:600}
 .palette-item:hover{background:#e8efff;border-color:#7fa5e9}
 .canvas{min-height:420px;background:#fbfcff}
 .canvas-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
 .canvas-header p{font-size:12px;color:#586477;margin:5px 0}
 .canvas-fields{display:grid;gap:10px}
 .canvas-field{display:block;width:100%;padding:14px 16px;border:1px solid #dce4ef;background:#fff;color:#26354d;border-radius:10px;text-align:left;cursor:pointer;box-shadow:0 2px 5px rgba(20,40,80,.035)}
 .canvas-field:hover{border-color:#88a9e7;background:#f8faff}
 .canvas-field.active{border:2px solid #2455b5;background:#f0f5ff;padding:13px 15px}
 .canvas-field-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:700}
 .canvas-field-meta{display:block;margin-top:5px;font-size:12px;color:#68778f}
 .canvas-field-placeholder{display:block;margin-top:10px;padding:9px 12px;border:1px solid #dce4ef;border-radius:7px;background:#f8fafc;color:#8793a6;font-size:13px}
 .canvas-empty{border:2px dashed #c7d5e9;border-radius:12px;padding:32px 15px;text-align:center;color:#65758d}
 .canvas-add{margin-top:14px;width:100%;border:1px dashed #7d9ed8;background:#f4f8ff;color:#17448c;border-radius:9px;padding:12px;cursor:pointer}
 .structure-toggle{margin:12px 0 0;background:transparent;color:#2455b5;border:0;cursor:pointer;text-align:left;padding:6px}
 .structure-panel{margin-top:10px;border-top:1px solid #e3e9f2;padding-top:12px}
 .inspector{max-height:calc(100vh - 110px);overflow-y:auto;position:sticky;top:12px}
 @media(max-width:1100px){.builder{grid-template-columns:minmax(170px,.65fr) minmax(260px,1fr)}.inspector{grid-column:1/-1;position:static;max-height:none}}
 @media(max-width:760px){.builder{grid-template-columns:1fr}.palette{position:static}.inspector{grid-column:auto}}
 .tree,.inspector{border:1px solid #d9dfe9;border-radius:10px;padding:18px;min-width:0;background:#fff}
 .tree{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:4px;align-self:start}
 .tree>strong{margin-bottom:4px}
 .tree>.builder-help{margin:0 0 12px;line-height:1.5}
 .inspector{align-self:start}
 .tree-row{display:flex;flex:0 0 auto;align-items:center;justify-content:flex-start;gap:8px;width:100%;min-height:38px;height:auto;margin:0;text-align:left;border:0;background:transparent;color:#26354d;padding:9px;border-radius:6px;cursor:pointer;font:inherit;line-height:1.3;box-shadow:none}
 .tree-row span,.tree-row small{color:inherit}
 .tree-row small{font-size:12px;opacity:.75}
 .tree-row:focus-visible{outline:2px solid #1455c0;outline-offset:2px}
 .tree-row.selected{background:#e8efff;color:#003399;font-weight:700}
 .tree-row:hover{background:#f2f5fa;color:#003399}
 .inspector label{display:grid;gap:5px;margin-bottom:12px;font-weight:600}
 .inspector input,.inspector select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #b8c4d4;border-radius:6px;background:white}
 .builder-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
 .builder-actions button{padding:8px 12px;cursor:pointer}
 .inspector>strong{display:block;margin-bottom:12px}
 .inspector label{line-height:1.4}
 .inspector .builder-actions{margin:0 0 14px}
 .inspector .builder-actions button{border-radius:7px}
 .inspector input:focus-visible,.inspector select:focus-visible,.inspector textarea:focus-visible{outline:2px solid #1455c0;outline-offset:1px}
 .builder-help{font-size:12px;color:#586477}
 .builder-error{color:#b42318}
 .composition-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
 .composition-actions input{flex:1 1 180px;min-width:0}
 .composition-row{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid #edf0f5}
 .composition-row button{cursor:pointer}
 .rule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .rule-grid label{min-width:0}
 .rule-heading{margin:20px 0 12px;border-top:1px solid #e0e5ef;padding-top:14px}
 .inspector textarea{width:100%;box-sizing:border-box;min-height:84px;border:1px solid #b8c4d4;border-radius:6px;padding:9px}
 .inspector .checkline{display:flex;align-items:center;gap:8px;font-weight:500}
 .inspector .checkline input{width:auto}
 @media(max-width:760px){.builder{grid-template-columns:1fr}.tree,.inspector{padding:14px}.rule-grid{grid-template-columns:1fr}}
 `],
 template:`
 <div class="builder simplified">
  <aside class="palette" *ngIf="showAddMenu">
   <strong>Adicionar componentes</strong>
   <p class="builder-help">Escolha um tipo para adicionar ao formulário ou ao objeto selecionado.</p>
   <button type="button" class="palette-item" *ngFor="let item of palette" (click)="addTypedProperty(item.type)"><span>{{item.icon}}</span> {{item.label}} <span style="margin-left:auto">+</span></button>
   <button type="button" class="structure-toggle" (click)="showStructure=!showStructure">{{showStructure?'▾ Ocultar':'▸ Mostrar'}} estrutura completa</button>
   <div class="structure-panel tree" *ngIf="showStructure">
   <strong>Estrutura do schema</strong>
   <p class="builder-help">Selecione qualquer nó, inclusive definições e regras.</p>
   <button *ngFor="let row of rows" type="button" class="tree-row" [class.selected]="selectedPath===row.path" [style.padding-left.px]="9+row.depth*12" (click)="select(row.path)">
    <span>{{row.depth ? '↳' : '▣'}}</span><span>{{row.label}}</span><small>({{typeLabel(row.schema)}})</small>
   </button>
   </div>
  </aside>
  <section class="canvas">
   <div class="canvas-header"><div><strong>Campos do schema</strong><p>Selecione um card para editar seu contrato.</p></div><span class="builder-help">{{canvasFields.length}} campos</span></div>
   <div class="canvas-fields">
    <button type="button" class="canvas-field" *ngFor="let field of canvasFields" [class.active]="selectedPath===field.path" (click)="select(field.path)">
     <span class="canvas-field-title"><span>{{field.schema.title||field.label}} <span *ngIf="field.required">*</span></span><small>{{typeLabel(field.schema)}}</small></span>
     <span class="canvas-field-meta">{{field.schema.description||field.label}}</span>
     <span class="canvas-field-meta">{{field.required?'Obrigatório':'Opcional'}} · Clique para configurar</span>
    </button>
   </div>
   <div class="canvas-empty" *ngIf="!canvasFields.length">Seu formulário está vazio. Adicione um componente pelo painel à esquerda.</div>
   <button type="button" class="canvas-add" (click)="showAddMenu=!showAddMenu">＋ Adicionar campo</button>
  </section>
  <div class="inspector" *ngIf="selectedPath && selected as node">
   <div class="canvas-header"><strong>Editar campo</strong><button type="button" (click)="select('')">Fechar</button></div>
   <div class="builder-actions">
    <button type="button" *ngIf="node.type==='object'" (click)="addProperty()">+ Propriedade</button>
    <button type="button" *ngIf="node.type==='array'" (click)="addItems()">+ Definir items</button>
    <button type="button" *ngIf="selectedPath!==''" (click)="removeSelected()">Excluir nó</button>
   </div>
   <label *ngIf="isPropertySelected">Nome da propriedade
    <input [ngModel]="selectedName" (change)="renameSelected($any($event.target).value)"/>
   </label>
   <label>Título<input [ngModel]="node.title||''" (ngModelChange)="setAttribute('title',$event)"/></label>
   <label>Descrição<input [ngModel]="node.description||''" (ngModelChange)="setAttribute('description',$event)"/></label>
   <label>Tipo
    <select [ngModel]="node.type||'object'" (ngModelChange)="setType($event)">
     <option *ngFor="let t of types" [value]="t">{{t}}</option>
    </select>
   </label>
   <label *ngIf="selectedPath!=='' && !selectedPath.endsWith('/items')" style="display:flex;align-items:center;gap:8px">
    <input type="checkbox" style="width:auto" [ngModel]="selectedRequired" (ngModelChange)="setRequired($event)"/> Obrigatório
   </label>
   <h4 class="rule-heading">Validações</h4>
   <ng-container *ngIf="node.type==='string'">
    <label>Formato
     <select [ngModel]="node.format||''" (ngModelChange)="setOptional('format',$event)">
      <option value="">Sem formato</option>
      <option *ngFor="let format of formats" [value]="format">{{format}}</option>
     </select>
    </label>
    <div class="rule-grid">
     <label>Tamanho mínimo<input type="number" min="0" step="1" [ngModel]="node.minLength" (ngModelChange)="setNumber('minLength',$event,0,true)"/></label>
     <label>Tamanho máximo<input type="number" min="0" step="1" [ngModel]="node.maxLength" (ngModelChange)="setNumber('maxLength',$event,0,true)"/></label>
    </div>
    <label>Expressão regular (pattern)<input [ngModel]="node.pattern||''" (ngModelChange)="setPattern($event)" placeholder="^[A-Za-z]+$"/></label>
   </ng-container>
   <div class="rule-grid" *ngIf="node.type==='integer'||node.type==='number'">
    <label>Mínimo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.minimum" (ngModelChange)="setNumber('minimum',$event,undefined,node.type==='integer')"/></label>
    <label>Máximo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.maximum" (ngModelChange)="setNumber('maximum',$event,undefined,node.type==='integer')"/></label>
    <label>Exclusivo mínimo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.exclusiveMinimum" (ngModelChange)="setNumber('exclusiveMinimum',$event,undefined,node.type==='integer')"/></label>
    <label>Exclusivo máximo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.exclusiveMaximum" (ngModelChange)="setNumber('exclusiveMaximum',$event,undefined,node.type==='integer')"/></label>
    <label>Múltiplo de<input type="number" min="0" [step]="node.type==='integer'?1:'any'" [ngModel]="node.multipleOf" (ngModelChange)="setNumber('multipleOf',$event,0,node.type==='integer',true)"/></label>
   </div>
   <div class="rule-grid" *ngIf="node.type==='array'">
    <label>Mínimo de itens<input type="number" min="0" step="1" [ngModel]="node.minItems" (ngModelChange)="setNumber('minItems',$event,0,true)"/></label>
    <label>Máximo de itens<input type="number" min="0" step="1" [ngModel]="node.maxItems" (ngModelChange)="setNumber('maxItems',$event,0,true)"/></label>
   </div>
   <label *ngIf="node.type==='array'" class="checkline"><input type="checkbox" [ngModel]="!!node.uniqueItems" (ngModelChange)="setBoolean('uniqueItems',$event)"/> Itens únicos</label>
   <div class="rule-grid" *ngIf="node.type==='object'">
    <label>Mínimo de propriedades<input type="number" min="0" step="1" [ngModel]="node.minProperties" (ngModelChange)="setNumber('minProperties',$event,0,true)"/></label>
    <label>Máximo de propriedades<input type="number" min="0" step="1" [ngModel]="node.maxProperties" (ngModelChange)="setNumber('maxProperties',$event,0,true)"/></label>
   </div>
   <label *ngIf="node.type==='object'" class="checkline"><input type="checkbox" [ngModel]="node.additionalProperties!==false" (ngModelChange)="setBoolean('additionalProperties',$event)"/> Permitir propriedades adicionais</label>
   <label *ngIf="node.type!=='object'&&node.type!=='array'">Enum (um valor JSON por linha)
    <textarea [ngModel]="enumText(node)" (change)="setEnum($any($event.target).value)" placeholder="Exemplo:&#10;&quot;ATIVO&quot;&#10;&quot;INATIVO&quot;"></textarea>
   </label>
   <h4 class="rule-heading">Composições visuais</h4>
   <div *ngFor="let kind of compositionKinds">
    <strong>{{kind}}</strong>
    <div class="composition-actions"><button type="button" (click)="addComposition(kind)">+ Alternativa</button></div>
    <div *ngFor="let branch of node[kind];let i=index" class="composition-row">
     <button type="button" class="tree-row" (click)="select(selectedPath+'/'+kind+'/'+i)">Editar {{kind}} #{{i+1}}</button>
     <button type="button" (click)="removeComposition(kind,i)">Excluir</button>
    </div>
   </div>
   <h4 class="rule-heading">Condicionais</h4>
   <div class="composition-actions">
    <button type="button" *ngFor="let kind of conditionalKinds" (click)="toggleConditional(kind)">{{node[kind]===undefined?'Adicionar':'Remover'}} {{kind}}</button>
   </div>
   <div class="composition-actions">
    <button type="button" *ngFor="let kind of conditionalKinds" [disabled]="node[kind]===undefined" (click)="select(selectedPath+'/'+kind)">Editar {{kind}}</button>
   </div>
   <h4 class="rule-heading">Definições reutilizáveis</h4>
   <div class="composition-actions"><input aria-label="Nome da definição" placeholder="Nome da definição" [(ngModel)]="newDefinitionName"/><button type="button" (click)="addNamedSchema('$defs')">+ Definição ($defs)</button></div>
   <div *ngFor="let entry of entries(node['$defs'])" class="composition-row">
    <button type="button" class="tree-row" (click)="select(selectedPath+'/$defs/'+escapePath(entry[0]))">{{entry[0]}}</button>
    <button type="button" (click)="removeNamedSchema('$defs',entry[0])">Excluir</button>
   </div>
   <label>Referência ($ref)
    <select [ngModel]="node['$ref']||''" (ngModelChange)="setReference($event)">
     <option value="">Sem referência</option>
     <option *ngFor="let name of definitionNames" [value]="'#/$defs/'+escapePath(name)">{{name}}</option>
     <option *ngIf="node['$ref'] && !isLocalDefinitionRef(node['$ref'])" [value]="node['$ref']">{{node['$ref']}} (externa ou personalizada)</option>
    </select>
   </label>
   <p class="builder-help">Referências externas existentes são preservadas. Para criá-las, use o editor avançado.</p>
   <h4 class="rule-heading" *ngIf="node.type==='object'">Propriedades dinâmicas</h4>
   <ng-container *ngIf="node.type==='object'">
    <div class="composition-actions"><input aria-label="Expressão regular da chave" placeholder="Ex.: ^custom_" [(ngModel)]="newPatternName"/><button type="button" (click)="addNamedSchema('patternProperties')">+ Padrão de chave</button></div>
    <div *ngFor="let entry of entries(node.patternProperties)" class="composition-row">
     <button type="button" class="tree-row" (click)="select(selectedPath+'/patternProperties/'+escapePath(entry[0]))">{{entry[0]}}</button>
     <button type="button" (click)="removeNamedSchema('patternProperties',entry[0])">Excluir</button>
    </div>
    <label>Schema de propriedades adicionais
     <select [ngModel]="additionalMode(node)" (ngModelChange)="setAdditionalMode($event)">
      <option value="allow">Permitir qualquer valor</option>
      <option value="deny">Não permitir</option>
      <option value="schema">Validar por schema</option>
     </select>
    </label>
    <button type="button" *ngIf="additionalMode(node)==='schema'" (click)="select(selectedPath+'/additionalProperties')">Editar schema adicional</button>
   </ng-container>
   <h4 class="rule-heading">Regras avançadas</h4>
   <p class="builder-help">Edite as regras JSON deste nó para usar if/then/else, allOf, oneOf, anyOf, not, $defs, $ref, patternProperties e dependências. O restante do nó será preservado.</p>
   <label>Regras avançadas (JSON)
    <textarea [ngModel]="advancedText(node)" (change)="setAdvanced($any($event.target).value)" style="min-height:150px;font-family:monospace"></textarea>
   </label>
   <p class="builder-help">Os campos não suportados visualmente são preservados. Enum deve conter valores JSON válidos, um por linha.</p>
   <p class="builder-error" *ngIf="error">{{error}}</p>
  </div>
 </div>`
})
export class SchemaBuilderComponent implements OnChanges {
 @Input() schema:Schema={type:'object',properties:{}};
 @Output() schemaChange=new EventEmitter<Schema>();
 selectedPath='';
 error='';
 types=['string','integer','number','boolean','object','array','null'];
 compositionKinds=['oneOf','anyOf','allOf'];
 conditionalKinds=['if','then','else'];
 formats=['email','uri','uuid','date','date-time','time','hostname','ipv4','ipv6','password','regex'];
 rows:NodeRow[]=[];
 showAddMenu=false;
 showStructure=false;
 palette=[{type:'string',label:'Texto',icon:'T'},{type:'integer',label:'Inteiro',icon:'#'},{type:'number',label:'Decimal',icon:'½'},{type:'boolean',label:'Sim / Não',icon:'☑'},{type:'object',label:'Grupo',icon:'▣'},{type:'array',label:'Lista',icon:'☷'}];
 get canvasFields(){return this.rows.filter(row=>row.path.startsWith('/properties/')&&row.depth===1);}
 addTypedProperty(type:string){
  const targetPath=this.selected?.type==='object'?this.selectedPath:'';
  const node=this.getNodeAt(this.schema,targetPath);
  if(!node||node.type!=='object'){this.error='Selecione um objeto para adicionar campos.';return;}
  this.error='';
  this.commit(root=>{
   const target=this.getNodeAt(root,targetPath)!;
   target.properties??={};
   let key='campo',i=2;while(Object.prototype.hasOwnProperty.call(target.properties,key))key='campo'+i++;
   target.properties[key]=type==='object'?{type,properties:{},title:key}:type==='array'?{type,items:{type:'string'},title:key}:{type,title:key};
   this.selectedPath=targetPath+'/properties/'+this.escape(key);
  });
 }
 newDefinitionName='';
 newPatternName='';
 get isPropertySelected(){const parts=this.segments(this.selectedPath);return parts.length>=2&&parts[parts.length-2]==='properties';}
 entries(value:any):[string,any][]{return value&&typeof value==='object'&&!Array.isArray(value)?Object.entries(value):[];}
 escapePath(value:string){return this.escape(value);}
 get definitionNames(){return Object.keys(this.schema?.['$defs']||{});}
 isLocalDefinitionRef(ref:string){return this.definitionNames.some(name=>ref==='#/$defs/'+this.escape(name));}
 additionalMode(node:Schema){return node.additionalProperties===false?'deny':node.additionalProperties&&typeof node.additionalProperties==='object'?'schema':'allow';}
 setAdditionalMode(mode:string){
  this.commit(root=>{
   const node=this.current(root)!;
   if(mode==='deny')node.additionalProperties=false;
   else if(mode==='schema')node.additionalProperties={type:'string'};
   else node.additionalProperties=true;
  });
 }
 setReference(ref:string){this.commit(root=>{const node=this.current(root)!;if(ref)node['$ref']=ref;else delete node['$ref'];});}
 addNamedSchema(kind:'$defs'|'patternProperties'){
  const name=kind==='$defs'?'Definicao':'^campo_';
  const proposed=kind==='$defs'?this.newDefinitionName:this.newPatternName;
  if(!proposed.trim()){this.error='Informe um nome.';return;}
  const key=proposed.trim();
  if(!key){this.error='Informe um nome.';return;}
  if(kind==='patternProperties'){try{new RegExp(key);}catch{this.error='Padrão regex inválido.';return;}}
  const node=this.selected!;
  if(node[kind]&&Object.prototype.hasOwnProperty.call(node[kind],key)){this.error='Nome já utilizado.';return;}
  this.error='';
  this.commit(root=>{
   const target=this.current(root)!;target[kind]??={};target[kind][key]={type:'string'};
   this.selectedPath+='/'+kind+'/'+this.escape(key);
  });
  if(kind==='$defs')this.newDefinitionName='';else this.newPatternName='';
 }
 removeNamedSchema(kind:'$defs'|'patternProperties',key:string){
  this.error='';
  if(kind==='$defs'){
   const reference='#/$defs/'+this.escape(key);
   const usesReference=(value:any):boolean=>{
    if(!value||typeof value!=='object')return false;
    if(value['$ref']===reference)return true;
    return Object.values(value).some(usesReference);
   };
   if(usesReference(this.schema)){this.error='A definição possui referências. Remova os vínculos primeiro.';return;}
  }
  this.commit(root=>{
   const node=this.current(root)!;delete node[kind]?.[key];
   if(node[kind]&&!Object.keys(node[kind]).length)delete node[kind];
  });
 }
 ngOnChanges(_changes:SimpleChanges){this.rebuild();}
 private segments(path:string){return path.split('/').slice(1).map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'));}
 private escape(key:string){return key.replace(/~/g,'~0').replace(/\//g,'~1');}
 private getNode(root:Schema,path:string):Schema|undefined {return this.getNodeAt(root,path);}
 get selected(){return this.getNode(this.schema,this.selectedPath);}
 get selectedName(){return this.segments(this.selectedPath).at(-1)||'';}
 get selectedRequired(){
  const parts=this.segments(this.selectedPath),name=parts.pop();
  if(parts.pop()!=='properties')return false;
  const parent=this.getNodeAt(this.schema,'/'+parts.map(p=>this.escape(p)).join('/'));
  return !!name&&!!parent?.required?.includes(name);
 }
 typeLabel(node:Schema){return Array.isArray(node.type)?node.type.join('|'):node.type||'livre';}
 select(path:string){this.selectedPath=path;this.error='';}
 private rebuild(){
  const rows:NodeRow[]=[];
  const walk=(node:Schema,path:string,label:string,depth:number,required=false)=>{
   if(depth>20)return;
   rows.push({path,label,depth,schema:node,required});
   if(node.type==='object'&&node.properties)for(const [key,child] of Object.entries(node.properties)){
    if(child&&typeof child==='object'&&!Array.isArray(child))walk(child as Schema,path+'/properties/'+this.escape(key),key,depth+1,(node.required||[]).includes(key));
   }
   if(node.type==='array'&&node.items&&typeof node.items==='object'&&!Array.isArray(node.items))walk(node.items,path+'/items','items',depth+1);
   for(const kind of this.compositionKinds)if(Array.isArray(node[kind]))node[kind].forEach((child:any,index:number)=>{if(child&&typeof child==='object'&&!Array.isArray(child))walk(child,path+'/'+kind+'/'+index,kind+' #'+(index+1),depth+1);});
   for(const kind of this.conditionalKinds)if(node[kind]&&typeof node[kind]==='object'&&!Array.isArray(node[kind]))walk(node[kind],path+'/'+kind,kind,depth+1);
   for(const kind of ['$defs','patternProperties'])for(const [key,child] of this.entries(node[kind]))if(child&&typeof child==='object'&&!Array.isArray(child))walk(child,path+'/'+kind+'/'+this.escape(key),key,depth+1);
   if(node.additionalProperties&&typeof node.additionalProperties==='object'&&!Array.isArray(node.additionalProperties))walk(node.additionalProperties,path+'/additionalProperties','additionalProperties',depth+1);
  };
  walk(this.schema,'','Schema',0);
  this.rows=rows;
  if(!this.getNode(this.schema,this.selectedPath))this.selectedPath='';
 }
 private getNodeAt(root:Schema,path:string):Schema|undefined {
  if(!path||path==='/')return root;
  const parts=this.segments(path);
  let node:any=root;
  for(let i=0;i<parts.length;i++){
   if(parts[i]==='properties'){node=node?.properties?.[parts[++i]];}
   else if(parts[i]==='items'){node=node?.items;}
   else if(this.compositionKinds.includes(parts[i])){node=node?.[parts[i]]?.[Number(parts[++i])];}
   else if(this.conditionalKinds.includes(parts[i])){node=node?.[parts[i]];}
   else if(parts[i]==='$defs'||parts[i]==='patternProperties'){node=node?.[parts[i]]?.[parts[++i]];}
   else if(parts[i]==='additionalProperties'){node=node?.additionalProperties;}
   else return undefined;
  }
  return node&&typeof node==='object'&&!Array.isArray(node)?node:undefined;
 }
 private commit(edit:(root:Schema)=>void){
  const next=structuredClone(this.schema);
  edit(next);
  this.schemaChange.emit(next);
 }
 private current(root:Schema){return this.getNodeAt(root,this.selectedPath);}
 addProperty(){
  this.error='';
  const node=this.selected;if(!node||node.type!=='object')return;
  this.commit(root=>{
   const target=this.current(root)!;
   target.properties??={};
   let key='campo',i=2;while(Object.prototype.hasOwnProperty.call(target.properties,key))key='campo'+i++;
   target.properties[key]={type:'string',title:key};
   this.selectedPath+='/properties/'+this.escape(key);
  });
 }
 addItems(){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(node.items===undefined)node.items={type:'string'};
   if(typeof node.items==='object'&&!Array.isArray(node.items))this.selectedPath+='/items';
  });
 }
 setAttribute(key:'title'|'description',value:string){this.commit(root=>{const node=this.current(root)!;if(value)node[key]=value;else delete node[key];});}
 setOptional(key:string,value:string){this.error='';this.commit(root=>{const node=this.current(root)!;if(value)node[key]=value;else delete node[key];});}
 setNumber(key:string,value:any,min?:number,integer=false,strictPositive=false){
  this.error='';
  if(value===''||value===null||value===undefined){this.commit(root=>{delete this.current(root)![key];});return;}
  const n=Number(value);
  if(!Number.isFinite(n)||(min!==undefined&&n<min)||(integer&&!Number.isInteger(n))||(strictPositive&&n<=0)){this.error='Número inválido para '+key;return;}
  this.commit(root=>{this.current(root)![key]=n;});
 }
 setPattern(value:string){
  this.error='';
  if(value){try{new RegExp(value);}catch{this.error='Expressão regular inválida.';return;}}
  this.setOptional('pattern',value);
 }
 setBoolean(key:string,value:boolean){this.error='';this.commit(root=>{this.current(root)![key]=value;});}
 enumText(node:Schema):string{return Array.isArray(node.enum)?node.enum.map((v:any)=>JSON.stringify(v)).join('\n'):'';}
 setEnum(text:string){
  this.error='';
  try{
   const values=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>JSON.parse(line));
   if(values.some((v,i)=>values.findIndex(other=>JSON.stringify(other)===JSON.stringify(v))!==i))throw new Error('Valores duplicados.');
   this.commit(root=>{const node=this.current(root)!;if(values.length)node.enum=values;else delete node.enum;});
  }catch(e){this.error='Enum inválido: '+(e instanceof Error?e.message:String(e));}
 }
 advancedText(node:Schema):string{
  const keys=['if','then','else','allOf','oneOf','anyOf','not','$defs','$ref','patternProperties','propertyNames','dependentRequired','dependentSchemas','unevaluatedProperties','contains','minContains','maxContains','prefixItems'];
  return JSON.stringify(Object.fromEntries(keys.filter(key=>Object.prototype.hasOwnProperty.call(node,key)).map(key=>[key,node[key]])),null,2);
 }
 setAdvanced(text:string){
  this.error='';
  try{
   const parsed=JSON.parse(text||'{}');
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Informe um objeto JSON.');
   const keys=['if','then','else','allOf','oneOf','anyOf','not','$defs','$ref','patternProperties','propertyNames','dependentRequired','dependentSchemas','unevaluatedProperties','contains','minContains','maxContains','prefixItems'];
   const unknown=Object.keys(parsed).filter(key=>!keys.includes(key));
   if(unknown.length)throw new Error('Atributos não permitidos nesta seção: '+unknown.join(', '));
   this.commit(root=>{
    const node=this.current(root)!;
    for(const key of keys)delete node[key];
    Object.assign(node,parsed);
   });
  }catch(e){this.error='Regras avançadas inválidas: '+(e instanceof Error?e.message:String(e));}
 }
 addComposition(kind:string){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(!Array.isArray(node[kind]))node[kind]=[];
   node[kind].push({type:'object',properties:{}});
   this.selectedPath+='/'+kind+'/'+(node[kind].length-1);
  });
 }
 removeComposition(kind:string,index:number){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(!Array.isArray(node[kind])||index<0||index>=node[kind].length)return;
   node[kind].splice(index,1);
   if(!node[kind].length)delete node[kind];
  });
 }
 toggleConditional(kind:string){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(node[kind]===undefined){node[kind]={type:'object',properties:{}};this.selectedPath+='/'+kind;}
   else delete node[kind];
  });
 }
 setType(type:string){this.commit(root=>{this.current(root)!.type=type;});}
 setRequired(checked:boolean){
  this.commit(root=>{
   const parts=this.segments(this.selectedPath),name=parts.pop()!;
   if(parts.pop()!=='properties')return;
   const parent=this.getNodeAt(root,'/'+parts.map(p=>this.escape(p)).join('/'));
   if(!parent)return;
   const required=new Set<string>(parent.required||[]);
   if(checked)required.add(name);else required.delete(name);
   if(required.size)parent.required=[...required];else delete parent.required;
  });
 }
 renameSelected(name:string){
  this.error='';
  if(!name){this.error='Informe o nome da propriedade.';return;}
  const parts=this.segments(this.selectedPath),old=parts.pop()!;
  if(parts.pop()!=='properties'||name===old)return;
  const parentPath='/'+parts.map(p=>this.escape(p)).join('/');
  const parent=this.getNodeAt(this.schema,parentPath);
  if(!parent?.properties?.[old]||Object.prototype.hasOwnProperty.call(parent.properties,name)){this.error='Já existe uma propriedade com esse nome.';return;}
  this.commit(root=>{
   const target=this.getNodeAt(root,parentPath)!;
   const entries=Object.entries(target.properties).map(([k,v])=>[k===old?name:k,v]);
   target.properties=Object.fromEntries(entries);
   if(target.required)target.required=target.required.map((k:string)=>k===old?name:k);
   this.selectedPath=parentPath+'/properties/'+this.escape(name);
  });
 }
 removeSelected(){
  if(!this.selectedPath)return;
  const path=this.selectedPath;
  const parts=this.segments(path);
  const last=parts.pop()!;
  let parentPath='';
  let kind='';let key=last;
  if(parts.at(-1)==='properties'){parts.pop();kind='properties';}
  else if(parts.at(-1)&&this.compositionKinds.includes(parts.at(-1)!)){kind=parts.pop()!;}
  else if(parts.at(-1)==='$defs'||parts.at(-1)==='patternProperties'){kind=parts.pop()!;}
  else if(last==='items')kind='items';
  else if(last==='additionalProperties')kind='additionalProperties';
  else if(this.conditionalKinds.includes(last))kind='conditional';
  else {this.error='Não é possível excluir este nó.';return;}
  parentPath=parts.length?'/'+parts.map(p=>this.escape(p)).join('/'):'';
  this.error='';
  this.commit(root=>{
   const parent=this.getNodeAt(root,parentPath);
   if(!parent)return;
   if(kind==='properties'){
    delete parent.properties?.[key];
    if(parent.required){parent.required=parent.required.filter((x:string)=>x!==key);if(!parent.required.length)delete parent.required;}
   }else if(kind==='items')delete parent.items;
   else if(kind==='conditional')delete parent[key];
   else if(kind==='additionalProperties')parent.additionalProperties=true;
   else if(kind==='$defs'||kind==='patternProperties'){delete parent[kind]?.[key];if(parent[kind]&&!Object.keys(parent[kind]).length)delete parent[kind];}
   else if(Array.isArray(parent[kind])){
    parent[kind].splice(Number(key),1);
    if(!parent[kind].length)delete parent[kind];
   }
   this.selectedPath=parentPath;
  });
 }
}
