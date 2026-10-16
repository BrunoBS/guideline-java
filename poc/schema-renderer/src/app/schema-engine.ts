import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
export type Schema = Record<string, any>;
export const typesOf=(s:Schema):string[]=>Array.isArray(s.type)?s.type:typeof s.type==='string'?[s.type]:[];
export const primaryType=(s:Schema):string=>typesOf(s).find(t=>t!=='null')||'null';
export const isNullable=(s:Schema):boolean=>typesOf(s).includes('null');
export const ajv = new Ajv2020({allErrors:true,strict:false});
addFormats(ajv);
export function deref(schema: Schema, root: Schema, depth=0): Schema {
  if (depth>12) return {type:'object',title:'Referência recursiva (editar no JSON)'};
  if (typeof schema?.['$ref'] !== 'string') return schema;
  const ref=schema['$ref'];
  if (!ref.startsWith('#/')) return {title:'Referência externa (editar no JSON)'};
  const target=ref.slice(2).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~')).reduce((v,k)=>v?.[k],root as any);
  return target ? deref({...target,...Object.fromEntries(Object.entries(schema).filter(([k])=>k!=='$ref'))},root,depth+1):schema;
}
function matches(schema: Schema, value: any, root:Schema): boolean {
  try {
    // Ajv needs the root definitions when a branch uses local $ref.
    const candidate={...schema,$defs:{...(root.$defs||{}),...(schema.$defs||{})},definitions:{...(root.definitions||{}),...(schema.definitions||{})}};
    return !!ajv.validate(candidate,value);
  } catch {return false;}
}
function branchScore(schema:Schema,value:any,root:Schema):number {
  const s=deref(schema,root);
  let score=0;
  for(const [key,rule] of Object.entries(s.properties||{})){
    const field=deref(rule as Schema,root);
    const actual=value?.[key];
    if(actual===undefined)continue;
    if(field.const!==undefined)score+=actual===field.const?100:-100;
    if(Array.isArray(field.enum))score+=field.enum.includes(actual)?30:-30;
    if(actual!==null && typeof actual==='object')score+=branchScore(field,actual,root);
  }
  if(Array.isArray(s.allOf))for(const part of s.allOf)score+=branchScore(part,value,root);
  if(s.if && matches(s.if,value,root))score+=10+branchScore(s.then||{},value,root);
  return score;
}
function branchErrors(schema:Schema,value:any,root:Schema):number {
  try {
    const candidate={...schema,$defs:{...(root.$defs||{}),...(schema.$defs||{})},definitions:{...(root.definitions||{}),...(schema.definitions||{})}};
    const validator=ajv.compile(candidate);
    return validator(value)?0:(validator.errors||[]).length;
  } catch {return Number.MAX_SAFE_INTEGER;}
}
function chooseBranch(options:Schema[],value:any,root:Schema):Schema|undefined {
  const ranked=options.map(s=>({s,score:branchScore(s,value,root),errors:branchErrors(s,value,root)}))
    .sort((a,b)=>a.errors-b.errors||b.score-a.score);
  if(ranked.length===1)return ranked[0].s;
  if(ranked[0]?.errors===0 && ranked[1]?.errors!==0)return ranked[0].s;
  if(ranked[0]?.score>0 && ranked[0].score>ranked[1].score)return ranked[0].s;
  if(ranked[0]?.errors<ranked[1]?.errors)return ranked[0].s;
  // Prefer the create branch only when the object has not yet selected an operation.
  const create=options.find(s=>Array.isArray(s.required)&&s.required.includes('key')&&s.required.includes('microserviceIdentifier'));
  if(create && value?.version===undefined && value?.key===undefined && value?.microserviceIdentifier===undefined)return create;
  return undefined;
}
function ambiguousFields(options:Schema[],value:any,root:Schema):Schema {
  // Keep conditional fields editable until the user provides enough information to select a branch.
  const combined:Schema={properties:{}};
  for(const option of options){
    const part=effective(option,value,root);
    combined.properties={...combined.properties,...(part.properties||{})};
  }
  return combined;
}
export function effective(schema: Schema, value:any, root:Schema): Schema {
  const base=deref(schema,root);
  let result={...base};
  if(Array.isArray(base.allOf))for(const s of base.allOf)result=merge(result,effective(s,value,root));
  if(base.if)result=merge(result,effective(matches(base.if,value,root)?(base.then||{}):(base.else||{}),value,root));
  if(Array.isArray(base.oneOf)||Array.isArray(base.anyOf)){
    const selected=chooseBranch(base.oneOf||base.anyOf,value,root);
    if(selected)result=merge(result,effective(selected,value,root));
    else result=merge(result,ambiguousFields(base.oneOf||base.anyOf,value,root));
  }
  return result;
}
function merge(a:Schema,b:Schema):Schema {
  const properties={...(a.properties||{})};
  for(const [key,v] of Object.entries(b.properties||{})){
    const existing=properties[key];
    properties[key]=existing && typeof existing==='object' && typeof v==='object'
      ?merge(existing,v as Schema):v;
  }
  return {...a,...b,properties,required:[...new Set([...(a.required||[]),...(b.required||[])])]};
}
export function initial(schema:Schema,root:Schema,depth=0):any {
  if(depth>10)return null;
  const s=effective(schema,undefined,root);
  if(s.default!==undefined)return structuredClone(s.default);
  if(s.const!==undefined)return s.const;
  if(s.enum?.length)return s.enum[0];
  if(primaryType(s)==='object'||s.properties){const obj:any={};for(const [key,child] of Object.entries(s.properties||{})) {const c=child as Schema;if((s.required||[]).includes(key)||c.default!==undefined||c.const!==undefined)obj[key]=initial(c,root,depth+1);}return obj;}
  if(primaryType(s)==='array')return Array.from({length:s.minItems||0},()=>initial(s.items||{},root,depth+1));
  if(primaryType(s)==='boolean')return isNullable(s)?null:false;
  if(primaryType(s)==='integer'||primaryType(s)==='number')return isNullable(s)?null:0;
  return isNullable(s)?null:'';
}
export function validate(schema:Schema,value:any):string[] {
  try {const ok=ajv.validate(schema,value);if(ok)return [];
    const errors=ajv.errors||[];
    const oneOf=errors.find(e=>e.keyword==='oneOf');
    if(oneOf){
      const details=errors.filter(e=>e.keyword!=='oneOf' && e.keyword!=='type' && e.keyword!=='false schema');
      return ['O valor não corresponde a exatamente uma alternativa do schema.',...details.map(e=>`${e.instancePath||'/'}: ${e.message||'inválido'}`)].filter((v,i,a)=>a.indexOf(v)===i);
    }
    return errors.map(e=>`${e.instancePath||'/'}: ${e.message||'inválido'}`);}catch(e){return [String(e)];}
}
