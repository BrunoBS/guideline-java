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
 {if:{properties:{code:{const:'HTTP'}},required:['code']},then:{properties:{settings:{type:'object',required:['endpoint'],properties:{endpoint:{type:'string',format:'uri'},method:{enum:['POST','PUT']}}}}}},
 {if:{properties:{code:{const:'KAFKA'}},required:['code']},then:{properties:{settings:{type:'object',required:['topic'],properties:{topic:{type:'string'},bootstrapServers:{type:'string'}}}}}},
 {if:{properties:{code:{const:'APPCONFIG'}},required:['code']},then:{properties:{settings:{type:'object',required:['applicationId'],properties:{applicationId:{type:'string'},environmentId:{type:'string'}}}}}}
 ]};
const oneOf:Schema={'$schema':'https://json-schema.org/draft/2020-12/schema',title:'Canal',oneOf:[{type:'object',required:['type','email'],properties:{type:{const:'EMAIL'},email:{type:'string',format:'email'}}},{type:'object',required:['type','phone'],properties:{type:{const:'SMS'},phone:{type:'string'}}}]};
const simple:Schema={'$schema':'https://json-schema.org/draft/2020-12/schema',title:'Usuário',type:'object',required:['name','email'],properties:{name:{type:'string',title:'Nome',minLength:2},email:{type:'string',format:'email'},enabled:{type:'boolean',default:true},roles:{type:'array',items:{type:'string'}}}};
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule,FieldComponent],template:`
<header style="padding:18px 20px;background:#142b50;color:white"><h2 style="margin:0">POC · Universal JSON Schema Renderer</h2><small>Draft 2020-12 · Angular · Ajv</small></header>
<main class="layout">
<section class="panel"><h3>JSON Schema</h3><button (click)="load('publisher')">Publisher condicional</button><button (click)="load('oneOf')">oneOf</button><button (click)="load('simple')">Simples</button>
<p><textarea class="schema" [(ngModel)]="source" aria-label="Editor JSON Schema"></textarea></p><button (click)="apply()">Renderizar schema</button><p class="error" *ngIf="parseError">{{parseError}}</p>
<h3>JSON preenchido</h3><textarea class="schema" [(ngModel)]="valueSource" aria-label="Editor JSON de valores"></textarea><p><button (click)="applyValue()">Aplicar JSON</button></p><p class="error" *ngIf="valueError">{{valueError}}</p></section>
<section class="panel"><h3>Formulário dinâmico</h3><app-field *ngIf="schema" [schema]="schema" [root]="schema" [value]="value" [issues]="issues" path="" (valueChange)="changed($event)"></app-field>
<h3>Validação</h3><p *ngIf="!errors.length" style="color:#067647">✓ JSON válido para o schema</p><ul *ngIf="errors.length"><li class="error" *ngFor="let e of errors">{{e}}</li></ul>
<h3>Resultado</h3><pre>{{value|json}}</pre></section>
</main>
`})
export class AppComponent {
 schema:Schema=publisher;source=JSON.stringify(publisher,null,2);value:any={};valueSource='';errors:string[]=[];issues:ValidationIssue[]=[];parseError='';valueError='';
 constructor(){this.value=initial(this.schema,this.schema);this.sync();}
 load(kind:string){this.schema=kind==='oneOf'?oneOf:kind==='simple'?simple:publisher;this.source=JSON.stringify(this.schema,null,2);this.value=initial(this.schema,this.schema);this.sync();}
 apply(){try{const s=JSON.parse(this.source);if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Schema deve ser um objeto JSON');this.schema=s;this.value=initial(s,s);this.parseError='';this.sync();}catch(e){this.parseError=String(e);}}
 changed(v:any){this.value=v;this.sync();}
 applyValue(){try{this.value=JSON.parse(this.valueSource);this.valueError='';this.sync();}catch(e){this.valueError=String(e);}}
 sync(){this.valueSource=JSON.stringify(this.value,null,2);this.issues=validationIssues(this.schema,this.value);this.errors=this.issues.map(issue=>`${issue.path}: ${issue.message}`);}
}
