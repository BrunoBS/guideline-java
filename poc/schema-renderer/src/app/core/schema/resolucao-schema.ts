import { criarApresentacaoJson, possuiReferenciaDinamica } from './limites-apresentacao';
import {
  Schema,
  ehSchemaProibido,
  obterTipos,
  obterTipoDoValor,
  obterTiposNaoNulos,
  normalizarSchemaBooleano,
  ehSchemaIrrestrito,
  permiteNulo,
} from './tipos-schema';
import { resolverReferencia } from './referencias-schema';
import { valoresJsonIguais } from './json-value';
import { valorAtendeSchema } from './validacao-schema';
import { combinarSchemas } from './combinacao-schemas';

export function pontuarAlternativa(schema: any, value: any, root: Schema): number {
  const s = resolverReferencia(schema, root);
  let score = 0;
  for (const [key, raw] of Object.entries(s.properties || {})) {
    const rule = resolverReferencia(raw, root),
      current = value?.[key];
    if (current === undefined) continue;
    if (rule.const !== undefined) score += current === rule.const ? 100 : -100;
    if (Array.isArray(rule.enum))
      score += rule.enum.some((candidate: any) => valoresJsonIguais(candidate, current)) ? 30 : -30;
    if (ehSchemaProibido(rule)) {
      score -= 15;
      continue;
    }
    const allowed = obterTipos(rule);
    if (allowed.length) {
      const currentType = obterTipoDoValor(current);
      const compatible =
        allowed.includes(currentType) || (currentType === 'integer' && allowed.includes('number'));
      score += compatible ? 60 : -60;
    }
  }
  for (const key of s.required || [])
    score += value && Object.prototype.hasOwnProperty.call(value, key) ? 10 : -10;
  const kind = obterTipoDoValor(value);
  if (obterTiposNaoNulos(s).includes(kind)) score += 10;
  return score;
}

export function escolherAlternativa(options: any[], value: any, root: Schema): Schema | undefined {
  const valid = options.filter((schema) => valorAtendeSchema(schema, value, root));
  if (valid.length === 1) return normalizarSchemaBooleano(valid[0]);
  const scored = options
    .map((schema) => ({ schema, score: pontuarAlternativa(schema, value, root) }))
    .sort((a, b) => b.score - a.score);
  if (scored[0]?.score > 0 && scored[0].score > (scored[1]?.score ?? -Infinity))
    return normalizarSchemaBooleano(scored[0].schema);
  return undefined;
}

export function coletarRegrasAplicaveis(schema: any, value: any, root: Schema, depth = 0): Schema {
  if (depth > 30)
    return criarApresentacaoJson(schema, 'Limite de composição atingido. Edite o valor em JSON.');
  if (schema === false) return { __booleanSchema: false };
  if (schema === true) return { __booleanSchema: true };
  const s = resolverReferencia(schema, root);
  if (ehSchemaProibido(s) || ehSchemaIrrestrito(s)) return s;
  let out: Schema = { ...s };
  delete out.allOf;
  delete out.if;
  delete out.then;
  delete out.else;
  delete out.oneOf;
  delete out.anyOf;
  for (const part of s.allOf || []) {
    const declaredProperties = out.properties;
    out = combinarSchemas(out, coletarRegrasAplicaveis(part, value, root, depth + 1));
    // Keep nullable controls switchable; Ajv still enforces the selected branch.
    for (const [key, definition] of Object.entries(declaredProperties || {})) {
      const declared = normalizarSchemaBooleano(definition);
      if (
        permiteNulo(declared) &&
        obterTiposNaoNulos(declared).length &&
        out.properties?.[key] &&
        !ehSchemaProibido(out.properties[key])
      ) {
        out.properties[key] = { ...out.properties[key], type: declared.type };
      }
    }
  }
  if (s.if !== undefined)
    out = combinarSchemas(
      out,
      coletarRegrasAplicaveis(
        valorAtendeSchema(s.if, value, root) ? (s.then ?? {}) : (s.else ?? {}),
        value,
        root,
        depth + 1,
      ),
    );
  if (Array.isArray(s.oneOf)) {
    const chosen = escolherAlternativa(s.oneOf, value, root);
    if (chosen) out = combinarSchemas(out, coletarRegrasAplicaveis(chosen, value, root, depth + 1));
    else out.__oneOfOptions = s.oneOf;
  }
  if (Array.isArray(s.anyOf)) {
    const valid = s.anyOf.filter((option: any) => valorAtendeSchema(option, value, root));
    if (valid.length) {
      for (const option of valid)
        out = combinarSchemas(out, coletarRegrasAplicaveis(option, value, root, depth + 1));
    } else out.__anyOfOptions = s.anyOf;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const required = [...(out.required || [])];
    for (const [trigger, dependencies] of Object.entries(s.dependentRequired || {}))
      if (Object.prototype.hasOwnProperty.call(value, trigger))
        required.push(...(dependencies as string[]));
    if (required.length) out.required = [...new Set(required)];
    for (const [trigger, dependent] of Object.entries(s.dependentSchemas || {}))
      if (Object.prototype.hasOwnProperty.call(value, trigger))
        out = combinarSchemas(out, coletarRegrasAplicaveis(dependent, value, root, depth + 1));
  }
  delete out.allOf;
  delete out.if;
  delete out.then;
  delete out.else;
  delete out.oneOf;
  delete out.anyOf;
  return out;
}

/** Resolve one control while retaining child contracts for later user edits. */
export function resolverSchemaDoCampo(schema: any, value: any, root: Schema): Schema {
  if (schema === root && possuiReferenciaDinamica(root))
    return criarApresentacaoJson(
      schema,
      'Este contrato usa referência dinâmica. Edite o valor em JSON; a validação considera o documento completo.',
    );
  return coletarRegrasAplicaveis(schema, value, root);
}

/** Resolved snapshot for inspecting the complete current object shape. */
export function resolverEstruturaAtual(schema: any, value: any, root: Schema): Schema {
  const resolve = (node: any, current: any, depth: number): Schema => {
    const result = coletarRegrasAplicaveis(node, current, root);
    if (depth >= 20 || !result.properties) return result;
    return {
      ...result,
      properties: Object.fromEntries(
        Object.entries(result.properties).map(([key, child]) => [
          key,
          resolve(child, current?.[key], depth + 1),
        ]),
      ),
    };
  };
  return resolve(schema, value, 0);
}

export function restringirTipoDoSchema(schema: any, type: string, root: Schema): Schema {
  return { ...resolverReferencia(schema, root), type };
}

export function listarAlternativasDoSchema(schema: any, root: Schema): Schema[] {
  const s = resolverReferencia(schema, root);
  const compositions = [...(s.oneOf || []), ...(s.anyOf || [])];
  return compositions.length
    ? compositions.map((option: any) => resolverReferencia(option, root))
    : obterTiposNaoNulos(s).map((type) => ({ ...s, type }));
}

export function obterRotuloDoSchema(schema: any, index: number, root: Schema): string {
  const s = resolverReferencia(schema, root);
  if (s.title) return s.title;
  if (s.const !== undefined) return String(s.const);
  if (Array.isArray(s.enum) && s.enum.length <= 4) return s.enum.join(' / ');
  const types = obterTiposNaoNulos(s);
  return types.length ? types.join(' | ') : `Alternativa ${index + 1}`;
}
