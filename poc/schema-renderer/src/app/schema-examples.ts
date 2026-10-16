import {Schema} from './schema-engine';
import {accountServiceSchemas,accountServiceSchemaExamples,ExternalSchemaExample} from './account-service-schemas';

const draft='https://json-schema.org/draft/2020-12/schema';

const parameterKeyRequest:Schema={
 '$schema':draft,title:'Parameter key request',type:'object',additionalProperties:false,required:['type','value'],
 properties:{
  version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},microserviceIdentifier:{type:'string',format:'uuid',maxLength:36},
  key:{type:'string',maxLength:80,pattern:'^[a-z0-9]+(?:[._-][a-z0-9]+)*$'},description:{type:['string','null'],maxLength:200},
  type:{type:'string',enum:['CONFIGURATION','EXPRESSION']},value:{}
 },
 allOf:[
  {oneOf:[{required:['microserviceIdentifier','key'],properties:{version:{type:'null'}}},{required:['version'],properties:{version:{type:'integer'},microserviceIdentifier:false,key:false}}]},
  {if:{properties:{type:{const:'EXPRESSION'}},required:['type']},then:{properties:{value:{type:'object',additionalProperties:false,required:['operator','valueType','value'],properties:{operator:{enum:['EQUALS','NOT_EQUALS','CONTAINS','NOT_CONTAINS','GREATER_THAN','GREATER_THAN_OR_EQUALS','LESS_THAN','LESS_THAN_OR_EQUALS']},valueType:{enum:['STRING','INTEGER','LONG','DECIMAL']},value:{}},allOf:[
   {if:{properties:{operator:{enum:['CONTAINS','NOT_CONTAINS']}},required:['operator']},then:{properties:{value:{type:'array',minItems:1,uniqueItems:true}}},else:{properties:{value:{not:{type:'array'}}}}},
   {if:{properties:{operator:{enum:['GREATER_THAN','GREATER_THAN_OR_EQUALS','LESS_THAN','LESS_THAN_OR_EQUALS']}},required:['operator']},then:{properties:{valueType:{enum:['INTEGER','LONG','DECIMAL']}}}},
   {if:{properties:{valueType:{const:'STRING'}},required:['valueType']},then:{if:{properties:{operator:{enum:['CONTAINS','NOT_CONTAINS']}},required:['operator']},then:{properties:{value:{items:{type:'string'}}}},else:{properties:{value:{type:'string'}}}}},
   {if:{properties:{valueType:{const:'INTEGER'}},required:['valueType']},then:{if:{properties:{operator:{enum:['CONTAINS','NOT_CONTAINS']}},required:['operator']},then:{properties:{value:{items:{type:'integer',minimum:-2147483648,maximum:2147483647}}}},else:{properties:{value:{type:'integer',minimum:-2147483648,maximum:2147483647}}}}},
   {if:{properties:{valueType:{const:'LONG'}},required:['valueType']},then:{if:{properties:{operator:{enum:['CONTAINS','NOT_CONTAINS']}},required:['operator']},then:{properties:{value:{items:{type:'integer',minimum:-9223372036854775808,maximum:9223372036854775807}}}},else:{properties:{value:{type:'integer',minimum:-9223372036854775808,maximum:9223372036854775807}}}}},
   {if:{properties:{valueType:{const:'DECIMAL'}},required:['valueType']},then:{if:{properties:{operator:{enum:['CONTAINS','NOT_CONTAINS']}},required:['operator']},then:{properties:{value:{items:{type:'number',multipleOf:0.01}}}},else:{properties:{value:{type:'number',multipleOf:0.01}}}}}
  ]}}}}
 ]
};

const builtInSchemas:Record<string,Schema>={
 simple:{'$schema':draft,title:'Usuário',type:'object',additionalProperties:false,required:['nome'],properties:{nome:{type:'string',title:'Nome'},idade:{type:'integer',title:'Idade',minimum:0}}},
 booleanNullable:{'$schema':draft,title:'Configuração',type:'object',additionalProperties:false,required:['ativo'],properties:{ativo:{type:'boolean',title:'Ativo'},descricao:{type:['string','null'],title:'Descrição'}}},
 enumConst:{'$schema':draft,title:'Ambiente',type:'object',additionalProperties:false,required:['tipo','origem'],properties:{tipo:{type:'string',title:'Tipo',enum:['DEV','HML','PRD']},origem:{title:'Origem',const:'PORTAL'}}},
 stringConstraints:{'$schema':draft,title:'Identificador',type:'object',additionalProperties:false,required:['codigo'],properties:{codigo:{type:'string',title:'Código',minLength:3,maxLength:12,pattern:'^[A-Z][A-Z0-9_-]+$',examples:['APP_API']}}},
 numericConstraints:{'$schema':draft,title:'Limites numéricos',type:'object',additionalProperties:false,required:['lote'],properties:{lote:{type:'integer',title:'Tamanho do lote',minimum:10,maximum:1000,multipleOf:10},taxa:{type:'number',title:'Taxa',exclusiveMinimum:0,exclusiveMaximum:1}}},
 formats:{'$schema':draft,title:'Formatos',type:'object',additionalProperties:false,properties:{email:{type:'string',format:'email'},endpoint:{type:'string',format:'uri'},id:{type:'string',format:'uuid'},data:{type:'string',format:'date'},dataHora:{type:'string',format:'date-time'},hora:{type:'string',format:'time'}}},
 simpleArray:{'$schema':draft,title:'Tags',type:'object',additionalProperties:false,properties:{tags:{type:'array',title:'Tags',minItems:1,maxItems:4,items:{type:'string',minLength:1}}}},
 multiSelect:{'$schema':draft,title:'Permissões',type:'object',additionalProperties:false,properties:{permissions:{type:'array',title:'Permissões',uniqueItems:true,minItems:1,items:{type:'string',enum:['READ','WRITE','DELETE','ADMIN']}}}},
 tuple:{'$schema':draft,title:'Versão',type:'array',prefixItems:[{type:'string',title:'Nome'},{type:'integer',title:'Número'},{type:'boolean',title:'Ativo'}],items:false},
 tupleWithTail:{'$schema':draft,title:'Linha de configuração',type:'array',prefixItems:[{type:'string',title:'Código'},{type:'integer',title:'Versão'}],items:{type:'string'},minItems:2,maxItems:5},
 nestedObject:{'$schema':draft,title:'Aplicação',type:'object',additionalProperties:false,required:['nome','owner'],properties:{nome:{type:'string'},owner:{type:'object',additionalProperties:false,required:['nome'],properties:{nome:{type:'string'},email:{type:'string',format:'email'}}}}},
 additionalProperties:{'$schema':draft,title:'Metadata tipada',type:'object',properties:{responsavel:{type:'string'}},additionalProperties:{type:'string'}},
 additionalPropertiesTrue:{'$schema':draft,title:'Metadata livre',type:'object',properties:{responsavel:{type:'string'}},additionalProperties:true},
 additionalPropertiesEmpty:{'$schema':draft,title:'Campos livres com schema vazio',type:'object',properties:{nome:{type:'string'}},additionalProperties:{}},
 dynamicTypes:{'$schema':draft,title:'Variáveis',type:'object',properties:{variables:{type:'object',additionalProperties:{type:['string','integer','number','boolean','null','object','array']}}}},
 freeObject:{'$schema':draft,title:'Objeto livre',type:'object'},freeArray:{'$schema':draft,title:'Lista livre',type:'array'},
 patternProperties:{'$schema':draft,title:'Headers',type:'object',propertyNames:{pattern:'^[a-z][a-z0-9-]*$'},patternProperties:{'^x-':{type:'string'}},additionalProperties:false},
 conditional:{'$schema':draft,title:'Notificação',type:'object',additionalProperties:false,required:['tipo'],properties:{tipo:{type:'string',enum:['EMAIL','SMS']}},allOf:[{if:{properties:{tipo:{const:'EMAIL'}},required:['tipo']},then:{required:['email'],properties:{email:{type:'string',format:'email'}}},else:{required:['telefone'],properties:{telefone:{type:'string',pattern:'^\\+[1-9][0-9]{7,14}$'}}}}]},
 oneOf:{'$schema':draft,title:'Destino',oneOf:[{title:'HTTP',type:'object',additionalProperties:false,required:['type','url'],properties:{type:{const:'HTTP'},url:{type:'string',format:'uri'}}},{title:'Kafka',type:'object',additionalProperties:false,required:['type','topic'],properties:{type:{const:'KAFKA'},topic:{type:'string'}}}]},
 oneOfWithoutDiscriminator:{'$schema':draft,title:'Valor alternativo',oneOf:[{title:'Texto',type:'string',minLength:2},{title:'Inteiro',type:'integer',minimum:0},{title:'Booleano',type:'boolean'}]},
 anyOf:{'$schema':draft,title:'Contato',type:'object',additionalProperties:false,properties:{email:{type:'string',format:'email'},telefone:{type:'string'}},anyOf:[{required:['email']},{required:['telefone']}]},
 allOf:{'$schema':draft,title:'Cadastro composto',type:'object',additionalProperties:false,allOf:[{required:['nome'],properties:{nome:{type:'string',minLength:2}}},{required:['ativo'],properties:{ativo:{type:'boolean'}}}]},
 dependentRequired:{'$schema':draft,title:'Pagamento',type:'object',additionalProperties:false,properties:{cartao:{type:'string'},enderecoCobranca:{type:'string'}},dependentRequired:{cartao:['enderecoCobranca']}},
 dependentSchemas:{'$schema':draft,title:'Autenticação',type:'object',additionalProperties:false,properties:{modo:{type:'string',enum:['NONE','BASIC']}},dependentSchemas:{modo:{if:{properties:{modo:{const:'BASIC'}}},then:{required:['usuario','senha'],properties:{usuario:{type:'string'},senha:{type:'string',writeOnly:true}}}}}},
 refs:{'$schema':draft,title:'Serviço com $ref',type:'object',additionalProperties:false,required:['owner'],properties:{owner:{'$ref':'#/$defs/person'}},'$defs':{person:{type:'object',additionalProperties:false,required:['nome','email'],properties:{nome:{type:'string'},email:{type:'string',format:'email'}}}}},
 contains:{'$schema':draft,title:'Pontuações',type:'array',items:{type:'integer'},contains:{type:'integer',minimum:10},minContains:1,maxContains:2,minItems:1,maxItems:5},
 unevaluatedProperties:{'$schema':draft,title:'Composição fechada',type:'object',allOf:[{properties:{nome:{type:'string'}}},{properties:{ativo:{type:'boolean'}}}],unevaluatedProperties:false},
 annotations:{'$schema':draft,title:'Anotações',type:'object',additionalProperties:false,required:['id','status'],properties:{id:{type:'string',title:'Identificador',readOnly:true,default:'generated-id'},status:{type:'string',enum:['ACTIVE','INACTIVE'],default:'ACTIVE'},segredo:{type:'string',title:'Segredo',writeOnly:true,examples:['token-secreto']},descricao:{type:'string',title:'Descrição',examples:['Descrição de exemplo']}}},
 directUnion:{'$schema':draft,title:'Valor flexível',type:['string','integer','number','boolean','null']},parameterKeyRequest
};

const builtInExamples:ExternalSchemaExample[]=[
 {id:'simple',label:'1. Objeto simples',description:'Testa objeto básico, required e integer com minimum.'},
 {id:'booleanNullable',label:'2. Booleano + nullable',description:'Testa booleano como liga/desliga e campo string|null.'},
 {id:'enumConst',label:'3. Enum + const',description:'Testa enum e valor constante.'},
 {id:'stringConstraints',label:'4. Restrições de string',description:'Testa minLength, maxLength, pattern e examples.'},
 {id:'numericConstraints',label:'5. Restrições numéricas',description:'Testa minimum, maximum, multipleOf e limites exclusivos.'},
 {id:'formats',label:'6. Formatos',description:'Testa email, uri, uuid, date, date-time e time.'},
 {id:'simpleArray',label:'7. Lista simples + limites',description:'Testa array homogêneo com minItems/maxItems.'},
 {id:'multiSelect',label:'8. Multi-select + uniqueItems',description:'Testa array enum com uniqueItems.'},
 {id:'tuple',label:'9. Tuple com prefixItems',description:'Testa posições fixas com prefixItems e items=false.'},
 {id:'tupleWithTail',label:'10. Tuple + items adicionais',description:'Testa prefixItems seguido de items homogêneos.'},
 {id:'nestedObject',label:'11. Objeto aninhado',description:'Testa formulário recursivo e validações internas.'},
 {id:'additionalProperties',label:'12. additionalProperties tipado',description:'Testa campos adicionais com tipo fixo.'},
 {id:'additionalPropertiesTrue',label:'13. additionalProperties: true',description:'Testa campos adicionais totalmente livres.'},
 {id:'additionalPropertiesEmpty',label:'14. additionalProperties: {}',description:'Testa schema vazio para campos adicionais.'},
 {id:'dynamicTypes',label:'15. additionalProperties com union',description:'Testa union explícita para campos dinâmicos.'},
 {id:'freeObject',label:'16. Objeto livre',description:'Testa type:object sem properties.'},
 {id:'freeArray',label:'17. Array livre',description:'Testa type:array sem items.'},
 {id:'patternProperties',label:'18. patternProperties + propertyNames',description:'Testa chaves dinâmicas por regex.'},
 {id:'conditional',label:'19. if / then / else',description:'Testa condicional reativa com limpeza da branch anterior.'},
 {id:'oneOf',label:'20. oneOf com discriminator',description:'Testa alternativas exclusivas HTTP/Kafka.'},
 {id:'oneOfWithoutDiscriminator',label:'21. oneOf sem discriminator',description:'Testa alternativas por tipo sem propriedade const.'},
 {id:'anyOf',label:'22. anyOf',description:'Testa alternativas não exclusivas.'},
 {id:'allOf',label:'23. allOf',description:'Testa composição cumulativa.'},
 {id:'dependentRequired',label:'24. dependentRequired',description:'Testa dependência de obrigatoriedade.'},
 {id:'dependentSchemas',label:'25. dependentSchemas',description:'Testa ativação de schema dependente.'},
 {id:'refs',label:'26. $defs + $ref local',description:'Testa reutilização por referência local.'},
 {id:'contains',label:'27. contains + min/maxContains',description:'Testa regras contains em array.'},
 {id:'unevaluatedProperties',label:'28. unevaluatedProperties',description:'Testa fechamento de propriedades após composição.'},
 {id:'annotations',label:'29. default / examples / readOnly / writeOnly',description:'Testa annotations do JSON Schema.'},
 {id:'directUnion',label:'30. Union direta de tipos',description:'Testa type como array diretamente no campo raiz.'},
 {id:'parameterKeyRequest',label:'31. Parameter key request · condicionais aninhadas',description:'Testa oneOf dentro de allOf, CONFIGURATION/EXPRESSION, operator/valueType/value e transições escalar/lista.'}
];

export const allSchemas:Record<string,Schema>={...builtInSchemas,...accountServiceSchemas};
export const allSchemaExamples:ExternalSchemaExample[]=[...builtInExamples,...accountServiceSchemaExamples];
