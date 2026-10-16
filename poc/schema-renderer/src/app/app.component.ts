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
 {id:'simple',label:'1. Objeto simples',description:'Testa propriedades básicas de um objeto: nome obrigatório e idade opcional inteira com mínimo 0. Valide obrigatoriedade, tipo numérico e limite mínimo.'},
 {id:'booleanNullable',label:'2. Booleano + nullable',description:'Testa booleano como liga/desliga e um campo que aceita string ou null. Valide o switch de Ativo e o controle “Definir como nulo” da descrição.'},
 {id:'enum',label:'3. Enum',description:'Testa seleção restrita por enum. O campo Tipo deve aceitar somente DEV, HML ou PRD e ser renderizado como select.'},
 {id:'simpleArray',label:'4. Lista simples',description:'Testa array homogêneo de strings. Valide inclusão, remoção e edição dos itens da lista.'},
 {id:'multiSelect',label:'5. Multi-select',description:'Testa array com enum e uniqueItems. Deve renderizar seleção múltipla, aceitar somente permissões previstas e impedir duplicidade.'},
 {id:'nestedObject',label:'6. Objeto aninhado',description:'Testa objeto dentro de objeto. Owner é obrigatório, owner.nome é obrigatório e owner.email deve respeitar o formato de e-mail.'},
 {id:'additionalProperties',label:'7. Objeto + additionalProperties',description:'Testa objeto híbrido: campo conhecido responsavel e campos adicionais dinâmicos. Os valores adicionais devem ser strings.'},
 {id:'dynamicTypes',label:'8. Campos dinâmicos com múltiplos tipos',description:'Testa additionalProperties com union de tipos. Cada chave dinâmica pode escolher Texto, Inteiro, Booleano, Nulo ou Objeto; o editor do valor deve mudar conforme o tipo.'},
 {id:'conditional',label:'9. Condicional if / then',description:'Testa regra condicional. Ao selecionar EMAIL, o campo email deve aparecer e se tornar obrigatório; ao trocar para SMS, email deve desaparecer do valor final.'},
 {id:'oneOf',label:'10. oneOf',description:'Testa alternativas exclusivas. HTTP exige type=HTTP e url; Kafka exige type=KAFKA e topic. Ao trocar de alternativa, campos da branch anterior devem ser removidos.'},
 {id:'tuple',label:'11. Tuple com prefixItems',description:'Testa array posicional: primeiro item string, segundo inteiro e terceiro booleano. items=false impede posições adicionais.'},
 {id:'dependentRequired',label:'12. dependentRequired',description:'Testa dependência entre propriedades. cartao e enderecoCobranca são opcionais isoladamente, mas ao informar cartao o endereço de cobrança passa a ser obrigatório.'}
];

@Component({
 selector:'app-root',
 standalone:true,
 imports:[CommonModule,FormsModule,FieldComponent],
 styles:[`
  .example-picker{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .example-picker>label{display:grid;grid-template-columns:auto minmax(280px,460px);align-items:center;gap:10px;margin:0}
  .schema-example-help{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#f2f5ff;border:1px solid #b8c4e4;color:#003399;font-weight:800;cursor:help;outline:none;user-select:none}
  .schema-example-help:hover,.schema-example-help:focus{border-color:#ec7000;box-shadow:0 0 0 3px rgba(236,112,0,.16)}
  .schema-example-tooltip{position:absolute;left:50%;top:calc(100% + 10px);transform:translateX(-50%);z-index:30;width:min(420px,75vw);padding:12px 14px;border-radius:8px;background:#1f2937;color:#fff;font-size:13px;font-weight:500;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s ease}
  .schema-example-help:hover .schema-example-tooltip,.schema-example-help:focus .schema-example-tooltip,.schema-example-help:focus-within .schema-example-tooltip{opacity:1;visibility:visible}
  .schema-example-tooltip:before{content:'';position:absolute;bottom:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-bottom-color:#1f2937}
  @media(max-width:700px){.example-picker>label{grid-template-columns:1fr;width:100%}.example-picker>label select{width:100%}.schema-example-tooltip{left:auto;right:0;transform:none}.schema-example-tooltip:before{left:auto;right:8px;transform:none}}
 `],
 template:`
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
    <div class="preset-actions example-picker">
      <label>
        <span>Exemplo</span>
        <select [ngModel]="selectedExample" (ngModelChange)="loadExample($event)" aria-label="Selecionar exemplo de JSON Schema">
          <option value="">Selecione um exemplo</option>
          <option *ngFor="let example of schemaExamples" [value]="example.id" [attr.title]="example.description">{{example.label}}</option>
        </select>
      </label>
      <span class="schema-example-help" tabindex="0" aria-label="Ajuda sobre o exemplo selecionado">
        ?
        <span class="schema-example-tooltip" role="tooltip">{{selectedExampleDescription}}</span>
      </span>
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
</main>`
})
export class AppComponent {
 activeTab=1;schema:Schema=exampleSchemas.simple;source=JSON.stringify(exampleSchemas.simple,null,2);value:any={};developerSource='';errors:string[]=[];issues:ValidationIssue[]=[];parseError='';valueError='';developerValidated=false;selectedExample='simple';schemaExamples=schemaExamples;
 constructor(){this.value=initial(this.schema,this.schema);this.sync(true);}
 get selectedExampleDescription(){return this.schemaExamples.find(example=>example.id===this.selectedExample)?.description||'Selecione um exemplo para ver o objetivo do schema e os pontos que devem ser validados.';}
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
