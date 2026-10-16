import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export type Schema = Record<string, any>;
export type ValidationIssue = {path:string;message:string};

export const ajv = new Ajv2020({allErrors:true,strict:false,multipleOfPrecision:12});
addFormats(ajv);

export const isBooleanSchema=(schema:any):boolean=>schema===true||schema===false;
export const isFalseSchema=(schema:any):boolean=>schema===false||schema?.__booleanSchema===false;
export const isTrueSchema=(schema:any):boolean=>schema===true||schema?.__booleanSchema===true;
const asObject=(schema:any):Schema=>schema===true?{__booleanSchema:true}:schema===false?{__booleanSchema:false}:(schema||{});

export const typesOf=(schema:any):string[]=>{
 const s=asObject(schema);
 return Array.isArray(s.type)?s.type:typeof s.type==='string'?[s.type]:[];
};
export const nonNullTypes=(schema:any):string[]=>typesOf(schema).filter(t=>t!=='null');
export const primaryType=(schema:any):string=>nonNullTypes(schema)[0]||'null';
export const isNullable=(schema:any):boolean=>typesOf(schema).includes('null');
export const hasTypeUnion=(schema:any):boolean=>nonNullTypes(schema).length>1;
export const isFreeSchema=(schema:any):boolean=>{
 const s=asObject(schema);
 return isTrueSchema(s)||(!isFalseSchema(s)&&Object.keys(s).filter(k=>!['title','description','examples','default','$comment'].includes(k)).length===0);
};

export function deref(schema:any,root:Schema,depth=0):Schema {
 if(schema===true||schema===false)return asObject(schema);
 if(depth>20)return {type:'object',title:'Referência recursiva',description:'Profundidade máxima de referência atingida.'};
 const s=asObject(schema);
 if(typeof s.$ref!=='string')return s;
 const ref=s.$ref;
 if(!ref.startsWith('#/')){
  const annotations=Object.fromEntries(Object.entries(s).filter(([key])=>key!=='$ref'));
  return {...annotations,__externalRef:ref,__booleanSchema:true,title:s.title||'Referência externa',description:s.description||'A POC não resolve referências externas automaticamente.'};
 }
 const target=ref.slice(2).split('/').map((part:string)=>part.replace(/~1/g,'/').replace(/~0/g,'~')).reduce((value:any,key:string)=>value?.[key],root as any);
 if(target===undefined)return s;
 const siblings=Object.fromEntries(Object.entries(s).filter(([key])=>key!=='$ref'));
 return deref(merge(asObject(target),siblings),root,depth+1);
}

function compileSchema(schema:any,root:Schema){
 const raw=schema===true||schema===false?schema:{...schema,$defs:{...(root.$defs||{}),...(schema?.$defs||{})}};
 return ajv.compile(raw);
}

export function matches(schema:any,value:any,root:Schema):boolean {
 try{return !!compileSchema(schema,root)(value);}catch{return false;}
}

export function merge(a:any,b:any):Schema {
 if(a===false||b===false)return {__booleanSchema:false};
 if(a===true)return asObject(b);
 if(b===true)return asObject(a);
 const aa=asObject(a),bb=asObject(b);
 const out:Schema={...aa,...bb};
 const props:Record<string,any>={...(aa.properties||{})};
 for(const [key,value] of Object.entries(bb.properties||{}))props[key]=merge(props[key]||{},value);
 if(Object.keys(props).length)out.properties=props;
 if(aa.required||bb.required)out.required=[...new Set([...(aa.required||[]),...(bb.required||[])])];
 if(aa.allOf||bb.allOf)out.allOf=[...(aa.allOf||[]),...(bb.allOf||[])];
 if(aa.patternProperties||bb.patternProperties)out.patternProperties={...(aa.patternProperties||{}),...(bb.patternProperties||{})};
 if(Array.isArray(aa.type)&&typeof bb.type==='string'&&aa.type.includes(bb.type))out.type=aa.type;
 if(Array.isArray(bb.type)&&typeof aa.type==='string'&&bb.type.includes(aa.type))out.type=bb.type;
 return out;
}

function branchScore(schema:any,value:any,root:Schema):number {
 const s=deref(schema,root);
 let score=0;
 for(const [key,raw] of Object.entries(s.properties||{})){
  const rule=deref(raw,root),current=value?.[key];
  if(current===undefined)continue;
  if(rule.const!==undefined)score+=current===rule.const?100:-100;
  if(Array.isArray(rule.enum))score+=rule.enum.includes(current)?30:-30;
 }
 const kind=runtimeType(value);
 if(nonNullTypes(s).includes(kind))score+=10;
 return score;
}

export function chooseOneOf(options:any[],value:any,root:Schema):Schema|undefined {
 const valid=options.filter(schema=>matches(schema,value,root));
 if(valid.length===1)return asObject(valid[0]);
 const scored=options.map(schema=>({schema,score:branchScore(schema,value,root)})).sort((a,b)=>b.score-a.score);
 if(scored[0]?.score>0&&scored[0].score>(scored[1]?.score??-Infinity))return asObject(scored[0].schema);
 return undefined;
}

function collect(schema:any,value:any,root:Schema,depth=0):Schema {
 if(depth>30)return {};
 if(schema===false)return {__booleanSchema:false};
 if(schema===true)return {__booleanSchema:true};
 const s=deref(schema,root);
 if(isFalseSchema(s)||isTrueSchema(s))return s;
 let out:Schema={...s};
 delete out.allOf;delete out.if;delete out.then;delete out.else;delete out.oneOf;delete out.anyOf;

 for(const part of s.allOf||[])out=merge(out,collect(part,value,root,depth+1));
 if(s.if)out=merge(out,collect(matches(s.if,value,root)?s.then||{}:s.else||{},value,root,depth+1));

 if(Array.isArray(s.oneOf)){
  const chosen=chooseOneOf(s.oneOf,value,root);
  if(chosen)out=merge(out,collect(chosen,value,root,depth+1));
  else out.__oneOfOptions=s.oneOf;
 }

 if(Array.isArray(s.anyOf)){
  const valid=s.anyOf.filter((option:any)=>matches(option,value,root));
  if(valid.length){for(const option of valid)out=merge(out,collect(option,value,root,depth+1));}
  else out.__anyOfOptions=s.anyOf;
 }

 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const required=[...(out.required||[])];
  for(const [trigger,dependencies] of Object.entries(s.dependentRequired||{})){
   if(Object.prototype.hasOwnProperty.call(value,trigger))required.push(...(dependencies as string[]));
  }
  if(required.length)out.required=[...new Set(required)];
  for(const [trigger,dependent] of Object.entries(s.dependentSchemas||{})){
   if(Object.prototype.hasOwnProperty.call(value,trigger))out=merge(out,collect(dependent,value,root,depth+1));
  }
 }

 delete out.allOf;delete out.if;delete out.then;delete out.else;delete out.oneOf;delete out.anyOf;
 return out;
}

export function effective(schema:any,value:any,root:Schema):Schema {
 const base=collect(schema,value,root);
 if(isFalseSchema(base)||isTrueSchema(base))return base;
 const properties:Record<string,any>={};
 for(const [key,child] of Object.entries(base.properties||{}))properties[key]=effective(child,value?.[key],root);
 return {...base,...(Object.keys(properties).length?{properties}:{})};
}

export function runtimeType(value:any):string {
 if(value===null)return 'null';
 if(Array.isArray(value))return 'array';
 if(typeof value==='number')return Number.isInteger(value)?'integer':'number';
 if(typeof value==='object')return 'object';
 return typeof value;
}

export function narrowedSchema(schema:any,type:string,root:Schema):Schema {
 const s=deref(schema,root);
 return {...s,type};
}

export function schemaAlternatives(schema:any,root:Schema):Schema[] {
 const s=deref(schema,root);
 const compositions=[...(s.oneOf||[]),...(s.anyOf||[])];
 if(compositions.length)return compositions.map((option:any)=>deref(option,root));
 return nonNullTypes(s).map(type=>({...s,type}));
}

export function schemaLabel(schema:any,index:number,root:Schema):string {
 const s=deref(schema,root);
 if(s.title)return s.title;
 if(s.const!==undefined)return String(s.const);
 if(Array.isArray(s.enum)&&s.enum.length<=4)return s.enum.join(' / ');
 const types=nonNullTypes(s);
 return types.length?types.join(' | '):`Alternativa ${index+1}`;
}

export function initial(schema:any,root:Schema,depth=0):any {
 if(depth>20)return null;
 if(schema===false||isFalseSchema(schema))return undefined;
 if(schema===true||isTrueSchema(schema))return '';
 const s=effective(schema,undefined,root);
 if(s.default!==undefined)return structuredClone(s.default);
 if(s.const!==undefined)return structuredClone(s.const);
 if(s.enum?.length)return structuredClone(s.enum[0]);
 if(hasTypeUnion(s))return initial(narrowedSchema(s,nonNullTypes(s)[0],root),root,depth+1);
 if(s.__oneOfOptions?.length)return initial(s.__oneOfOptions[0],root,depth+1);
 if(s.__anyOfOptions?.length)return initial(s.__anyOfOptions[0],root,depth+1);
 if(primaryType(s)==='object'||(primaryType(s)==='null'&&Object.keys(s.properties||{}).length>0)){
  const obj:any={};
  for(const [key,raw] of Object.entries(s.properties||{})){
   const child=raw as Schema;
   if((s.required||[]).includes(key)||child.default!==undefined||child.const!==undefined)obj[key]=initial(child,root,depth+1);
  }
  return obj;
 }
 if(primaryType(s)==='array'){
  const count=s.minItems||0;
  return Array.from({length:count},(_,index)=>initial(arrayItemSchema(s,index,root),root,depth+1));
 }
 if(primaryType(s)==='boolean')return isNullable(s)?null:false;
 if(primaryType(s)==='integer'||primaryType(s)==='number')return isNullable(s)?null:0;
 if(primaryType(s)==='null')return null;
 return isNullable(s)?null:'';
}

function compatibleValue(schema:any,value:any):boolean {
 const s=asObject(schema);
 if(value===null)return isNullable(s)||primaryType(s)==='null';
 const allowed=nonNullTypes(s);
 if(allowed.length>1)return allowed.includes(runtimeType(value))||(runtimeType(value)==='integer'&&allowed.includes('number'));
 const kind=primaryType(s);
 if(kind==='object')return typeof value==='object'&&!Array.isArray(value);
 if(kind==='array')return Array.isArray(value);
 if(kind==='integer')return typeof value==='number'&&Number.isInteger(value);
 if(kind==='number')return typeof value==='number'&&Number.isFinite(value);
 if(kind==='boolean')return typeof value==='boolean';
 if(kind==='string')return typeof value==='string';
 if(kind==='null')return value===null;
 return true;
}

export function arrayItemSchema(schema:any,index:number,root:Schema):Schema {
 const s=deref(schema,root);
 if(Array.isArray(s.prefixItems)&&index<s.prefixItems.length)return deref(s.prefixItems[index],root);
 if(s.items===false)return {__booleanSchema:false};
 if(s.items===true||s.items===undefined)return {__booleanSchema:true};
 return deref(s.items,root);
}

export function additionalSchemaForKey(schema:any,key:string,root:Schema):Schema {
 const s=deref(schema,root);
 if(s.properties?.[key]!==undefined)return deref(s.properties[key],root);
 const matchesPatterns=Object.entries(s.patternProperties||{}).filter(([pattern])=>{
  try{return new RegExp(pattern).test(key);}catch{return false;}
 }).map(([,rule])=>deref(rule,root));
 let result:Schema={};
 for(const rule of matchesPatterns)result=merge(result,rule);
 if(matchesPatterns.length)return result;
 if(s.additionalProperties===false)return {__booleanSchema:false};
 if(s.additionalProperties===true)return {__booleanSchema:true};
 if(s.additionalProperties&&typeof s.additionalProperties==='object')return deref(s.additionalProperties,root);
 if(s.unevaluatedProperties===false)return {__booleanSchema:false};
 if(s.unevaluatedProperties===true)return {__booleanSchema:true};
 if(s.unevaluatedProperties&&typeof s.unevaluatedProperties==='object')return deref(s.unevaluatedProperties,root);
 return {__booleanSchema:true};
}

export function propertyNameIssue(schema:any,key:string,root:Schema):string {
 const s=deref(schema,root);
 if(!s.propertyNames)return '';
 try{
  const validator=compileSchema(s.propertyNames,root);
  if(validator(key))return '';
  return validator.errors?.[0]?.message||'Nome de propriedade inválido.';
 }catch{return 'Não foi possível validar o nome da propriedade.';}
}

export function reconcileValue(schema:any,value:any,root:Schema,depth=0):any {
 if(depth>30)return value;
 const s=effective(schema,value,root);
 if(value===undefined)return value;
 if(isFalseSchema(s))return undefined;
 if(isTrueSchema(s))return value;
 if(!compatibleValue(s,value))return initial(s,root,depth+1);
 if(primaryType(s)==='object'&&value!==null){
  const next:Record<string,any>={...value};
  for(const key of Object.keys(next)){
   const child=additionalSchemaForKey(s,key,root);
   if(isFalseSchema(child)){delete next[key];continue;}
   next[key]=reconcileValue(child,next[key],root,depth+1);
  }
  return next;
 }
 if(primaryType(s)==='array'&&Array.isArray(value)){
  const max=s.maxItems===undefined?value.length:Math.min(value.length,s.maxItems);
  return value.slice(0,max).map((item,index)=>reconcileValue(arrayItemSchema(s,index,root),item,root,depth+1));
 }
 return value;
}

function escapePointer(value:string):string{return value.replace(/~/g,'~0').replace(/\//g,'~1');}
function issuePath(error:any):string {
 let path=error.instancePath||'';
 if(error.keyword==='required'&&error.params?.missingProperty)path=`${path}/${escapePointer(String(error.params.missingProperty))}`;
 if(error.keyword==='propertyNames'&&error.params?.propertyName)path=`${path}/${escapePointer(String(error.params.propertyName))}`;
 return path||'/';
}
function uniqueIssues(issues:ValidationIssue[]):ValidationIssue[]{
 return issues.filter((issue,index,all)=>all.findIndex(other=>other.path===issue.path&&other.message===issue.message)===index);
}

export function validationIssues(schema:any,value:any):ValidationIssue[] {
 try{
  const validator=ajv.compile(schema);
  const ok=validator(value);if(ok)return [];
  const errors=validator.errors||[];
  const oneOf=errors.find(error=>error.keyword==='oneOf');
  if(oneOf){
   const details=errors.filter(error=>error.keyword!=='oneOf'&&error.keyword!=='type'&&error.keyword!=='false schema');
   return uniqueIssues([{path:issuePath(oneOf),message:'O valor não corresponde a exatamente uma alternativa do schema.'},...details.map(error=>({path:issuePath(error),message:error.message||'inválido'}))]);
  }
  return uniqueIssues(errors.map(error=>({path:issuePath(error),message:error.message||'inválido'})));
 }catch(error){return [{path:'/',message:String(error)}];}
}

export function validate(schema:any,value:any):string[]{return validationIssues(schema,value).map(issue=>`${issue.path}: ${issue.message}`);}
