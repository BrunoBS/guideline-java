import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FieldComponent} from './field.component';
import {SchemaBuilderComponent} from './schema-builder.component';
import {Schema,ValidationIssue,ajv,initial,reconcileValue,validationIssues} from './schema-engine';
import {allSchemaExamples,allSchemas} from './schema-examples';
import {parameterKeyRequestSchema} from './parameter-key-request.schema';

@Component({
 selector:'app-root',
 standalone:true,
 imports:[CommonModule,FormsModule,FieldComponent,SchemaBuilderComponent],
 styles:[`
  .studio-tabs{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #d7dfec;margin:18px 0 22px;padding-bottom:10px}
  .studio-tabs button{border:1px solid transparent;border-radius:9px;padding:11px 16px;background:transparent;color:#4b5b75;cursor:pointer;font-weight:600}
  .studio-tabs button.active{background:#eaf1ff;border-color:#b4c8ee;color:#003399}
  .studio-json{white-space:pre-wrap;overflow-wrap:anywhere;max-height:65vh;overflow:auto}
  .home-intro{text-align:center;margin:30px auto 26px}
  .home-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:940px;margin:0 auto 36px}
  .home-card{display:flex;flex-direction:column;align-items:flex-start;gap:14px;text-align:left;border:1px solid #d7dfec;border-radius:16px;padding:28px;background:#fff;cursor:pointer;min-height:230px}
  .home-card:hover,.home-card:focus-visible{border-color:#003399;box-shadow:0 8px 26px rgba(0,51,153,.13)}
  .home-card strong{font-size:21px}.home-card p{line-height:1.5;color:#53627a;margin:0}
  .home-card .card-icon{font-size:30px;color:#003399}.home-card .card-action{margin-top:auto;color:#003399;font-weight:700}
  .workspace-back{margin-bottom:14px}
  @media(max-width:700px){.home-cards{grid-template-columns:1fr}}
  .example-picker{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .example-picker>label{display:grid;grid-template-columns:auto minmax(320px,560px);align-items:center;gap:10px;margin:0}
  .schema-example-help{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#f2f5ff;border:1px solid #b8c4e4;color:#003399;font-weight:800;cursor:help;outline:none;user-select:none}
  .schema-example-help:hover,.schema-example-help:focus{border-color:#ec7000;box-shadow:0 0 0 3px rgba(236,112,0,.16)}
  .schema-example-tooltip{position:absolute;left:50%;top:calc(100% + 10px);transform:translateX(-50%);z-index:30;width:min(520px,80vw);padding:12px 14px;border-radius:8px;background:#1f2937;color:#fff;font-size:13px;font-weight:500;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s ease}
  .schema-example-help:hover .schema-example-tooltip,.schema-example-help:focus .schema-example-tooltip,.schema-example-help:focus-within .schema-example-tooltip{opacity:1;visibility:visible}
  .schema-example-tooltip:before{content:'';position:absolute;bottom:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-bottom-color:#1f2937}
  @media(max-width:700px){.example-picker>label{grid-template-columns:1fr;width:100%}.example-picker>label select{width:100%}.schema-example-tooltip{left:auto;right:0;transform:none}.schema-example-tooltip:before{left:auto;right:8px;transform:none}}
 `],
 template:`
<header class="app-header"><h2>POC - JSON Schema</h2><small>Draft 2020-12</small></header>
<main class="workspace">
  <section *ngIf="area==='home'" aria-label="Página inicial">
    <div class="home-intro"><h3>O que você deseja fazer?</h3><p>Escolha entre criar ou consumir um contrato JSON Schema.</p></div>
    <div class="home-cards">
      <button class="home-card" type="button" (click)="enterBuilder()"><span class="card-icon">▤</span><strong>Schema Builder</strong><p>Crie e edite visualmente JSON Schemas com propriedades, objetos e listas.</p><span class="card-action">Criar schema →</span></button>
      <button class="home-card" type="button" (click)="enterRenderer()"><span class="card-icon">▦</span><strong>Schema Renderer</strong><p>Consuma um JSON Schema para gerar formulários, validar dados e consultar a resposta.</p><span class="card-action">Consumir schema →</span></button>
    </div>
  </section>
  <div *ngIf="area!=='home'">
  <div class="workspace-back"><button type="button" class="secondary" (click)="area='home'">← Voltar para Home</button></div>
  <nav class="tabs" *ngIf="area==='renderer'" aria-label="Etapas da POC">
    <button type="button" [class.active]="activeTab===1" (click)="activeTab=1"><span>1</span> JSON Schema</button>
    <button type="button" [class.active]="activeTab===2" (click)="activeTab=2"><span>2</span> Formulário</button>
    <button type="button" [class.active]="activeTab===3" (click)="activeTab=3"><span>3</span> Modo desenvolvedor</button>
    <button type="button" [class.active]="activeTab===4" (click)="activeTab=4"><span>4</span> Resposta</button>
  </nav>

  <section class="panel tab-panel" *ngIf="area==='renderer' && activeTab===1">
    <div class="section-heading">
      <div><h3>JSON Schema</h3><p>Defina o contrato que controla a renderização e a validação do formulário.</p></div>
      <span class="status valid" *ngIf="schemaValidated && !parseError">✓ JSON Schema válido</span>
      <span class="status invalid" *ngIf="parseError">JSON Schema inválido</span>
    </div>
    <div class="preset-actions example-picker">
      <label>
        <span>Exemplo</span>
        <select [ngModel]="selectedExample" (ngModelChange)="loadExample($event)" aria-label="Selecionar exemplo de JSON Schema">
          <option value="">Selecione um exemplo</option>
          <option *ngFor="let example of schemaExamples" [value]="example.id" [attr.title]="example.description">{{example.label}}</option>
        </select>
      </label>
      <span class="schema-example-help" tabindex="0" aria-label="Ajuda sobre o exemplo selecionado">?
        <span class="schema-example-tooltip" role="tooltip">{{selectedExampleDescription}}</span>
      </span>
    </div>
    <textarea class="editor" [ngModel]="source" (ngModelChange)="schemaSourceChanged($event)" aria-label="Editor JSON Schema"></textarea>
    <div class="opposite-actions developer-actions">
      <span class="status valid" *ngIf="schemaValidated && !parseError">✓ Sintaxe JSON e estrutura do schema válidas</span>
      <span></span>
      <div>
        <button type="button" class="secondary" (click)="validateSchemaJson()">Validar JSON</button>
        <button type="button" class="secondary" (click)="formatSchemaJson()">Formatar JSON</button>
        <button type="button" (click)="apply()">Renderizar schema</button>
      </div>
    </div>
    <p class="error callout" *ngIf="parseError">{{parseError}}</p>
  </section>

  <p class="error callout" *ngIf="area==='renderer' && valueError && activeTab!==3">O JSON do modo desenvolvedor está inválido: {{valueError}}. Corrija-o ou descarte a edição antes de considerar o formulário válido.</p>

  <section class="panel tab-panel" *ngIf="area==='renderer' && activeTab===2">
    <div class="section-heading"><div><h3>Formulário dinâmico</h3><p>Os controles abaixo são derivados exclusivamente do JSON Schema.</p></div><span class="status valid" *ngIf="!valueError && !errors.length">✓ Válido</span><span class="status invalid" *ngIf="!valueError && errors.length">{{errors.length}} erro(s)</span></div>
    <app-field *ngIf="schema" [schema]="schema" [root]="schema" [value]="value" [required]="true" [issues]="issues" path="" (valueChange)="changed($event)"></app-field>
    <div class="validation-summary" *ngIf="errors.length"><h4>Mensagens de erro</h4><ul><li class="error" *ngFor="let e of errors">{{e}}</li></ul></div>
  </section>

  <section class="panel tab-panel" *ngIf="area==='renderer' && activeTab===3">
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
      <div><button type="button" class="secondary" (click)="validateDeveloperJson()">Validar JSON</button><button type="button" (click)="formatDeveloperJson()">Formatar JSON</button></div>
    </div>
    <p class="error callout" *ngIf="valueError">{{valueError}}</p>
    <p class="success callout" *ngIf="!valueError && developerValidated">✓ JSON sintaticamente válido e sincronizado com o formulário.</p>
    <div class="validation-summary" *ngIf="!valueError && errors.length"><h4>Validação contra o schema</h4><ul><li class="error" *ngFor="let e of errors">{{e}}</li></ul></div>
  </section>

  <nav class="studio-tabs" *ngIf="area==='builder'" aria-label="Abas do Schema Studio">
    <button type="button" [class.active]="builderTab==='construction'" (click)="builderTab='construction'">Construção</button>
    <button type="button" [class.active]="builderTab==='dev'" (click)="builderTab='dev'">Para Dev</button>
    <button type="button" [class.active]="builderTab==='preview'" (click)="builderTab='preview'">Preview</button>
    <button type="button" [class.active]="builderTab==='json'" (click)="builderTab='json'">JSON Schema</button>
  </nav>
  <section class="panel tab-panel" *ngIf="area==='builder'">
    <div class="section-heading"><div><h3>Schema Studio</h3><p>Crie o contrato visualmente, configure regras avançadas e teste o formulário.</p></div></div>
    <p class="error callout" *ngIf="builderError">{{builderError}}</p>
    <div class="developer-actions">
      <button type="button" class="secondary" (click)="newBuilderSchema()">Novo schema</button>
      <button type="button" class="secondary" (click)="builderTab='json';builderImport=!builderImport">Importar JSON Schema</button>
      <button type="button" class="secondary" (click)="downloadBuilderSchema()">Exportar JSON Schema</button>
    </div>
    <div *ngIf="builderImport && builderTab==='json'">
      <label for="builder-import">Cole um JSON Schema Draft 2020-12</label>
      <textarea id="builder-import" class="editor" [(ngModel)]="builderImportSource"></textarea>
      <button type="button" (click)="importBuilderSchema()">Validar e importar</button>
    </div>
    <app-schema-builder *ngIf="builderTab==='construction'||builderTab==='dev'" [mode]="builderTab" [schema]="schema" (schemaChange)="builderChanged($event)"></app-schema-builder>
    <div *ngIf="builderTab==='preview'">
      <h4>Preview do formulário</h4>
      <p class="error" *ngIf="errors.length">{{errors.length}} erro(s) de validação</p>
      <app-field [schema]="schema" [root]="schema" [value]="value" [required]="true" [issues]="issues" path="" (valueChange)="changed($event)"></app-field>
      <h4>Resposta JSON</h4><pre class="response-json studio-json">{{value|json}}</pre>
    </div>
    <div *ngIf="builderTab==='json'">
      <h4>JSON Schema gerado</h4>
      <p>O contrato abaixo é sincronizado com a Construção e o modo Para Dev.</p>
      <pre class="response-json studio-json">{{schema|json}}</pre>
    </div>
  </section>

  <section class="panel tab-panel" *ngIf="area==='renderer' && activeTab===4">
    <div class="section-heading"><div><h3>Resposta</h3><p>JSON final produzido pelo formulário e pelo modo desenvolvedor.</p></div><span class="status valid" *ngIf="!valueError && !errors.length">✓ Válido</span><span class="status invalid" *ngIf="valueError || errors.length">Inválido</span></div>
    <pre class="response-json" *ngIf="!valueError">{{value|json}}</pre><p class="error" *ngIf="valueError">Resposta indisponível enquanto o JSON do modo desenvolvedor estiver inválido.</p>
  </section>
  </div>
</main>`
})
export class AppComponent {
 area:'home'|'builder'|'renderer'='home';
 activeTab=1;
 builderTab:'construction'|'dev'|'preview'|'json'='construction';
 enterBuilder(){this.area='builder';this.builderTab='construction';this.openBuilder();}
 enterRenderer(){this.area='renderer';this.activeTab=1;}
 builderError='';
 builderPreview=false;
 builderJson=true;
 builderImport=false;
 builderImportSource='';
 schema:Schema=allSchemas['simple'];
 source=JSON.stringify(this.schema,null,2);
 value:any={};
 developerSource='';
 errors:string[]=[];
 issues:ValidationIssue[]=[];
 parseError='';
 valueError='';
 developerValidated=false;
 schemaValidated=false;
 selectedExample='simple';
 schemaExamples=allSchemaExamples;

 constructor(){this.value=initial(this.schema,this.schema);this.sync(true);}

 get selectedExampleDescription(){
  return this.schemaExamples.find(example=>example.id===this.selectedExample)?.description
   ||'Selecione um exemplo para ver o objetivo do schema e os pontos que devem ser validados.';
 }

 openBuilder(){
  try{const parsed=this.parseSchemaSource();this.schema=structuredClone(parsed);this.builderError='';this.area='builder';}
  catch(error){this.builderError=this.schemaErrorMessage(error);this.area='renderer';this.activeTab=1;this.parseError=this.builderError;}
 }
 importBuilderSchema(){
  try{
   const parsed=JSON.parse(this.builderImportSource);
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Schema deve ser um objeto JSON.');
   ajv.compile(parsed);
   if(!this.builderChanged(structuredClone(parsed)))return;
   this.builderImport=false;this.builderImportSource='';this.builderError='';
  }catch(error){this.builderError=this.schemaErrorMessage(error);}
 }
 downloadBuilderSchema(){
  const blob=new Blob([JSON.stringify(this.schema,null,2)],{type:'application/schema+json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='json-schema.json';link.click();
  URL.revokeObjectURL(url);
 }
 newBuilderSchema(){this.builderChanged({$schema:'https://json-schema.org/draft/2020-12/schema',title:'Novo schema',type:'object',properties:{},additionalProperties:false});}
 builderChanged(next:Schema):boolean{
  try{
   ajv.compile(next);
   this.schema=next;this.source=JSON.stringify(next,null,2);this.selectedExample='';
   this.value=reconcileValue(next,this.value,next);
   this.parseError='';this.builderError='';this.schemaValidated=true;this.valueError='';this.developerValidated=false;this.sync(true);return true;
  }catch(error){this.builderError=this.schemaErrorMessage(error);return false;}
 }
 loadExample(id:string){
  this.selectedExample=id;
  const next=id==='parameterKeyRequest'?parameterKeyRequestSchema:allSchemas[id];
  if(!next)return;
  this.schema=structuredClone(next);
  this.source=JSON.stringify(this.schema,null,2);
  this.value=initial(this.schema,this.schema);
  this.parseError='';
  this.valueError='';
  this.developerValidated=false;
  this.schemaValidated=false;
  this.sync(true);
 }

 schemaSourceChanged(text:string){this.source=text;this.parseError='';this.schemaValidated=false;}
 validateSchemaJson(){try{this.parseSchemaSource();this.parseError='';this.schemaValidated=true;}catch(error){this.parseError=this.schemaErrorMessage(error);this.schemaValidated=false;}}
 formatSchemaJson(){try{const parsed=this.parseSchemaSource();this.source=JSON.stringify(parsed,null,2);this.parseError='';this.schemaValidated=true;}catch(error){this.parseError=this.schemaErrorMessage(error);this.schemaValidated=false;}}

 apply(){
  try{
   const s=this.parseSchemaSource();
   this.schema=s;this.selectedExample='';this.value=initial(s,s);this.parseError='';this.valueError='';this.developerValidated=false;this.schemaValidated=true;this.sync(true);this.activeTab=2;
  }catch(error){this.parseError=this.schemaErrorMessage(error);this.schemaValidated=false;}
 }

 changed(v:any){
  if(this.valueError)return;
  this.value=reconcileValue(this.schema,v,this.schema);
  this.valueError='';
  this.developerValidated=false;
  this.sync(true);
 }
 developerJsonChanged(text:string){this.developerSource=text;this.developerValidated=false;try{this.value=JSON.parse(text);this.valueError='';this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);this.developerValidated=false;}}
 validateDeveloperJson(){try{this.value=JSON.parse(this.developerSource);this.valueError='';this.developerValidated=true;this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);this.developerValidated=false;}}
 formatDeveloperJson(){try{const parsed=JSON.parse(this.developerSource);this.developerSource=JSON.stringify(parsed,null,2);this.value=parsed;this.valueError='';this.developerValidated=true;this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);this.developerValidated=false;}}

 private parseSchemaSource():Schema{
  const parsed=JSON.parse(this.source);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Schema deve ser um objeto JSON.');
  ajv.compile(parsed);
  return parsed;
 }
 private schemaErrorMessage(error:any){return `JSON Schema inválido: ${error?.message||String(error)}`;}
 private jsonErrorMessage(error:any){return `JSON inválido: ${error?.message||String(error)}`;}
 private sync(updateDeveloperSource:boolean){
  if(updateDeveloperSource)this.developerSource=JSON.stringify(this.value,null,2);
  this.issues=validationIssues(this.schema,this.value);
  this.errors=this.issues.map(issue=>`${issue.path}: ${issue.message}`);
 }
}