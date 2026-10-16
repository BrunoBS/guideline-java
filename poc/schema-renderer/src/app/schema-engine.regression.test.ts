import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {
 effective,initial,primaryType,validate,nonNullTypes,hasTypeUnion,narrowedSchema,
 arrayItemSchema,additionalSchemaForKey,propertyNameIssue,reconcileValue,isFalseSchema,isFreeSchema
} from './schema-engine';

const schema:any={
 type:'object',required:['type','value'],properties:{
  version:{type:['integer','null'],minimum:0},
  microserviceIdentifier:{type:'string'},
  key:{type:'string'},
  type:{enum:['CONFIGURATION','EXPRESSION']},
  value:{}
 },
 allOf:[
  {oneOf:[
   {required:['microserviceIdentifier','key'],properties:{version:{type:'null'}}},
   {required:['version'],properties:{version:{type:'integer'},microserviceIdentifier:false,key:false}}
  ]},
  {if:{properties:{type:{const:'EXPRESSION'}},required:['type']},
   then:{properties:{value:{type:'object',required:['operator','valueType','value'],properties:{
    operator:{enum:['EQUALS','CONTAINS']},valueType:{enum:['INTEGER','STRING']},value:{}
   },allOf:[
    {if:{properties:{operator:{const:'CONTAINS'}},required:['operator']},then:{properties:{value:{type:'array',minItems:1}}},else:{properties:{value:{not:{type:'array'}}}}},
    {if:{properties:{valueType:{const:'INTEGER'}},required:['valueType']},then:{
     if:{properties:{operator:{const:'CONTAINS'}},required:['operator']},
     then:{properties:{value:{items:{type:'integer'}}}},
     else:{properties:{value:{type:'integer'}}}
    }}
   ]}}}}
 ]
};

test('nullable version is editable as integer or null',()=>{
 const create=effective(schema,{type:'EXPRESSION',value:{},version:null},schema);
 assert.deepEqual(create.properties.version.type,['integer','null']);
 const update=effective(schema,{type:'EXPRESSION',value:{},version:1},schema);
 assert.deepEqual(update.properties.version.type,['integer','null']);
});

test('CONTAINS + INTEGER resolves to array of integers',()=>{
 const data={type:'EXPRESSION',value:{operator:'CONTAINS',valueType:'INTEGER',value:[1]},version:null,key:'minha.chave',microserviceIdentifier:'abc'};
 const field=effective(schema,data,schema).properties.value.properties.value;
 assert.equal(primaryType(field),'array');
 assert.equal(primaryType(field.items),'integer');
 assert.deepEqual(validate(schema,data),[]);
});

test('EQUALS + INTEGER resolves to scalar integer',()=>{
 const data={type:'EXPRESSION',value:{operator:'EQUALS',valueType:'INTEGER',value:1},version:null,key:'minha.chave',microserviceIdentifier:'abc'};
 const field=effective(schema,data,schema).properties.value.properties.value;
 assert.equal(primaryType(field),'integer');
 assert.deepEqual(validate(schema,data),[]);
});

test('creation and update alternatives validate independently',()=>{
 const creation={type:'EXPRESSION',value:{operator:'EQUALS',valueType:'INTEGER',value:1},version:null,key:'minha.chave',microserviceIdentifier:'abc'};
 const update={type:'EXPRESSION',value:{operator:'EQUALS',valueType:'INTEGER',value:1},version:1};
 assert.deepEqual(validate(schema,creation),[]);
 assert.deepEqual(validate(schema,update),[]);
});

test('type unions expose all non-null alternatives',()=>{
 const union:any={type:['string','integer','number','boolean','null']};
 assert.equal(hasTypeUnion(union),true);
 assert.deepEqual(nonNullTypes(union),['string','integer','number','boolean']);
 assert.equal(primaryType(narrowedSchema(union,'boolean',union)),'boolean');
});

test('optional properties are not created unless required/default/const',()=>{
 const s:any={type:'object',required:['requiredValue'],properties:{requiredValue:{type:'string'},optionalValue:{type:'string'},withDefault:{type:'integer',default:5}}};
 assert.deepEqual(initial(s,s),{requiredValue:'',withDefault:5});
});

test('boolean schemas validate true and reject false',()=>{
 assert.deepEqual(validate(true,{anything:'goes'}),[]);
 assert.notDeepEqual(validate(false,'nope'),[]);
 assert.equal(isFalseSchema(effective(false,'x',{})),true);
});

test('hybrid object preserves fixed and additional properties',()=>{
 const s:any={type:'object',properties:{responsavel:{type:'string'},sigla:{type:'string'}},additionalProperties:{type:'string'}};
 const data={responsavel:'Bruno',sigla:'PM',ownerTeam:'platform'};
 assert.deepEqual(reconcileValue(s,data,s),data);
 assert.equal(primaryType(additionalSchemaForKey(s,'ownerTeam',s)),'string');
});

test('additionalProperties true allows unconstrained dynamic values',()=>{
 const s:any={type:'object',properties:{name:{type:'string'}},additionalProperties:true};
 const data={name:'app',free:{nested:true},count:5};
 assert.deepEqual(reconcileValue(s,data,s),data);
});

test('additionalProperties false removes unknown values during reconciliation',()=>{
 const s:any={type:'object',properties:{name:{type:'string'}},additionalProperties:false};
 assert.deepEqual(reconcileValue(s,{name:'app',unknown:'x'},s),{name:'app'});
});

test('patternProperties selects schema for matching dynamic key',()=>{
 const s:any={type:'object',patternProperties:{'^x-':{type:'integer'}},additionalProperties:false};
 assert.equal(primaryType(additionalSchemaForKey(s,'x-timeout',s)),'integer');
 assert.equal(isFalseSchema(additionalSchemaForKey(s,'other',s)),true);
 assert.deepEqual(validate(s,{'x-timeout':10}),[]);
});

test('propertyNames validates dynamic keys',()=>{
 const s:any={type:'object',propertyNames:{pattern:'^[a-z][a-z0-9-]*$'},additionalProperties:true};
 assert.equal(propertyNameIssue(s,'valid-key',s),'');
 assert.notEqual(propertyNameIssue(s,'INVALID KEY',s),'');
});

test('prefixItems resolves tuple schemas by position',()=>{
 const s:any={type:'array',prefixItems:[{type:'string'},{type:'integer'}],items:false};
 assert.equal(primaryType(arrayItemSchema(s,0,s)),'string');
 assert.equal(primaryType(arrayItemSchema(s,1,s)),'integer');
 assert.equal(isFalseSchema(arrayItemSchema(s,2,s)),true);
 assert.deepEqual(validate(s,['code',10]),[]);
 assert.notDeepEqual(validate(s,['code',10,'extra']),[]);
});

test('dependentRequired becomes effective when trigger exists',()=>{
 const s:any={type:'object',properties:{creditCard:{type:'string'},billingAddress:{type:'string'}},dependentRequired:{creditCard:['billingAddress']}};
 const resolved=effective(s,{creditCard:'123'},s);
 assert.deepEqual(resolved.required,['billingAddress']);
 assert.notDeepEqual(validate(s,{creditCard:'123'}),[]);
 assert.deepEqual(validate(s,{creditCard:'123',billingAddress:'Rua A'}),[]);
});

test('dependentSchemas contributes properties when trigger exists',()=>{
 const s:any={type:'object',properties:{mode:{type:'string'}},dependentSchemas:{mode:{properties:{details:{type:'string'}},required:['details']}}};
 const resolved=effective(s,{mode:'advanced'},s);
 assert.equal(primaryType(resolved.properties.details),'string');
 assert.ok(resolved.required.includes('details'));
});

test('anyOf merges all branches currently satisfied by the value',()=>{
 const s:any={type:'object',anyOf:[{properties:{a:{type:'string'}}},{properties:{b:{type:'integer'}}}]};
 const resolved=effective(s,{a:'x',b:1},s);
 assert.equal(primaryType(resolved.properties.a),'string');
 assert.equal(primaryType(resolved.properties.b),'integer');
});

test('contains minContains and maxContains are delegated to JSON Schema validation',()=>{
 const s:any={type:'array',contains:{type:'integer',minimum:10},minContains:1,maxContains:2};
 assert.deepEqual(validate(s,[1,10,20]),[]);
 assert.notDeepEqual(validate(s,[1,2,3]),[]);
 assert.notDeepEqual(validate(s,[10,20,30]),[]);
});

test('minProperties and maxProperties are enforced by validation',()=>{
 const s:any={type:'object',minProperties:1,maxProperties:2,additionalProperties:true};
 assert.notDeepEqual(validate(s,{}),[]);
 assert.deepEqual(validate(s,{a:1,b:2}),[]);
 assert.notDeepEqual(validate(s,{a:1,b:2,c:3}),[]);
});

test('not constraints remain enforced',()=>{
 const s:any={type:'string',not:{const:'FORBIDDEN'}};
 assert.deepEqual(validate(s,'OK'),[]);
 assert.notDeepEqual(validate(s,'FORBIDDEN'),[]);
});

test('unevaluatedProperties false removes fields not evaluated by the effective schema',()=>{
 const s:any={type:'object',properties:{name:{type:'string'}},unevaluatedProperties:false};
 assert.deepEqual(reconcileValue(s,{name:'app',extra:'x'},s),{name:'app'});
 assert.equal(isFalseSchema(additionalSchemaForKey(s,'extra',s)),true);
});

test('unevaluatedProperties schema is used for dynamic values',()=>{
 const s:any={type:'object',properties:{name:{type:'string'}},unevaluatedProperties:{type:'integer'}};
 assert.equal(primaryType(additionalSchemaForKey(s,'priority',s)),'integer');
 assert.deepEqual(reconcileValue(s,{name:'app',priority:2},s),{name:'app',priority:2});
});

test('external refs are exposed as free editable schemas instead of failing silently',()=>{
 const s:any={$ref:'https://example.com/schemas/config.json'};
 const resolved=effective(s,{a:1},s);
 assert.equal(resolved.__externalRef,'https://example.com/schemas/config.json');
 assert.equal(isFreeSchema(resolved),true);
});
