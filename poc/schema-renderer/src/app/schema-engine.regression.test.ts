import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {effective,initial,primaryType,validate} from './schema-engine';

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
