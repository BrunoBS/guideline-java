import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
export type Schema = Record<string, any>;
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
function matches(schema: Schema, value: any): boolean {
  try {return !!ajv.validate(schema,value);}catch{return false;}
}
export function effective(schema: Schema, value:any, root:Schema): Schema {
  const base=deref(schema,root);
  let result={...base};
  if(Array.isArray(base.allOf)) for(const s of base.allOf) result=merge(result,effective(s,value,root));
  if(base.if) result=merge(result,effective(matches(base.if,value)?(base.then||{}):(base.else||{}),value,root));
  if(Array.isArray(base.oneOf)||Array.isArray(base.anyOf)) {
    const options:Schema[]=base.oneOf||base.anyOf;
    const selected=options.find(s=>matches(s,value)) || options.find(s=>{
      const resolved=deref(s,root);
      const props=resolved.properties||{};
      return Object.keys(props).some(k=>props[k]?.const!==undefined && value?.[k]===props[k].const);
    }) || options[0];
    if(selected) result=merge(result,effective(selected,value,root));
  }
  return result;
}
function merge(a:Schema,b:Schema):Schema {
  return {...a,...b,properties:{...(a.properties||{}),...(b.properties||{})},required:[...new Set([...(a.required||[]),...(b.required||[])])]};
}
export function initial(schema:Schema,root:Schema,depth=0):any {
  if(depth>10)return null;
  const s=deref(schema,root);
  if(s.default!==undefined)return structuredClone(s.default);
  if(s.const!==undefined)return s.const;
  if(s.enum?.length)return s.enum[0];
  if(s.type==='object'||s.properties){const obj:any={};for(const [key,child] of Object.entries(s.properties||{})) {const c=child as Schema;if((s.required||[]).includes(key)||c.default!==undefined||c.const!==undefined)obj[key]=initial(c,root,depth+1);}return obj;}
  if(s.type==='array')return [];
  if(s.type==='boolean')return false;
  if(s.type==='integer'||s.type==='number')return 0;
  return '';
}
export function validate(schema:Schema,value:any):string[] {
  try {const ok=ajv.validate(schema,value);return ok?[]:(ajv.errors||[]).map(e=>`${e.instancePath||'/'}: ${e.message||'inválido'}`);}catch(e){return [String(e)];}
}
