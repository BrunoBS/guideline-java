import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FieldComponent} from './field.component';
import {Schema,ValidationIssue,effective,initial,validationIssues} from './schema-engine';

const draft='https://json-schema.org/draft/2020-12/schema';

const exampleSchemas:Record<string,Schema>={
 simple:{
  '$schema':draft,title:'Usuário',type:'object',additionalProperties:false,required:['nome'],properties:{
   nome:{type:'string',title:'Nome'},idade:{type:'integer',title:'Idade',minimum:0}
  }
 },
 booleanNullable:{
  '$schema':draft,title:'Configuração',type:'object',additionalProperties:false,required:['ativo'],properties:{
   ativo:{type:'boolean',title:'Ativo'},descricao:{type:['string','null'],title:'Descrição'}
  }
 },
 enumConst:{
  '$schema':draft,title:'Ambiente',type:'object',additionalProperties:false,required:['tipo','origem'],properties:{
   tipo:{type:'string',title:'Tipo',enum:['DEV','HML','PRD']},origem:{title:'Origem',const:'PORTAL'}
  }
 },
 stringConstraints:{
  '$schema':draft,title:'Identificador',type:'object',additionalProperties:false,required:['codigo'],properties:{
   codigo:{type:'string',title:'Código',minLength:3,maxLength:12,pattern:'^[A-Z][A-Z0-9_-]+$',examples:['APP_API']}
  }
 },
 numericConstraints:{
  '$schema':draft,title:'Limites numéricos',type:'object',additionalProperties:false,required:['lote'],properties:{
   lote:{type:'integer',title:'Tamanho do lote',minimum:10,maximum:1000,multipleOf:10},taxa:{type:'number',title:'Taxa',exclusiveMinimum:0,exclusiveMaximum:1}
  }
 },
 formats:{
  '$schema':draft,title:'Formatos',type:'object',additionalProperties:false,properties:{
   email:{type:'string',format:'email'},endpoint:{type:'string',format:'uri'},id:{type:'string',format:'uuid'},data:{type:'string',format:'date'},dataHora:{type:'string',format:'date-time'},hora:{type:'string',format:'time'}
  }
 },
 simpleArray:{
  '$schema':draft,title:'Tags',type:'object',additionalProperties:false,properties:{
   tags:{type:'array',title:'Tags',minItems:1,maxItems:4,items:{type:'string',minLength:1}}
  }
 },
 multiSelect:{
  '$schema':draft,title:'Permissões',type:'object',additionalProperties:false,properties:{
   permissions:{type:'array',title:'Permissões',uniqueItems:true,minItems:1,items:{type:'string',enum:['READ','WRITE','DELETE','ADMIN']}}
  }
 },
 tuple:{
  '$schema':draft,title:'Versão',type:'array',prefixItems:[
   {type:'string',title:'Nome'},{type:'integer',title:'Número'},{type:'boolean',title:'Ativo'}
  ],items:false
 },
 tupleWithTail:{
  '$schema':draft,title:'Linha de configuração',type:'array',prefixItems:[
   {type:'string',title:'Código'},{type:'integer',title:'Versão'}
  ],items:{type:'string'},minItems:2,maxItems:5
 },
 nestedObject:{
  '$schema':draft,title:'Aplicação',type:'object',additionalProperties:false,required:['nome','owner'],properties:{
   nome:{type:'string'},owner:{type:'object',additionalProperties:false,required:['nome'],properties:{nome:{type:'string'},email:{type:'string',format:'email'}}}
  }
 },
 additionalProperties:{
  '$schema':draft,title:'Metadata tipada',type:'object',properties:{responsavel:{type:'string'}},additionalProperties:{type:'string'}
 },
 additionalPropertiesTrue:{
  '$schema':draft,title:'Metadata livre',type:'object',properties:{responsavel:{type:'string'}},additionalProperties:true
 },
 additionalPropertiesEmpty:{
  '$schema':draft,title:'Campos livres com schema vazio',type:'object',properties:{nome:{type:'string'}},additionalProperties:{}
 },
 dynamicTypes:{
  '$schema':draft,title:'Variáveis',type:'object',properties:{
   variables:{type:'object',additionalProperties:{type:['string','integer','number','boolean','null','object','array']}}
  }
 },
 freeObject:{
  '$schema':draft,title:'Objeto livre',type:'object'
 },
 freeArray:{
  '$schema':draft,title:'Lista livre',type:'array'
 },
 patternProperties:{
  '$schema':draft,title:'Headers',type:'object',propertyNames:{pattern:'^[a-z][a-z0-9-]*$'},patternProperties:{'^x-':{type:'string'}},additionalProperties:false
 },
 conditional:{
  '$schema':draft,title:'Notificação',type:'object',additionalProperties:false,required:['tipo'],properties:{
   tipo:{type:'string',enum:['EMAIL','SMS']}
  },allOf:[{
   if:{properties:{tipo:{const:'EMAIL'}},required:['tipo']},
   then:{required:['email'],properties:{email:{type:'string',format:'email'}}},
   else:{required:['telefone'],properties:{telefone:{type:'string',pattern:'^\\+[1-9][0-9]{7,14}$'}}}
  }]
 },
 oneOf:{
  '$schema':draft,title:'Destino',oneOf:[
   {title:'HTTP',type:'object',additionalProperties:false,required:['type','url'],properties:{type:{const:'HTTP'},url:{type:'string',format:'uri'}}},
   {title:'Kafka',type:'object',additionalProperties:false,required:['type','topic'],properties:{type:{const:'KAFKA'},topic:{type:'string'}}}
  ]
 },
 oneOfWithoutDiscriminator:{
  '$schema':draft,title:'Valor alternativo',oneOf:[
   {title:'Texto',type:'string',minLength:2},
   {title:'Inteiro',type:'integer',minimum:0},
   {title:'Booleano',type:'boolean'}
  ]
 },
 anyOf:{
  '$schema':draft,title:'Contato',type:'object',additionalProperties:false,properties:{email:{type:'string',format:'email'},telefone:{type:'string'}},anyOf:[
   {required:['email']},{required:['telefone']}
  ]
 },
 allOf:{
  '$schema':draft,title:'Cadastro composto',type:'object',additionalProperties:false,allOf:[
   {required:['nome'],properties:{nome:{type:'string',minLength:2}}},
   {required:['ativo'],properties:{ativo:{type:'boolean'}}}
  ]
 },
 dependentRequired:{
  '$schema':draft,title:'Pagamento',type:'object',additionalProperties:false,properties:{
   cartao:{type:'string'},enderecoCobranca:{type:'string'}
  },dependentRequired:{cartao:['enderecoCobranca']}
 },
 dependentSchemas:{
  '$schema':draft,title:'Autenticação',type:'object',additionalProperties:false,properties:{
   modo:{type:'string',enum:['NONE','BASIC']}
  },dependentSchemas:{
   modo:{if:{properties:{modo:{const:'BASIC'}}},then:{required:['usuario','senha'],properties:{usuario:{type:'string'},senha:{type:'string',writeOnly:true}}}}
  }
 },
 refs:{
  '$schema':draft,title:'Serviço com $ref',type:'object',additionalProperties:false,required:['owner'],properties:{
   owner:{'$ref':'#/$defs/person'}
  },'$defs':{
   person:{type:'object',additionalProperties:false,required:['nome','email'],properties:{nome:{type:'string'},email:{type:'string',format:'email'}}}
  }
 },
 contains:{
  '$schema':draft,title:'Pontuações',type:'array',items:{type:'integer'},contains:{type:'integer',minimum:10},minContains:1,maxContains:2,minItems:1,maxItems:5
 },
 unevaluatedProperties:{
  '$schema':draft,title:'Composição fechada',type:'object',allOf:[
   {properties:{nome:{type:'string'}}},
   {properties:{ativo:{type:'boolean'}}}
  ],unevaluatedProperties:false
 },
 annotations:{
  '$schema':draft,title:'Anotações',type:'object',additionalProperties:false,required:['id','status'],properties:{
   id:{type:'string',title:'Identificador',readOnly:true,default:'generated-id'},
   status:{type:'string',enum:['ACTIVE','INACTIVE'],default:'ACTIVE'},
   segredo:{type:'string',title:'Segredo',writeOnly:true,examples:['token-secreto']},
   descricao:{type:'string',title:'Descrição',examples:['Descrição de exemplo']}
  }
 },
 directUnion:{
  '$schema':draft,title:'Valor flexível',type:['string','integer','number','boolean','null']
 }
};

type SchemaExample={id:string;label:string;description:string};
const schemaExamples:SchemaExample[]=[
 {id:'simple',label:'1. Objeto simples',description:'Testa objeto básico, required e integer com minimum. Nome deve ser obrigatório; idade é opcional e não pode ser negativa.'},
 {id:'booleanNullable',label:'2. Booleano + nullable',description:'Testa booleano como liga/desliga e campo string|null. Ativo deve ser switch e Descrição deve permitir “Definir como nulo”.'},
 {id:'enumConst',label:'3. Enum + const',description:'Testa enum e valor constante. Tipo deve ser select DEV/HML/PRD; Origem deve permanecer PORTAL e não aceitar outro valor.'},
 {id:'stringConstraints',label:'4. Restrições de string',description:'Testa minLength, maxLength, pattern e examples. Código deve começar com letra maiúscula e aceitar somente A-Z, 0-9, _ ou - dentro dos limites.'},
 {id:'numericConstraints',label:'5. Restrições numéricas',description:'Testa minimum, maximum, multipleOf e limites exclusivos. Lote deve ser múltiplo de 10 entre 10 e 1000; Taxa deve ficar estritamente entre 0 e 1.'},
 {id:'formats',label:'6. Formatos',description:'Testa email, uri, uuid, date, date-time e time. Valide inputs especializados quando houver e erros Ajv para formatos inválidos.'},
 {id:'simpleArray',label:'7. Lista simples + limites',description:'Testa array homogêneo com minItems/maxItems. Deve permitir de 1 a 4 tags string e bloquear/remover conforme os limites.'},
 {id:'multiSelect',label:'8. Multi-select + uniqueItems',description:'Testa array enum com uniqueItems. Deve virar seleção múltipla, aceitar apenas READ/WRITE/DELETE/ADMIN e não permitir duplicados.'},
 {id:'tuple',label:'9. Tuple com prefixItems',description:'Testa posições fixas: string, inteiro e booleano. items=false deve impedir um quarto item.'},
 {id:'tupleWithTail',label:'10. Tuple + items adicionais',description:'Testa prefixItems seguido de items homogêneos. As duas primeiras posições têm tipos próprios e as posições seguintes devem ser strings.'},
 {id:'nestedObject',label:'11. Objeto aninhado',description:'Testa formulário recursivo. Owner é objeto obrigatório; owner.nome é obrigatório e owner.email deve respeitar formato email.'},
 {id:'additionalProperties',label:'12. additionalProperties tipado',description:'Testa objeto híbrido com propriedade conhecida e campos extras. Todo valor adicional deve obrigatoriamente ser string.'},
 {id:'additionalPropertiesTrue',label:'13. additionalProperties: true',description:'Testa campos adicionais totalmente livres. O seletor Tipo deve oferecer todos os tipos JSON: Texto, Inteiro, Número, Booleano, Objeto, Lista e Nulo.'},
 {id:'additionalPropertiesEmpty',label:'14. additionalProperties: {}',description:'Testa schema vazio para propriedades adicionais. Deve ter o mesmo comportamento de valor livre de additionalProperties:true.'},
 {id:'dynamicTypes',label:'15. additionalProperties com union',description:'Testa union explícita para campos dinâmicos. O seletor deve respeitar exatamente string, integer, number, boolean, null, object e array.'},
 {id:'freeObject',label:'16. Objeto livre',description:'Testa type:object sem properties. Deve disponibilizar editor JSON para objeto livre, validar sintaxe e permitir formatação.'},
 {id:'freeArray',label:'17. Array livre',description:'Testa type:array sem items. Valide como o renderer permite adicionar valores sem contrato interno e se o JSON final permanece válido.'},
 {id:'patternProperties',label:'18. patternProperties + propertyNames',description:'Testa chaves dinâmicas por regex e validação do nome da propriedade. Somente chaves minúsculas no padrão geral e prefixadas por x- são aceitas; valores devem ser string.'},
 {id:'conditional',label:'19. if / then / else',description:'Testa condicional reativa. EMAIL exige email válido; SMS exige telefone. Ao trocar tipo, o campo da branch anterior deve desaparecer do JSON.'},
 {id:'oneOf',label:'20. oneOf com discriminator',description:'Testa alternativas exclusivas HTTP/Kafka. Só os campos da alternativa selecionada devem aparecer; erros e valores da outra branch não podem vazar.'},
 {id:'oneOfWithoutDiscriminator',label:'21. oneOf sem discriminator',description:'Testa alternativas por tipo sem propriedade const. Deve permitir escolher Texto, Inteiro ou Booleano e renderizar o controle compatível.'},
 {id:'anyOf',label:'22. anyOf',description:'Testa alternativas não exclusivas. O objeto é válido com email, telefone ou ambos; deve falhar quando nenhum dos dois estiver presente.'},
 {id:'allOf',label:'23. allOf',description:'Testa composição cumulativa. Nome e Ativo vêm de schemas diferentes, mas ambos devem aparecer e ser obrigatórios no schema efetivo.'},
 {id:'dependentRequired',label:'24. dependentRequired',description:'Testa dependência de obrigatoriedade. Endereço é opcional, mas passa a ser obrigatório quando Cartão é informado.'},
 {id:'dependentSchemas',label:'25. dependentSchemas',description:'Testa ativação de um schema dependente. Quando modo BASIC estiver ativo, Usuário e Senha devem aparecer e ser obrigatórios.'},
 {id:'refs',label:'26. $defs + $ref local',description:'Testa reutilização por referência local. Owner referencia $defs/person e deve renderizar Nome e Email com todas as validações do schema referenciado.'},
 {id:'contains',label:'27. contains + min/maxContains',description:'Testa regra de conteúdo em array. A lista deve possuir entre 1 e 2 números maiores ou iguais a 10; os itens correspondentes podem ser destacados.'},
 {id:'unevaluatedProperties',label:'28. unevaluatedProperties',description:'Testa fechamento após composição allOf. Nome e Ativo são avaliados pelas branches; qualquer outra propriedade deve ser rejeitada/removida.'},
 {id:'annotations',label:'29. default / examples / readOnly / writeOnly',description:'Testa annotations. ID deve iniciar com default e ser somente leitura; Status deve iniciar ACTIVE; examples ajudam como placeholder; Segredo é writeOnly.'},
 {id:'directUnion',label:'30. Union direta de tipos',description:'Testa type como array diretamente no campo raiz. O seletor Tipo deve alternar entre Texto, Inteiro, Número, Booleano e Nulo com controle adequado.'}
];

@Component({
 selector:'app-root',
 standalone:true,
 imports:[CommonModule,FormsModule,FieldComponent],
 styles:[`
  .example-picker{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .example-picker>label{display:grid;grid-template-columns:auto minmax(320px,560px);align-items:center;gap:10px;margin:0}
  .schema-example-help{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#f2f5ff;border:1px solid #b8c4e4;color:#003399;font-weight:800;cursor:help;outline:none;user-select:none}
  .schema-example-help:hover,.schema-example-help:focus{border-color:#ec7000;box-shadow:0 0 0 3px rgba(236,112,0,.16)}
  .schema-example-tooltip{position:absolute;left:50%;top:calc(100% + 10px);transform:translateX(-50%);z-index:30;width:min(460px,75vw);padding:12px 14px;border-radius:8px;background:#1f2937;color:#fff;font-size:13px;font-weight:500;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s ease}
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
    <textarea class="editor" [(ngModel)]="source" aria-label="Editor JSON Schema"></textarea>
    <div class="opposite-actions"><span></span><button type="button" (click)="apply()">Renderizar schema</button></div>
    <p class="error callout" *ngIf="parseError">{{parseError}}</p>
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
    <div class="section-heading"><div><h3>Resposta</h3><p>JSON final produzido pelo formulário e pelo modo desenvolvedor.</p></div><span class="status valid" *ngIf="!errors.length">✓ Válido</span><span class="status invalid" *ngIf="errors.length">Inválido</span></div>
    <pre class="response-json">{{value|json}}</pre>
  </section>
</main>`
})
export class AppComponent {
 activeTab=1;
 schema:Schema=exampleSchemas.simple;
 source=JSON.stringify(exampleSchemas.simple,null,2);
 value:any={};
 developerSource='';
 errors:string[]=[];
 issues:ValidationIssue[]=[];
 parseError='';
 valueError='';
 developerValidated=false;
 selectedExample='simple';
 schemaExamples=schemaExamples;

 constructor(){this.value=initial(this.schema,this.schema);this.sync(true);}

 get selectedExampleDescription(){
  return this.schemaExamples.find(example=>example.id===this.selectedExample)?.description
   ||'Selecione um exemplo para ver o objetivo do schema e os pontos que devem ser validados.';
 }

 loadExample(id:string){
  this.selectedExample=id;
  const next=exampleSchemas[id];
  if(!next)return;
  this.schema=structuredClone(next);
  this.source=JSON.stringify(this.schema,null,2);
  this.value=initial(this.schema,this.schema);
  this.parseError='';
  this.valueError='';
  this.developerValidated=false;
  this.sync(true);
 }

 apply(){
  try{
   const s=JSON.parse(this.source);
   if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Schema deve ser um objeto JSON');
   this.schema=s;
   this.selectedExample='';
   this.value=initial(s,s);
   this.parseError='';
   this.valueError='';
   this.developerValidated=false;
   this.sync(true);
   this.activeTab=2;
  }catch(e){this.parseError=String(e);}
 }

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
