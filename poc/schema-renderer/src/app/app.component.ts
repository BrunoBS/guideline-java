import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FieldComponent} from './field.component';
import {Schema,ValidationIssue,effective,initial,validationIssues} from './schema-engine';

const exampleSchemas:Record<string,Schema>={
 simple:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Usuário',type:'object',required:['nome'],properties:{
   nome:{type:'string',title:'Nome'},idade:{type:'integer',title:'Idade',minimum:0}
  }
 },
 booleanNullable:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Configuração',type:'object',required:['ativo'],properties:{
   ativo:{type:'boolean',title:'Ativo'},descricao:{type:['string','null'],title:'Descrição'}
  }
 },
 enum:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Ambiente',type:'object',required:['tipo'],properties:{
   tipo:{type:'string',title:'Tipo',enum:['DEV','HML','PRD']}
  }
 },
 simpleArray:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Tags',type:'object',properties:{
   tags:{type:'array',title:'Tags',items:{type:'string'}}
  }
 },
 multiSelect:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Permissões',type:'object',properties:{
   permissions:{type:'array',title:'Permissões',uniqueItems:true,items:{type:'string',enum:['READ','WRITE','DELETE','ADMIN']}}
  }
 },
 nestedObject:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Aplicação',type:'object',required:['nome','owner'],properties:{
   nome:{type:'string'},owner:{type:'object',required:['nome'],properties:{nome:{type:'string'},email:{type:'string',format:'email'}}}
  }
 },
 additionalProperties:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Metadata',type:'object',properties:{
   responsavel:{type:'string'}
  },additionalProperties:{type:'string'}
 },
 dynamicTypes:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Variáveis',type:'object',properties:{
   variables:{type:'object',additionalProperties:{type:['string','integer','boolean','null','object']}}
  }
 },
 conditional:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Notificação',type:'object',required:['tipo'],properties:{
   tipo:{type:'string',enum:['EMAIL','SMS']}
  },allOf:[{
   if:{properties:{tipo:{const:'EMAIL'}},required:['tipo']},
   then:{required:['email'],properties:{email:{type:'string',format:'email'}}}
  }]
 },
 oneOf:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Destino',oneOf:[
   {title:'HTTP',type:'object',additionalProperties:false,required:['type','url'],properties:{type:{const:'HTTP'},url:{type:'string',format:'uri'}}},
   {title:'Kafka',type:'object',additionalProperties:false,required:['type','topic'],properties:{type:{const:'KAFKA'},topic:{type:'string'}}}
  ]
 },
 tuple:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Versão',type:'array',prefixItems:[
   {type:'string',title:'Nome'},{type:'integer',title:'Número'},{type:'boolean',title:'Ativo'}
  ],items:false
 },
 dependentRequired:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Pagamento',type:'object',properties:{
   cartao:{type:'string'},enderecoCobranca:{type:'string'}
  },dependentRequired:{cartao:['enderecoCobranca']}
 }
};

const schemaExamples=[
 {id:'simple',label:'1. Objeto simples'},
 {id:'booleanNullable',label:'2. Booleano + nullable'},
 {id:'enum',label:'3. Enum'},
 {id:'simpleArray',label:'4. Lista simples'},
 {id:'multiSelect',label:'5. Multi-select'},
 {id:'nestedObject',label:'6. Objeto aninhado'},
 {id:'additionalProperties',label:'7. Objeto + additionalProperties'},
 {id:'dynamicTypes',label:'8. Campos dinâmicos com múltiplos tipos'},
 {id:'conditional',label:'9. Condicional if / then'},
 {id:'oneOf',label:'10. oneOf'},
 {id:'tuple',label:'11. Tuple com prefixItems'},
 {id:'dependentRequired',label:'12. dependentRequired'}
];

@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule,FieldComponent],template:`
<header class="app-header"><h2>POC · Universal JSON Schema Renderer</h2><small>Draft 2020-12 · Angular · Ajv</small></header>
<main class="workspace">
  <nav class="tabs" aria-label="Etapas da POC">
    <button type="button" [class.active]="activeTab===1" (click)="activeTab=1"><span>1</span> JSON Schema</button>
    <button type="button" [class.active]="activeTab===2" (click)="activeTab=2"><span>2</span> Formulário</button>
    <button type="button" [class.active]="activeTab===3" (click)="activeTab=3"><span>3</span> Modo desenvolvedor</button>
    <button type="button" [class.active]="activeTab===4" (click)="activeTab=4"><span>4</span> Resposta</button>
  </nav>
  <section class="panel tab-panel" *ngIf="activeTab===1">
    <div class="section-heading"><div><h3>JSON Schema</h3><p>Defina o contrato que controla a renderização e a validação do formulário.</p></div></div>
    <div class="preset-actions">
      <label style="display:grid;grid-template-columns:auto minmax(280px,460px);align-items:center;gap:10px;margin:0">
        <span>Exemplo</span>
        <select [ngModel]="selectedExample" (ngModelChange)="loadExample($event)" aria-label="Selecionar exemplo de JSON Schema">
          <option value="">Selecione um exemplo</option>
          <option *ngFor="let example of schemaExamples" [value]="example.id">{{example.label}}</option>
        </select>
      </label>
    </div>
    <textarea class="editor" [(ngModel)]="source" aria-label="Editor JSON Schema"></textarea><div class="opposite-actions"><span></span><button type="button" (click)="apply()">Renderizar schema</button></div><p class="error callout" *ngIf="parseError">{{parseError}}</p>
  </section>
  <section class="panel tab-panel" *ngIf="activeTab===2">
    <div class="section-heading"><div><h3>Formulário dinâmico</h3><p>Os controles abaixo são derivados exclusivamente do JSON Schema.</p></div><span class="status valid" *ngIf="!errors.length">✓ Válido</span><span class="status invalid" *ngIf="errors.length">{{errors.length}} erro(s)</span></div>
    <app-field *ngIf="schema" [schema]="schema" [root]="schema" [value]="value" [required]="true" [issues]="issues" path="" (valueChange)="changed($event)"></app-field>
    <div class="validation-summary" *ngIf="errors.length"><h4>Mensagens de erro</h4><ul><li class="error" *ngFor="let e of errors">{{e}}</li></ul></div>
  </section>
  <section class="panel tab-panel" *ngIf="activeTab===3">
    <div class="section-heading">
      <div><h3>Modo desenvolvedor</h3><p>Cole ou edite o JSON. Conteúdo sintaticamente válido é sincronizado com o formulário.</p></div>
      <span class="status invalid" *ngIf="valueError">JSON inválido</span>
      <span class="status invalid" *ngIf="!valueError && errors.length">{{errors.length}} erro(s)</span>
      <span class="status valid" *ngIf="!valueError && !errors.length">✓ Válido</span>
    </div>
    <textarea class="editor" [ngModel]="developerSource" (ngModelChange)="developerJsonChanged($event)" aria-label="Editor JSON de valores"></textarea>
    <div class="opposite-actions developer-actions">
      <span class="status valid" *ngIf="developerValidated && !valueError">✓ JSON válido</span>
      <span></span>
      <div>
        <button type="button" class="secondary" (click)="validateDeveloperJson()">Validar JSON</button>
        <button type="button" (click)="formatDeveloperJson()">Formatar JSON</button>
      </div>
    </div>
    <p class="error callout" *ngIf="valueError">{{valueError}}</p>
    <p class="success callout" *ngIf="!valueError && developerValidated">✓ JSON sintaticamente válido e sincronizado com o formulário.</p>
    <div class="validation-summary" *ngIf="!valueError && errors.length"><h4>Validação contra o schema</h4><ul><li class="error" *ngFor="let e of errors">{{e}}</li></ul></div>
  </section>
  <section class="panel tab-panel" *ngIf="activeTab===4">
    <div class="section-heading"><div><h3>Resposta</h3><p>JSON final produzido pelo formulário e pelo modo desenvolvedor.</p></div><span class="status valid" *ngIf="!errors.length">✓ Válido</span><span class="status invalid" *ngIf="errors.length">Inválido</span></div><pre class="response-json">{{value|json}}</pre>
  </section>
</main>`})
export class AppComponent {
 activeTab=1;schema:Schema=exampleSchemas.simple;source=JSON.stringify(exampleSchemas.simple,null,2);value:any={};developerSource='';errors:string[]=[];issues:ValidationIssue[]=[];parseError='';valueError='';developerValidated=false;selectedExample='simple';schemaExamples=schemaExamples;
 constructor(){this.value=initial(this.schema,this.schema);this.sync(true);}
 loadExample(id:string){
  this.selectedExample=id;
  const next=exampleSchemas[id];
  if(!next)return;
  this.schema=structuredClone(next);this.source=JSON.stringify(this.schema,null,2);this.value=initial(this.schema,this.schema);this.parseError='';this.valueError='';this.developerValidated=false;this.sync(true);
 }
 apply(){try{const s=JSON.parse(this.source);if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Schema deve ser um objeto JSON');this.schema=s;this.selectedExample='';this.value=initial(s,s);this.parseError='';this.valueError='';this.developerValidated=false;this.sync(true);this.activeTab=2;}catch(e){this.parseError=String(e);}}
 changed(v:any){this.value=v;this.valueError='';this.developerValidated=false;this.sync(true);}
 developerJsonChanged(text:string){this.developerSource=text;this.developerValidated=false;try{this.value=JSON.parse(text);this.valueError='';this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);}}
 validateDeveloperJson(){try{this.value=JSON.parse(this.developerSource);this.valueError='';this.developerValidated=true;this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);this.developerValidated=false;}}
 formatDeveloperJson(){try{const parsed=JSON.parse(this.developerSource);this.developerSource=JSON.stringify(parsed,null,2);this.value=parsed;this.valueError='';this.developerValidated=true;this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);this.developerValidated=false;}}
 private jsonErrorMessage(error:any){return `JSON inválido: ${error?.message||String(error)}`;}
 private sync(updateDeveloperSource:boolean){
  if(updateDeveloperSource)this.developerSource=JSON.stringify(this.value,null,2);
  const activeSchema=effective(this.schema,this.value,this.schema);
  this.issues=validationIssues(activeSchema,this.value);
  this.errors=this.issues.map(issue=>`${issue.path}: ${issue.message}`);
 }
}
