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
 .builder.simplified:not(.developer-mode){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette{display:block;grid-column:1/-1;grid-row:1;order:unset;position:static}
 .builder.simplified:not(.developer-mode) .palette .palette-item{display:inline-flex;width:auto;min-width:0;flex:1 1 125px;margin:0}
 .builder.simplified:not(.developer-mode) .palette{display:flex;flex-wrap:wrap;gap:9px;align-items:center}
 .builder.simplified:not(.developer-mode) .palette>strong,.builder.simplified:not(.developer-mode) .palette>.builder-help{flex:0 0 100%;margin:0}
 .builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2;order:unset}
 .builder.simplified:not(.developer-mode) .inspector{grid-column:2;grid-row:2;order:unset;position:static;transform:none;width:100%;max-height:none;overflow:visible;box-shadow:none}
 .builder.simplified:not(.developer-mode):not(:has(.inspector)) .canvas{grid-column:1/-1}
 @media(max-width:760px){.builder.simplified:not(.developer-mode) .palette.desktop-palette{grid-template-columns:repeat(2,minmax(0,1fr))}.builder.simplified:not(.developer-mode){grid-template-columns:1fr}.builder.simplified:not(.developer-mode) .palette.desktop-palette{grid-column:1;grid-row:1;display:flex}.builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2}.builder.simplified:not(.developer-mode) .inspector{grid-column:1;grid-row:3}}
 .builder.simplified:has(.canvas):has(.inspector){grid-template-columns:minmax(330px,1fr) minmax(320px,1fr)}
 .builder.simplified:not(.developer-mode){display:grid;grid-template-columns:minmax(0,1.3fr) minmax(240px,.7fr);gap:16px;align-items:start}
 .builder.simplified{display:flex;flex-direction:column;gap:16px}
 .builder.simplified.developer-mode{grid-template-columns:minmax(260px,.8fr) minmax(360px,1.2fr)}
 .builder.simplified.developer-mode .palette{grid-column:1;grid-row:1}
 .builder.simplified.developer-mode .inspector{grid-column:2;grid-row:1}
 .builder.simplified .palette{order:2;position:static;width:100%;box-sizing:border-box}
 .builder.simplified:not(.developer-mode) .palette{grid-column:2;grid-row:1}
 .builder.simplified .canvas{order:1;min-height:0;width:100%;box-sizing:border-box}
 .builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:1}
 .builder.simplified .inspector{order:3;position:static;max-height:none;width:100%;box-sizing:border-box}
 @media(min-width:761px){.builder.simplified:not(.developer-mode) .palette.desktop-palette{display:block}}
 @media(max-width:760px){.builder.simplified.developer-mode{grid-template-columns:1fr}.builder.simplified.developer-mode .palette,.builder.simplified.developer-mode .inspector{grid-column:1;grid-row:auto}.builder.simplified{grid-template-columns:1fr}.builder.simplified .palette,.builder.simplified .canvas,.builder.simplified .inspector{grid-column:1;grid-row:auto}.builder.simplified .palette.desktop-palette{display:none}.builder.simplified .canvas-header{position:sticky;top:0;z-index:8;padding:8px;background:#fbfcff;border-bottom:1px solid #e3e9f2}.builder.simplified .canvas-header>.builder-actions{justify-content:flex-end}.builder.simplified .canvas-header .builder-help{display:none}.builder.simplified .canvas-add-top{white-space:nowrap}.builder.simplified .mobile-palette{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0 0 12px;padding:10px;border:1px solid #d9dfe9;border-radius:10px;background:#fff}.builder.simplified .mobile-palette .palette-item{margin:0;min-width:0;padding:9px 7px;font-size:13px}}
 .builder{display:grid;grid-template-columns:minmax(180px,.72fr) minmax(300px,1.4fr) minmax(280px,1.12fr);gap:16px;align-items:start}
 .palette,.canvas{border:1px solid #d9dfe9;border-radius:12px;padding:18px;background:#fff;min-width:0}
 .palette{position:sticky;top:12px}
 .palette-item{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:#f7f9fd;color:#17315c;border:1px solid #e0e7f3;border-radius:9px;padding:11px;margin:7px 0;cursor:pointer;font-weight:600}
 .palette-item:hover{background:#e8efff;border-color:#7fa5e9}
 .canvas{min-height:420px;background:#fbfcff}
 .canvas-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
 .mobile-palette{display:none}
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
 .modal-backdrop{position:fixed;inset:0;background:rgba(10,24,48,.58);z-index:99}
 .builder.simplified .inspector.field-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(680px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow-y:auto;z-index:100;box-shadow:0 24px 80px rgba(10,24,48,.25);box-sizing:border-box;grid-column:auto;grid-row:auto}
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
 .canvas-add-top{border:1px solid #2455b5;background:#2455b5;color:#fff;border-radius:8px;padding:8px 11px;cursor:pointer;font-weight:600}
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

 .editor-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 18px;border-bottom:1px solid #dce4ef;padding-bottom:10px}
 .editor-tabs button{border:1px solid #dce4ef;border-radius:8px;padding:11px 8px;background:#f7f9fd;color:#40536d;cursor:pointer;font-weight:600}
 .editor-tabs button.active{background:#eaf1ff;border-color:#86a9e6;color:#16468e}
 /* Construction layout: component palette full width, fields and editor in equal columns. */
 .builder.simplified:not(.developer-mode){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;grid-column:1/-1;grid-row:1;order:unset;position:static}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette>strong,.builder.simplified:not(.developer-mode) .palette.desktop-palette>.builder-help{grid-column:1/-1;margin:0}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette .palette-item{width:100%;margin:0;box-sizing:border-box}
 .builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2;order:unset}
 .builder.simplified:not(.developer-mode) .inspector{grid-column:2;grid-row:2;order:unset;position:static;transform:none;width:100%;max-height:none;overflow:visible;box-shadow:none}
 .builder.simplified:not(.developer-mode):not(:has(.inspector)) .canvas{grid-column:1/-1}
 @media(max-width:760px){.builder.simplified:not(.developer-mode){grid-template-columns:1fr}.builder.simplified:not(.developer-mode) .palette.desktop-palette{grid-column:1;grid-row:1;display:flex}.builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2}.builder.simplified:not(.developer-mode) .inspector{grid-column:1;grid-row:3}}

 .builder.simplified:not(.developer-mode) .editor-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
 .builder.simplified:not(.developer-mode) .editor-heading strong{font-size:18px}
 .builder.simplified:not(.developer-mode) .editor-close{background:transparent;border:0;color:#63738b;font-size:26px;line-height:1;padding:4px 8px;cursor:pointer;border-radius:6px}
 .builder.simplified:not(.developer-mode) .editor-close:hover{background:#f1f4f9}
 .builder.simplified:not(.developer-mode) .editor-tabs{display:flex;gap:18px;padding:0;border:0;border-bottom:1px solid #dce4ef;margin:0 0 18px}
 .builder.simplified:not(.developer-mode) .editor-tabs button{background:transparent;border:0;border-bottom:2px solid transparent;border-radius:0;padding:11px 3px;font-size:14px;font-weight:500;color:#64748b;cursor:pointer}
 .builder.simplified:not(.developer-mode) .editor-tabs button.active{background:transparent;border-bottom-color:#2455b5;color:#17448c;font-weight:700}
 .builder.simplified:not(.developer-mode) .inspector{padding:20px}
 .builder.simplified:not(.developer-mode) .inspector label{font-size:13px}
 .builder.simplified:not(.developer-mode) .editor-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid #e5eaf2;padding-top:14px;margin-top:22px}
 .builder.simplified:not(.developer-mode) .editor-footer span{font-size:12px;color:#718096}
 .builder.simplified:not(.developer-mode) .editor-delete{background:transparent;border:0;padding:5px;color:#b42318;font-size:13px;cursor:pointer}

 .confirm-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.52)}
 .confirm-dialog{width:min(420px,100%);box-sizing:border-box;border:1px solid #dce4ef;border-radius:16px;padding:28px;background:#fff;box-shadow:0 24px 75px rgba(15,23,42,.22);text-align:left}
 .confirm-icon{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#fff1f0;color:#b42318;font-size:22px;font-weight:700;margin-bottom:16px}
 .confirm-dialog h3{font-size:20px;margin:0 0 10px;color:#1f2937}
 .confirm-dialog p{font-size:14px;line-height:1.6;color:#5b6678;margin:0 0 24px}
 .confirm-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
 .confirm-actions button{border-radius:9px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:600}
 .confirm-cancel{border:1px solid #d6deeb;background:#fff;color:#40516a}
 .confirm-danger{border:1px solid #b42318;background:#b42318;color:#fff}
 .confirm-cancel:hover{background:#f5f7fb}
 .confirm-danger:hover{background:#912018}
 `],
 template:`
 <div class="builder simplified">
  <aside class="palette" [class.desktop-palette]="mode==='construction'" *ngIf="mode==='construction' || mode==='dev'">
   <strong>{{mode==='dev'?'Estrutura técnica':'Adicionar componentes'}}</strong>
   <p class="builder-help">Escolha um tipo para adicionar ao formulário ou ao objeto selecionado.</p>
   <button type="button" class="palette-item" *ngFor="let item of palette" (click)="addTypedProperty(item.type)"><span>{{item.icon}}</span> {{item.label}} <span style="margin-left:auto">+</span></button>
   <button type="button" class="structure-toggle" *ngIf="mode==='dev'" (click)="showStructure=!showStructure">{{showStructure?'▾ Ocultar':'▸ Mostrar'}} estrutura completa</button>
   <div class="structure-panel tree" *ngIf="mode==='dev' && showStructure">
   <strong>Estrutura do schema</strong>
   <p class="builder-help">Selecione qualquer nó, inclusive definições e regras.</p>
   <button *ngFor="let row of rows" type="button" class="tree-row" [class.selected]="selectedPath===row.path" [style.padding-left.px]="9+row.depth*12" (click)="select(row.path)">
    <span>{{row.depth ? '↳' : '▣'}}</span><span>{{row.label}}</span><small>({{typeLabel(row.schema)}})</small>
   </button>
   </div>
  </aside>
  <section class="canvas" *ngIf="mode==='construction'">
   <div class="canvas-header">
    <div><strong>{{activeContainerPath ? "Campos do agrupador" : "Campos do schema"}}</strong><p>{{activeContainerLabel}} · Selecione um card para editar seu contrato.</p></div>
    <div class="builder-actions" style="margin:0">
     <button type="button" *ngIf="activeContainerPath" (click)="goToParentContainer()">← Voltar</button>
     <button type="button" *ngIf="selected?.type==='object' && selectedPath" (click)="openSelectedGroup()">Abrir agrupador</button>
     <button type="button" *ngIf="selected && selected.type==='array' && arrayItemType(selected)==='object'" (click)="openArrayItems()">Abrir lista de objetos</button>

     <span class="builder-help">{{canvasFields.length}} campos</span>
    </div>
   </div>
   <div class="mobile-palette" *ngIf="false">
    <button type="button" class="palette-item" *ngFor="let item of palette" (click)="addTypedProperty(item.type)"><span>{{item.icon}}</span> {{item.label}} <span style="margin-left:auto">+</span></button>
   </div>
   <div class="canvas-fields">
    <button type="button" class="canvas-field" *ngFor="let field of canvasFields" [class.active]="selectedPath===field.path" (click)="select(field.path)">
     <span class="canvas-field-title"><span>{{field.schema.title||field.label}} <span *ngIf="field.required">*</span></span><small>{{typeLabel(field.schema)}}</small></span>
     <span class="canvas-field-meta">{{field.schema.description||field.label}}</span>
     <span class="canvas-field-meta">{{field.required?'Obrigatório':'Opcional'}} · Clique para configurar</span>
    </button>
   </div>
   <div class="canvas-empty" *ngIf="!canvasFields.length">{{activeContainerPath ? "Este agrupador está vazio. Toque em Adicionar campo para incluir uma propriedade." : "Seu formulário está vazio. Toque em Adicionar campo para começar."}}</div>
  </section>

  <div class="inspector" [class.field-modal]="false" *ngIf="(selectedPath || mode==='dev') && selected as node">
   <div class="editor-heading"><strong>Editar campo</strong><button type="button" class="editor-close" aria-label="Fechar edição" title="Fechar edição" (click)="select('')">×</button></div>
   <div class="builder-actions" *ngIf="mode==='dev'">
    <button type="button" *ngIf="node.type==='object'" (click)="addProperty()">+ Propriedade</button>
    <button type="button" *ngIf="node.type==='array'" (click)="addItems()">+ Definir items</button>
    <button type="button" *ngIf="selectedPath!==''" (click)="removeSelected()">Excluir nó</button>
   </div>
   <nav class="editor-tabs" *ngIf="mode==='construction'" aria-label="Seções do editor"><button type="button" [class.active]="editorTab==='property'" (click)="editorTab='property'">Propriedade</button><button type="button" [class.active]="editorTab==='validation'" (click)="editorTab='validation'">Validações</button></nav>
   <div *ngIf="mode==='dev' || editorTab==='property'">
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
   </div>
   <div *ngIf="mode==='dev' || editorTab==='validation'">
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
   <label *ngIf="node.type==='array'">Tipo dos itens
    <select [ngModel]="arrayItemType(node)" (ngModelChange)="setArrayItemType($event)">
     <option value="string">Texto</option><option value="integer">Inteiro</option><option value="number">Decimal</option><option value="boolean">Sim / Não</option><option value="object">Objeto / agrupador</option><option value="array">Lista</option>
    </select>
   </label>
   <label *ngIf="node.type==='array'" class="checkline"><input type="checkbox" [ngModel]="!!node.uniqueItems" (ngModelChange)="setBoolean('uniqueItems',$event)"/> Itens únicos</label>
   <div class="rule-grid" *ngIf="node.type==='object'">
    <label>Mínimo de propriedades<input type="number" min="0" step="1" [ngModel]="node.minProperties" (ngModelChange)="setNumber('minProperties',$event,0,true)"/></label>
    <label>Máximo de propriedades<input type="number" min="0" step="1" [ngModel]="node.maxProperties" (ngModelChange)="setNumber('maxProperties',$event,0,true)"/></label>
   </div>
   <label *ngIf="node.type==='object'" class="checkline"><input type="checkbox" [ngModel]="node.additionalProperties!==false" (ngModelChange)="setBoolean('additionalProperties',$event)"/> Permitir propriedades adicionais</label>
   <label *ngIf="node.type!=='object'&&node.type!=='array'">Enum (um valor JSON por linha)
    <textarea [ngModel]="enumText(node)" (change)="setEnum($any($event.target).value)" placeholder="Exemplo:&#10;&quot;ATIVO&quot;&#10;&quot;INATIVO&quot;"></textarea>
   </label>

   </div>
   <ng-container *ngIf="mode==='dev'">
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
   </ng-container>
   <p class="builder-error" *ngIf="error">{{error}}</p>
   <div class="editor-footer" *ngIf="mode==='construction' && selectedPath"><button type="button" class="editor-delete" (click)="confirmDeleteSelected()">♲ Excluir campo</button><span>Alterações salvas automaticamente</span></div>
  </div>
  <div class="confirm-overlay" *ngIf="showDeleteConfirmation" (click)="cancelDelete()"><section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" aria-describedby="confirm-delete-description" (click)="$event.stopPropagation()"><div class="confirm-icon">!</div><h3 id="confirm-delete-title">Excluir campo?</h3><p id="confirm-delete-description">O campo <strong>{{selectedName}}</strong> será removido do schema. Essa ação não pode ser desfeita.</p><div class="confirm-actions"><button type="button" class="confirm-cancel" (click)="cancelDelete()">Cancelar</button><button type="button" class="confirm-danger" (click)="deleteConfirmed()">Excluir campo</button></div></section></div>
 </div>`
})
export class SchemaBuilderComponent implements OnChanges {
 @Input() schema:Schema={type:'object',properties:{}};
 @Input() mode:'construction'|'dev'='construction';
 @Output() schemaChange=new EventEmitter<Schema>();
 selectedPath='';
 activeContainerPath='';
 containerHistory:string[]=[];
 error='';
 types=['string','integer','number','boolean','object','array','null'];
 compositionKinds=['oneOf','anyOf','allOf'];
 conditionalKinds=['if','then','else'];
 formats=['email','uri','uuid','date','date-time','time','hostname','ipv4','ipv6','password','regex'];
 rows:NodeRow[]=[];
 showAddMenu=false;
 showAdvanced=false;
 editorTab:'property'|'validation'='property';
 showDeleteConfirmation=false;
 confirmDeleteSelected(){this.showDeleteConfirmation=true;}
 cancelDelete(){this.showDeleteConfirmation=false;}
 deleteConfirmed(){this.showDeleteConfirmation=false;this.removeSelected();}
 showStructure=false;
 palette=[{type:'string',label:'Texto',icon:'T'},{type:'integer',label:'Inteiro',icon:'#'},{type:'number',label:'Decimal',icon:'½'},{type:'boolean',label:'Sim / Não',icon:'☑'},{type:'object',label:'Objeto',icon:'{}'},{type:'group',label:'Grupo',icon:'▣'},{type:'array',label:'Lista',icon:'☷'},{type:'array-object',label:'Lista agrupada',icon:'☷▣'}];
 get canvasFields(){
  const prefix=this.activeContainerPath?this.activeContainerPath+'/properties/':'/properties/';
  return this.rows.filter(row=>row.path.startsWith(prefix)&&!row.path.slice(prefix.length).includes('/'));
 }
 get activeContainerLabel(){
  if(!this.activeContainerPath)return 'Raiz do schema';
  const node=this.getNodeAt(this.schema,this.activeContainerPath);
  return node?.title||this.segments(this.activeContainerPath).at(-1)||'Agrupador';
 }
 openContainer(path:string){
  const node=this.getNodeAt(this.schema,path);
  if(node?.type!=='object'){this.error='Só é possível abrir um agrupador do tipo objeto.';return;}
  this.containerHistory.push(this.activeContainerPath);
  this.activeContainerPath=path;
  this.error='';
 }
 toggleAddMenu(){this.showAddMenu=!this.showAddMenu;}
 openSelectedGroup(){this.openContainer(this.selectedPath);}
 openArrayItems(){
  if(this.selected?.type!=='array'||this.arrayItemType(this.selected)!=='object')return;
  this.openContainer(this.selectedPath+'/items');
 }
 goToParentContainer(){this.activeContainerPath=this.containerHistory.pop()||'';}
 arrayItemType(node:Schema):string{
  const item=node.items;
  if(item===true||item===undefined)return 'string';
  if(item===false)return 'null';
  return Array.isArray(item.type)?item.type[0]||'string':item.type||'string';
 }
 setArrayItemType(type:string){
  this.commit(root=>{
   const node=this.current(root)!;
   const existing=node.items&&typeof node.items==='object'&&!Array.isArray(node.items)?node.items:{};
   node.items=type==='object'?{...existing,type,properties:existing.properties||{},title:existing.title||'Item'}:{...existing,type};
  });
 }
 addTypedProperty(type:string){
  const targetPath=this.activeContainerPath;
  const node=this.getNodeAt(this.schema,targetPath);
  if(!node||node.type!=='object'){this.error='Selecione um objeto para adicionar campos.';return;}
  this.error='';
  this.commit(root=>{
   const target=this.getNodeAt(root,targetPath)!;
   target.properties??={};
   let key='campo',i=2;while(Object.prototype.hasOwnProperty.call(target.properties,key))key='campo'+i++;
   const objectType=type==='object'||type==='group';
   const groupedList=type==='array-object';
   target.properties[key]=groupedList
    ?{type:'array',title:key,description:'Lista de objetos agrupados.',items:{type:'object',title:'Item',properties:{}}}
    :objectType
     ?{type:'object',title:key,description:type==='group'?'Agrupador de propriedades.':'Objeto JSON.',properties:{}}
     :type==='array'?{type:'array',items:{type:'string'},title:key}:{type,title:key};
   this.selectedPath=targetPath+'/properties/'+this.escape(key);
  });
  this.showAddMenu=false;
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
 select(path:string){this.showDeleteConfirmation=false;this.selectedPath=path;this.editorTab='property';this.error='';}
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
  if(this.activeContainerPath&&this.getNodeAt(this.schema,this.activeContainerPath)?.type!=='object'){this.activeContainerPath='';this.containerHistory=[];}
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
