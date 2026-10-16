import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FieldComponent} from './field.component';
import {Schema,ValidationIssue,initial,validationIssues} from './schema-engine';
const publisher:Schema={
 '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Publisher',type:'object',required:['code','settings'],properties:{
 code:{title:'Tipo',type:'string',enum:['HTTP','KAFKA','APPCONFIG']},
 settings:{title:'Configurações',type:'object'}},
 allOf:[
 {if:{properties:{code:{const:'HTTP'}},required:['code']},then:{properties:{settings:{type:'object',additionalProperties:false,required:['endpoint'],properties:{endpoint:{type:'string',format:'uri'},method:{enum:['POST','PUT']}}}}}},
 {if:{properties:{code:{const:'KAFKA'}},required:['code']},then:{properties:{settings:{type:'object',additionalProperties:false,required:['topic'],properties:{topic:{type:'string'},bootstrapServers:{type:'string'}}}}}},
 {if:{properties:{code:{const:'APPCONFIG'}},required:['code']},then:{properties:{settings:{type:'object',additionalProperties:false,required:['applicationId'],properties:{applicationId:{type:'string'},environmentId:{type:'string'}}}}}}
 ]};
const oneOf:Schema={'$schema':'https://json-schema.org/draft/2020-12/schema',title:'Canal',oneOf:[{type:'object',additionalProperties:false,required:['type','email'],properties:{type:{const:'EMAIL'},email:{type:'string',format:'email'}}},{type:'object',additionalProperties:false,required:['type','phone'],properties:{type:{const:'SMS'},phone:{type:'string'}}}]};
const simple:Schema={'$schema':'https://json-schema.org/draft/2020-12/schema',title:'Usuário',type:'object',required:['name','email'],properties:{name:{type:'string',title:'Nome',minLength:2},email:{type:'string',format:'email'},enabled:{type:'boolean',default:true},roles:{type:'array',items:{type:'string'}}}};
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
    <div class="preset-actions"><button type="button" class="secondary" (click)="load('publisher')">Publisher condicional</button><button type="button" class="secondary" (click)="load('oneOf')">oneOf</button><button type="button" class="secondary" (click)="load('simple')">Simples</button></div>
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
 activeTab=1;schema:Schema=publisher;source=JSON.stringify(publisher,null,2);value:any={};developerSource='';errors:string[]=[];issues:ValidationIssue[]=[];parseError='';valueError='';developerValidated=false;
 constructor(){this.value=initial(this.schema,this.schema);this.sync(true);}
 load(kind:string){this.schema=kind==='oneOf'?oneOf:kind==='simple'?simple:publisher;this.source=JSON.stringify(this.schema,null,2);this.value=initial(this.schema,this.schema);this.parseError='';this.valueError='';this.developerValidated=false;this.sync(true);}
 apply(){try{const s=JSON.parse(this.source);if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Schema deve ser um objeto JSON');this.schema=s;this.value=initial(s,s);this.parseError='';this.valueError='';this.developerValidated=false;this.sync(true);this.activeTab=2;}catch(e){this.parseError=String(e);}}
 changed(v:any){this.value=v;this.valueError='';this.developerValidated=false;this.sync(true);}
 developerJsonChanged(text:string){this.developerSource=text;this.developerValidated=false;try{this.value=JSON.parse(text);this.valueError='';this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);}}
 validateDeveloperJson(){try{this.value=JSON.parse(this.developerSource);this.valueError='';this.developerValidated=true;this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);this.developerValidated=false;}}
 formatDeveloperJson(){try{const parsed=JSON.parse(this.developerSource);this.developerSource=JSON.stringify(parsed,null,2);this.value=parsed;this.valueError='';this.developerValidated=true;this.sync(false);}catch(e){this.valueError=this.jsonErrorMessage(e);this.developerValidated=false;}}
 private jsonErrorMessage(error:any){return `JSON inválido: ${error?.message||String(error)}`;}
 private sync(updateDeveloperSource:boolean){if(updateDeveloperSource)this.developerSource=JSON.stringify(this.value,null,2);this.issues=validationIssues(this.schema,this.value);this.errors=this.issues.map(issue=>`${issue.path}: ${issue.message}`);}
}
