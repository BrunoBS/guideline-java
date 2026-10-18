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
  .builder-vertical{display:flex;flex-direction:column;gap:24px}
  .builder-live-form,.builder-construction{border:1px solid #d7dfec;border-radius:14px;padding:22px;background:#fff;min-width:0}
  .builder-live-form{min-height:160px}
  .studio-preview-overlay{position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:3vh 3vw}
  .studio-preview-modal{width:min(1100px,94vw);max-height:94vh;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.25);overflow:hidden}
  .studio-preview-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 26px;border-bottom:1px solid #d7dfec}
  .studio-preview-header h3{margin:0}.studio-preview-header p{margin:5px 0 0;color:#64748b}
  .studio-preview-body{padding:24px 26px;overflow-y:auto;min-height:0}
  @media(max-width:600px){.studio-preview-overlay{padding:0}.studio-preview-modal{width:100vw;max-height:100vh;height:100vh;border-radius:0}.studio-preview-header,.studio-preview-body{padding:16px}}
  .studio-tabs{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #d7dfec;margin:18px 0 22px;padding-bottom:10px}
  .studio-tabs button{border:1px solid transparent;border-radius:9px;padding:11px 16px;background:transparent;color:#4b5b75;cursor:pointer;font-weight:600}
  .studio-tabs button.active{background:#eaf1ff;border-color:#b4c8ee;color:#003399}
  .schema-modal-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
  .studio-json{white-space:pre-wrap;overflow-wrap:anywhere;max-height:65vh;overflow:auto}
  .home-intro{text-align:center;margin:30px auto 26px}
  .home-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:940px;margin:0 auto 36px}
  .home-card{display:flex;flex-direction:column;align-items:flex-start;gap:14px;text-align:left;border:1px solid #d7dfec;border-radius:16px;padding:28px;background:#fff;cursor:pointer;min-height:230px}
  .home-card:hover,.home-card:focus-visible{border-color:#003399;box-shadow:0 8px 26px rgba(0,51,153,.13)}
  .home-card strong{font-size:21px}.home-card p{line-height:1.5;color:#53627a;margin:0}
  .home-card .card-icon{font-size:30px;color:#003399}.home-card .card-action{margin-top:auto;color:#003399;font-weight:700}
  .workspace-back{margin-bottom:14px}
  .schema-preview-layout{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);gap:18px;align-items:start}
  .schema-editor-column,.schema-live-preview{min-width:0}
  .schema-editor-column .editor{height:58vh;min-height:360px}
  .schema-live-preview{border:1px solid #d7dfec;border-radius:12px;padding:18px;background:#fff;min-height:360px}
  .schema-live-preview .section-heading{margin-bottom:16px;align-items:flex-start}
  .schema-live-preview .section-heading h4{margin:0 0 6px;color:#001f5b;font-size:17px}
  .schema-preview-placeholder{padding:18px;border:1px dashed #b7c4d8;border-radius:8px;background:#f7f9fc;color:#53627a;line-height:1.5}
  @media(max-width:1000px){.schema-preview-layout{grid-template-columns:1fr}.schema-editor-column .editor{height:360px}}
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
    <label for="schema-source">Cole ou edite o JSON Schema</label>
    <textarea id="schema-source" class="editor" [ngModel]="source" (ngModelChange)="schemaSourceChanged($event)" aria-label="Editor JSON Schema"></textarea>
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

  <div class="studio-preview-overlay" *ngIf="area==='builder' && previewOpen" (click)="previewOpen=false" (keydown.escape)="previewOpen=false" role="presentation">
    <section class="studio-preview-modal" role="dialog" aria-modal="true" aria-label="Preview do formulário" (click)="$event.stopPropagation()">
      <div class="studio-preview-header"><div><h3>Preview do formulário</h3><p>Teste os campos e as validações do schema atual.</p></div><button type="button" class="secondary" (click)="previewOpen=false" aria-label="Fechar preview">✕ Fechar</button></div>
      <div class="studio-preview-body"><app-field *ngIf="schema" [schema]="schema" [root]="schema" [value]="value" [required]="true" [issues]="issues" path="" (valueChange)="changed($event)"></app-field>
      <div class="validation-summary" *ngIf="errors.length"><h4>Validação</h4><ul><li class="error" *ngFor="let e of errors">{{e}}</li></ul></div></div>
    </section>
  </div>
  <div class="studio-preview-overlay" *ngIf="area==='builder' && schemaPreviewOpen" (click)="schemaPreviewOpen=false" (keydown.escape)="schemaPreviewOpen=false" role="presentation">
    <section class="studio-preview-modal" role="dialog" aria-modal="true" aria-label="Visualizar JSON Schema" (click)="$event.stopPropagation()">
      <div class="studio-preview-header"><div><h3>Visualizar schema</h3><p>Contrato JSON Schema gerado a partir da configuração atual.</p></div>
        <div class="schema-modal-actions"><button type="button" class="secondary" (click)="copyBuilderSchema()">{{schemaCopied?'✓ Copiado!':'⧉ Copiar schema'}}</button><button type="button" (click)="downloadBuilderSchema()">↓ Exportar JSON Schema</button><button type="button" class="secondary" (click)="schemaPreviewOpen=false" aria-label="Fechar visualização do schema">✕ Fechar</button></div>
      </div>
      <div class="studio-preview-body"><pre class="response-json studio-json">{{schema|json}}</pre></div>
    </section>
  </div>
  <nav class="studio-tabs" *ngIf="area==='builder'" aria-label="Abas do Schema Studio">
    <button type="button" [class.active]="builderTab==='construction'" (click)="builderTab='construction'">Construção</button>
    <button type="button" [class.active]="builderTab==='dev'" (click)="builderTab='dev'">Para Dev</button>
  </nav>
  <section class="panel tab-panel" *ngIf="area==='builder'">
    <div class="section-heading"><div><h3>Schema Studio</h3><p>Crie o contrato visualmente, configure regras avançadas e teste o formulário.</p></div><div class="schema-modal-actions"><button type="button" class="secondary" (click)="schemaCopied=false;schemaPreviewOpen=true" aria-haspopup="dialog">◉ Visualizar schema</button><button type="button" (click)="previewOpen=true" aria-haspopup="dialog">◉ Visualizar formulário</button></div></div>
    <p class="error callout" *ngIf="builderError">{{builderError}}</p>
    <div class="developer-actions">
      <button type="button" class="secondary" (click)="newBuilderSchema()">Novo schema</button>
      <button type="button" class="secondary" (click)="builderTab='construction';builderImport=!builderImport">Importar JSON Schema</button>
    </div>
    <div *ngIf="builderImport && builderTab==='construction'">
      <label for="builder-import">Cole um JSON Schema Draft 2020-12</label>
      <textarea id="builder-import" class="editor" [(ngModel)]="builderImportSource"></textarea>
      <button type="button" (click)="importBuilderSchema()">Validar e importar</button>
    </div>
    <div class="builder-vertical" *ngIf="builderTab==='construction'">
      <section class="builder-construction" aria-label="Opções de construção">
        <div class="section-heading"><div><h4>Construir formulário</h4><p>Adicione campos, agrupadores e listas. Selecione um campo para configurar suas regras.</p></div></div>
        <app-schema-builder mode="construction" [schema]="schema" (schemaChange)="builderChanged($event)"></app-schema-builder>
      </section>
    </div>
    <div class="schema-preview-layout" *ngIf="builderTab==='dev'">
      <div class="schema-editor-column">
        <div class="section-heading">
          <div><h4>Para Dev</h4><p>Cole ou edite um JSON Schema. O preview acompanha as alterações válidas.</p></div>
          <span class="status valid" *ngIf="!builderSchemaError">Schema válido</span>
          <span class="status invalid" *ngIf="builderSchemaError">Schema inválido</span>
        </div>
        <label for="builder-schema-source">JSON Schema</label>
        <textarea id="builder-schema-source" class="editor" [ngModel]="builderSource" (ngModelChange)="builderSchemaSourceChanged($event)" aria-label="Editor de JSON Schema para desenvolvedores"></textarea>
        <p class="error callout" *ngIf="builderSchemaError">{{builderSchemaError}}</p>
      </div>
      <aside class="schema-live-preview" aria-label="Preview do formulário gerado">
        <div class="section-heading">
          <div><h4>Preview do formulário</h4><p>Renderização do último schema válido.</p></div>
          <span class="status valid" *ngIf="!builderSchemaError">Preview atualizado</span>
          <span class="status invalid" *ngIf="builderSchemaError">Aguardando schema válido</span>
        </div>
        <app-field *ngIf="schema" [schema]="schema" [root]="schema" [value]="value" [required]="true" [issues]="issues" path="" (valueChange)="changed($event)"></app-field>
        <div class="validation-summary" *ngIf="errors.length"><h4>Validação</h4><ul><li class="error" *ngFor="let e of errors">{{e}}</li></ul></div>
      </aside>
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
 builderTab:'construction'|'dev'|'json'='construction';
 previewOpen=false;
 schemaPreviewOpen=false;
 builderSource='';
 builderSchemaError='';
 enterBuilder(){this.area='builder';this.builderTab='construction';this.newBuilderSchema();this.builderSource=JSON.stringify(this.schema,null,2);}
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
 private normalizeImportedBuilderSchema(schema:Schema):Schema{
  const result:Schema=structuredClone(schema);
  if(result.type!=='object')return result;
  result.properties??={};
  // Campos presentes apenas nos ramos também fazem parte da estrutura
  // do formulário. Com additionalProperties:false, eles precisam estar
  // declarados em properties da raiz para serem aceitos pelo contrato.
  const definitions=new Map<string,Schema[]>();
  const visit=(node:any,depth=0)=>{
   if(!node||typeof node!=='object'||depth>20)return;
   for(const branch of ['then','else']){
    const part=node[branch];
    if(part&&typeof part==='object'){
     for(const [key,definition] of Object.entries(part.properties||{})){
      if(definition&&typeof definition==='object'&&!Array.isArray(definition)){
       const list=definitions.get(key)||[];
       list.push(definition as Schema);
       definitions.set(key,list);
      }
     }
     visit(part,depth+1);
    }
   }
   for(const kind of ['allOf','oneOf','anyOf'])
    if(Array.isArray(node[kind]))for(const child of node[kind])visit(child,depth+1);
  };
  visit(result);
  for(const [key,variants] of definitions){
   if(Object.prototype.hasOwnProperty.call(result.properties,key))continue;
   // Se ramos diferentes definem contratos incompatíveis, a propriedade
   // base permanece livre e as restrições específicas ficam em cada ramo.
   const first=JSON.stringify(variants[0]);
   result.properties[key]=variants.every(v=>JSON.stringify(v)===first)
    ?structuredClone(variants[0]):{};
  }
  return result;
 }
 importBuilderSchema(){
  try{
   const parsed=JSON.parse(this.builderImportSource);
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Schema deve ser um objeto JSON.');
   ajv.compile(parsed);
   if(!this.builderChanged(this.normalizeImportedBuilderSchema(parsed)))return;
   this.builderImport=false;this.builderImportSource='';this.builderError='';
  }catch(error){this.builderError=this.schemaErrorMessage(error);}
 }
 schemaCopied=false;
 async copyBuilderSchema(){
  try{await navigator.clipboard.writeText(JSON.stringify(this.schema,null,2));this.schemaCopied=true;}
  catch{this.schemaCopied=false;this.builderError='Não foi possível copiar automaticamente. Verifique as permissões do navegador.';}
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
   this.schema=next;this.source=JSON.stringify(next,null,2);this.builderSource=JSON.stringify(next,null,2);this.builderSchemaError='';this.selectedExample='';
   // Durante a construção, não reconciliar/validar o payload: os ramos da
   // condição podem estar incompletos e o formulário ainda não está em uso.
   if(this.builderTab==='construction'){
    this.parseError='';this.builderError='';this.schemaValidated=true;this.valueError='';this.developerValidated=false;
    return true;
   }
   this.value=reconcileValue(next,this.value,next);
   this.parseError='';this.builderError='';this.schemaValidated=true;this.valueError='';this.developerValidated=false;this.sync(true);return true;
  }catch(error){this.builderError=this.schemaErrorMessage(error);return false;}
 }
 builderSchemaSourceChanged(text:string){
  this.builderSource=text;
  try{
   const parsed=JSON.parse(text);
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Schema deve ser um objeto JSON.');
   ajv.compile(parsed);
   this.schema=parsed;this.source=JSON.stringify(parsed,null,2);this.selectedExample='';
   this.value=initial(parsed,parsed);this.builderSchemaError='';this.builderError='';
   this.parseError='';this.valueError='';this.developerValidated=false;this.schemaValidated=true;this.sync(true);
  }catch(error){
   this.builderSchemaError=this.schemaErrorMessage(error);
  }
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

 schemaSourceChanged(text:string){
  this.source=text;
  try{
   const next=this.parseSchemaSource();
   this.schema=next;this.selectedExample='';this.value=initial(next,next);
   this.parseError='';this.valueError='';this.developerValidated=false;
   this.schemaValidated=true;this.sync(true);
  }catch(error){
   this.parseError=this.schemaErrorMessage(error);this.schemaValidated=false;
  }
 }
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