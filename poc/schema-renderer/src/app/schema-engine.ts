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
    const field=rule as Schema;
    if(field.const!==undefined && value?.[key]!==undefined)score+=value[key]===field.const?100:-100;
    if(field.enum && value?.[key]!==undefined)score+=field.enum.includes(value[key])?30:-30;
  }
  if(Array.isArray(s.allOf))for(const part of s.allOf)score+=branchScore(part,value,root);
  return score;
}
function chooseBranch(options:Schema[],value:any,root:Schema):Schema|undefined {
  const valid=options.filter(s=>matches(s,value,root));
  if(valid.length===1)return valid[0];
  const ranked=options.map(s=>({s,score:branchScore(s,value,root)})).sort((a,b)=>b.score-a.score);
  // Never silently pick the first branch when there is no discriminating evidence.
  return ranked[0]?.score>0 && (ranked.length===1||ranked[0].score>ranked[1].score)?ranked[0].s:undefined;
}
export function effective(schema: Schema, value:any, root:Schema): Schema {
  const base=deref(schema,root);
  let result={...base};
  if(Array.isArray(base.allOf))for(const s of base.allOf)result=merge(result,effective(s,value,root));
  if(base.if)result=merge(result,effective(matches(base.if,value,root)?(base.then||{}):(base.else||{}),value,root));
  if(Array.isArray(base.oneOf)||Array.isArray(base.anyOf)){
    const selected=chooseBranch(base.oneOf||base.anyOf,value,root);
    if(selected)result=merge(result,effective(selected,value,root));
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
  const s=deref(schema,root);
  if(s.default!==undefined)return structuredClone(s.default);
  if(s.const!==undefined)return s.const;
  if(s.enum?.length)return s.enum[0];
  if(primaryType(s)==='object'||s.properties){const obj:any={};for(const [key,child] of Object.entries(s.properties||{})) {const c=child as Schema;if((s.required||[]).includes(key)||c.default!==undefined||c.const!==undefined)obj[key]=initial(c,root,depth+1);}return obj;}
  if(primaryType(s)==='array')return [];
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
