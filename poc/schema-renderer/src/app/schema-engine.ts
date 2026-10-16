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
function matches(schema:Schema,value:any,root:Schema):boolean {
 try {const check=ajv.compile({...schema,$defs:{...(root.$defs||{}),...(schema.$defs||{})}});return !!check(value);}
 catch {return false;}
}
function merge(a:Schema,b:Schema):Schema {
 const out:Schema={...a,...b};
 const props:Record<string,Schema>={...(a.properties||{})};
 for(const [key,v] of Object.entries(b.properties||{}))props[key]=merge(props[key]||{},v as Schema);
 if(Object.keys(props).length)out.properties=props;
 if(a.required||b.required)out.required=[...new Set([...(a.required||[]),...(b.required||[])])];
 if(a.allOf||b.allOf)out.allOf=[...(a.allOf||[]),...(b.allOf||[])];
 // UI types are based on the base contract, not on the selected oneOf
 // alternative's null-only constraint.
 if(Array.isArray(a.type)&&typeof b.type==='string'&&a.type.includes(b.type))out.type=a.type;
 return out;
}
function branchScore(s:Schema,value:any,root:Schema):number {
 let score=0;
 for(const [key,raw] of Object.entries(deref(s,root).properties||{})){
  const rule=deref(raw as Schema,root),v=value?.[key];
  if(v===undefined)continue;
  if(rule.const!==undefined)score+=v===rule.const?100:-100;
  if(Array.isArray(rule.enum))score+=rule.enum.includes(v)?30:-30;
 }
 return score;
}
function chooseBranch(options:Schema[],value:any,root:Schema):Schema|undefined {
 const valid=options.filter(s=>matches(s,value,root));
 if(valid.length===1)return valid[0];
 const scored=options.map(s=>({s,score:branchScore(s,value,root)})).sort((a,b)=>b.score-a.score);
 if(scored[0]?.score>0&&scored[0].score>(scored[1]?.score??-Infinity))return scored[0].s;
 // Incomplete values must not lock the form into an arbitrary oneOf branch.
 return undefined;
}
function collect(schema:Schema,value:any,root:Schema,depth=0):Schema {
 if(depth>20)return {};
 const s=deref(schema,root);
 let out:Schema={...s};
 // Merge applicable constraints without recursively resolving properties yet.
 for(const part of s.allOf||[])out=merge(out,collect(part,value,root,depth+1));
 if(s.if)out=merge(out,collect(matches(s.if,value,root)?s.then||{}:s.else||{},value,root,depth+1));
 const options=s.oneOf||s.anyOf;
 if(Array.isArray(options)){
  const chosen=chooseBranch(options,value,root);
  if(chosen)out=merge(out,collect(chosen,value,root,depth+1));
  // Without a discriminator, retain all base properties as editable.
 }
 return out;
}
export function effective(schema:Schema,value:any,root:Schema):Schema {
 const base=collect(schema,value,root);
 const properties:Record<string,Schema>={};
 for(const [key,child] of Object.entries(base.properties||{}))
  properties[key]=effective(child as Schema,value?.[key],root);
 return {...base,...(Object.keys(properties).length?{properties}:{})};
}
export function initial(schema:Schema,root:Schema,depth=0):any {
 if(depth>12)return null;
 const s=effective(schema,undefined,root);
 if(s.default!==undefined)return structuredClone(s.default);
 if(s.const!==undefined)return s.const;
 if(s.enum?.length)return s.enum[0];
 if(primaryType(s)==='object'||Object.keys(s.properties||{}).length){
  const obj:any={};
  for(const [key,raw] of Object.entries(s.properties||{})){
   const child=raw as Schema;
   if((s.required||[]).includes(key)||child.default!==undefined||child.const!==undefined)obj[key]=initial(child,root,depth+1);
  }
  return obj;
 }
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
