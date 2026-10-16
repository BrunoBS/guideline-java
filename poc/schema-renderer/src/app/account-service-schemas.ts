import {Schema} from './schema-engine';

export type ExternalSchemaExample={id:string;label:string;description:string};

export const accountServiceSchemas:Record<string,Schema>={
 accountApplication:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Application',type:'object',additionalProperties:false,
  required:['name','alias','acronym','applicationScope','settings'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},name:{type:'string',minLength:3,maxLength:50,pattern:'\\S'},
   alias:{type:'string',minLength:1,maxLength:50,pattern:'\\S'},acronym:{type:'string',minLength:1,maxLength:5,pattern:'\\S'},
   description:{type:['string','null'],maxLength:200},applicationScope:{type:'string',enum:['BACKEND','FRONTEND','SHARED'],minLength:1,maxLength:20},
   authorizerGroup:{type:['string','null'],maxLength:10},settings:{type:'object',additionalProperties:false,required:['language','infrastructure'],properties:{language:{type:'string',enum:['JAVA','C#','NODE','GO']},infrastructure:{type:'string',enum:['VM','ECS','EKS']}}},
   tags:{type:['array','null'],maxItems:20,items:{type:'string',maxLength:50}}
  }
 },
 accountContext:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Context request',type:'object',additionalProperties:false,required:['code','name'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},code:{type:'string',maxLength:50,pattern:'^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'},
   name:{type:'string',minLength:1,maxLength:100,pattern:'\\S'},description:{type:['string','null'],maxLength:500}
  }
 },
 accountEnvironmentTypeCompatibility:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Environment type compatibility request',type:'object',additionalProperties:false,required:['parentTypeCode','childTypeCode'],properties:{
   parentTypeCode:{type:'string',enum:['DEFAULT','CUSTOM','SHARD','CELL'],minLength:1,maxLength:50,pattern:'\\S'},
   childTypeCode:{type:'string',enum:['DEFAULT','CUSTOM','SHARD','CELL'],minLength:1,maxLength:50,pattern:'\\S'}
  }
 },
 accountEnvironmentType:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Environment type request',type:'object',additionalProperties:false,
  required:['code','name','description','rootAllowed','allowsChildren','workspaceRequired','displayOrder'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},code:{type:'string',enum:['DEFAULT','CUSTOM','SHARD','CELL'],minLength:1,maxLength:50,pattern:'\\S'},
   name:{type:'string',minLength:1,maxLength:100,pattern:'\\S'},description:{type:'string',minLength:1,maxLength:250,pattern:'\\S'},
   rootAllowed:{type:'boolean'},allowsChildren:{type:'boolean'},workspaceRequired:{type:'boolean'},displayOrder:{type:'integer',minimum:0,maximum:2147483647}
  }
 },
 accountEnvironment:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Environment request',type:'object',additionalProperties:false,
  required:['name','description','authorizationType','settings','environmentTypeCode'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},name:{type:'string',minLength:3,maxLength:50,pattern:'\\S'},
   description:{type:'string',minLength:3,maxLength:200,pattern:'\\S'},authorizationType:{type:'string',enum:['DEV','TST','ADM'],maxLength:50},
   sortOrder:{type:['integer','null'],minimum:1,maximum:2147483647},authorizerGroup:{type:['string','null'],maxLength:253},
   settings:{type:'object',description:'Environment-specific settings; properties are configurable by the platform.',additionalProperties:true},
   parentIdentifier:{type:['string','null'],minLength:1,maxLength:36,format:'uuid'},environmentTypeCode:{type:'string',enum:['DEFAULT','CUSTOM','SHARD','CELL'],maxLength:50}
  }
 },
 accountFeatureContext:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Feature context associations request',type:'object',additionalProperties:false,required:['version','featureIdentifiers'],properties:{
   version:{type:'integer',minimum:0,maximum:9223372036854775807},featureIdentifiers:{type:'array',maxItems:100,items:{type:'string',format:'uuid'}}
  }
 },
 accountFeature:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Feature request',type:'object',additionalProperties:false,required:['code','name','settings','microserviceIdentifier'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},code:{type:'string',maxLength:50,pattern:'^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'},
   name:{type:'string',minLength:1,maxLength:100,pattern:'\\S'},description:{type:['string','null'],maxLength:500},settings:{type:'object'},
   microserviceIdentifier:{type:'string',format:'uuid'},shareable:{type:'boolean',default:false}
  }
 },
 accountMessageTranslation:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Message translation request',type:'object',additionalProperties:false,required:['locale','title','detail','suggestion'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},locale:{type:'string',minLength:2,maxLength:35,pattern:'^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$'},
   title:{type:'string',minLength:1,maxLength:150,pattern:'\\S'},detail:{type:'string',minLength:1,maxLength:1000,pattern:'\\S'},suggestion:{type:'string',minLength:1,maxLength:1000,pattern:'\\S'}
  }
 },
 accountMessage:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Message request',type:'object',additionalProperties:false,required:['microserviceIdentifier','messageKey','code','httpStatus'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},microserviceIdentifier:{type:'string',format:'uuid',minLength:36,maxLength:36},
   messageKey:{type:'string',minLength:1,maxLength:255,pattern:'^[a-z0-9][a-z0-9._-]{0,254}$'},code:{type:'string',minLength:3,maxLength:50,pattern:'^[A-Z][A-Z0-9-]{2,49}$'},
   httpStatus:{type:'integer',minimum:100,maximum:599},observation:{type:['string','null'],maxLength:500},translations:{type:['array','null'],maxItems:100,items:{type:'object',additionalProperties:false,required:['locale','title','detail','suggestion'],properties:{
    version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},locale:{type:'string',minLength:2,maxLength:35,pattern:'^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$'},
    title:{type:'string',minLength:1,maxLength:150,pattern:'\\S'},detail:{type:'string',minLength:1,maxLength:1000,pattern:'\\S'},suggestion:{type:'string',minLength:1,maxLength:1000,pattern:'\\S'}
   }}}
  },allOf:[{if:{required:['version'],properties:{version:{type:'integer'}}},then:{not:{required:['translations']}}}]
 },
 accountMicroservice:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Microservice request',type:'object',additionalProperties:false,required:['code','name','settings'],properties:{
   version:{type:['integer','null'],minimum:0,maximum:9223372036854775807},code:{type:'string',maxLength:50,pattern:'^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'},
   name:{type:'string',minLength:1,maxLength:100,pattern:'\\S'},description:{type:['string','null'],maxLength:500},settings:{type:'object'}
  }
 },
 accountOnboardingPhaseTypeSettings:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Onboarding phase settings',type:'object',additionalProperties:true,properties:{orientation:{type:['string','null']}}
 },
 accountPublisher:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Publisher request',type:'object',additionalProperties:false,required:['name','description','scope','settings','code'],properties:{
   code:{type:'string',enum:['KAFKA','HTTP','APPCONFIG'],maxLength:50},name:{type:'string',minLength:3,maxLength:50,pattern:'\\S'},description:{type:'string',minLength:1,maxLength:200,pattern:'\\S'},
   scope:{type:'string',enum:['WORKSPACE','APPLICATION'],maxLength:50},deprecated:{type:'boolean'},settings:{type:'object'},version:{type:['integer','null'],minimum:0,maximum:9223372036854775807}
  },allOf:[
   {if:{properties:{code:{const:'KAFKA'}},required:['code']},then:{properties:{settings:{type:'object',required:['topic','address'],properties:{topic:{type:'string',minLength:1,maxLength:249,pattern:'\\S'},address:{type:'string',minLength:1,maxLength:1000,pattern:'\\S'}},additionalProperties:false}}}},
   {if:{properties:{code:{const:'APPCONFIG'}},required:['code']},then:{properties:{settings:{type:'object',required:['arn','name'],properties:{arn:{type:'string',minLength:1,maxLength:2048,pattern:'\\S'},name:{type:'string',minLength:1,maxLength:64,pattern:'\\S'}},additionalProperties:false}}}},
   {if:{properties:{code:{const:'HTTP'}},required:['code']},then:{properties:{settings:{type:'object',required:['clientId','timeout'],properties:{clientId:{type:'string',minLength:1,maxLength:100,pattern:'\\S'},timeout:{type:'integer',minimum:1,maximum:60000,description:'Timeout in milliseconds.'}},additionalProperties:false}}}}
  ]
 },
 accountWorkspace:{
  '$schema':'https://json-schema.org/draft/2020-12/schema',title:'Workspace',type:'object',additionalProperties:false,
  required:['workspaceType','name','description','requester','acronym','emailGroup','approvers'],properties:{
   workspaceType:{type:'string',minLength:1,enum:['ADMIN','MANAGER'],maxLength:20},name:{type:'string',minLength:3,maxLength:50,pattern:'\\S'},description:{type:'string',minLength:10,maxLength:200,pattern:'\\S'},
   requester:{type:'string',minLength:5,maxLength:10,pattern:'\\S'},acronym:{type:'string',minLength:1,maxLength:5,pattern:'\\S'},authorizerGroup:{type:['string','null'],maxLength:10},
   settings:{type:['object','null'],additionalProperties:true},emailGroup:{type:'string',minLength:1,maxLength:100,pattern:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',format:'email'},
   approvers:{type:'array',minItems:1,maxItems:5,items:{type:'object',additionalProperties:false,required:['functional','email'],properties:{functional:{type:'string',minLength:1,maxLength:10,pattern:'\\S'},email:{type:'string',minLength:1,maxLength:100,pattern:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',format:'email'}}}},
   tags:{type:['array','null'],items:{type:'string',maxLength:50},maxItems:20},version:{type:['integer','null'],minimum:0,maximum:9223372036854775807}
  }
 }
};

export const accountServiceSchemaExamples:ExternalSchemaExample[]=[
 {id:'accountApplication',label:'32. Account Service · Application',description:'Schema real application.json. Valide campos obrigatórios, enums de escopo/linguagem/infraestrutura, objeto settings fechado, tags nullable e limites de strings.'},
 {id:'accountContext',label:'33. Account Service · Context',description:'Schema real context.json. Valide code em kebab-case, nome obrigatório, description nullable e version nullable.'},
 {id:'accountEnvironmentTypeCompatibility',label:'34. Account Service · Environment type compatibility',description:'Schema real environment-type-compatibility.json. Valide os dois enums DEFAULT/CUSTOM/SHARD/CELL e obrigatoriedade de parentTypeCode/childTypeCode.'},
 {id:'accountEnvironmentType',label:'35. Account Service · Environment type',description:'Schema real environment-type.json. Exercita enum, três booleanos como switches, displayOrder inteiro e campos obrigatórios.'},
 {id:'accountEnvironment',label:'36. Account Service · Environment',description:'Schema real environment.json. Exercita nullable, UUID, enum e settings com additionalProperties:true e tipos JSON dinâmicos.'},
 {id:'accountFeatureContext',label:'37. Account Service · Feature context',description:'Schema real feature-context.json. Exercita array de UUIDs, maxItems e version obrigatória.'},
 {id:'accountFeature',label:'38. Account Service · Feature',description:'Schema real feature.json. Exercita objeto settings livre, UUID obrigatório, default booleano shareable e strings com pattern.'},
 {id:'accountMessageTranslation',label:'39. Account Service · Message translation',description:'Schema real message-translation.json. Exercita locale por pattern e textos obrigatórios com limites.'},
 {id:'accountMessage',label:'40. Account Service · Message',description:'Schema real message.json. Exercita array nullable de objetos, condicionais com not e regra que impede translations quando version é integer.'},
 {id:'accountMicroservice',label:'41. Account Service · Microservice',description:'Schema real microservice.json. Exercita code, nome, nullable e settings como objeto livre.'},
 {id:'accountOnboardingPhaseTypeSettings',label:'42. Account Service · Onboarding phase settings',description:'Schema real onboarding-phase-type-settings.json. Exercita objeto híbrido com additionalProperties:true e orientation nullable.'},
 {id:'accountPublisher',label:'43. Account Service · Publisher',description:'Schema real publisher.json. Caso importante de allOf + if/then: KAFKA, HTTP e APPCONFIG devem trocar a estrutura de settings sem preservar campos da branch anterior.'},
 {id:'accountWorkspace',label:'44. Account Service · Workspace',description:'Schema real workspace.json. Exercita arrays de objetos, email, settings object|null com additionalProperties:true, tags nullable e diversos campos obrigatórios.'}
];
