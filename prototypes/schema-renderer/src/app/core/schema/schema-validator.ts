import { criarValidadorAvaliado } from './avaliacao-documento';
import type { PerfilValidacao } from './perfil-validacao';
import { ehMultiploDecimal } from './multiplo-decimal';
import { BASE_DOCUMENTO, indexarDocumento, localizarReferencia } from './documento-schema';
import Ajv2020 from 'ajv/dist/2020';
import type { AnySchema, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

/** Each compiled document owns its registry: reused $id values cannot leak between contracts. */
function criarAjv(perfil: PerfilValidacao = {}) {
  const ajv = new Ajv2020({
    allErrors: true,
    validateFormats: perfil.formatos !== 'anotacao',
    strict: false,
    ownProperties: true,
    inlineRefs: false,
    addUsedSchema: false,
  });
  ajv.removeKeyword('multipleOf');
  ajv.addKeyword({
    keyword: 'multipleOf',
    type: 'number',
    schemaType: 'number',
    validate: ehMultiploDecimal,
    errors: false,
    metaSchema: { type: 'number', exclusiveMinimum: 0 },
  });
  addFormats(ajv);
  ajv.addFormat('password', { type: 'string', validate: () => true });
  return ajv;
}

const MAX_CACHED_SCHEMAS = 100;
const validators = new Map<string, { schema: AnySchema; validate: ValidateFunction }>();

/** Bounded LRU cache shared by contract validation and conditional rendering. */
export function compilarValidador(
  schema: AnySchema,
  perfil: PerfilValidacao = {},
): ValidateFunction {
  const key = JSON.stringify([schema, perfil.formatos || 'validacao', perfil.recursos || {}]);
  const cached = validators.get(key);
  if (cached) {
    validators.delete(key);
    validators.set(key, cached);
    return cached.validate;
  }
  let snapshot = JSON.parse(JSON.stringify(schema)) as AnySchema;
  const recuperacao = new Map<string, string>();
  if (Object.keys(perfil.recursos || {}).length) {
    const documento =
      typeof snapshot === 'boolean'
        ? snapshot
        : { ...snapshot, $id: snapshot.$id || BASE_DOCUMENTO };
    const recursos = Object.fromEntries(
      Object.entries(perfil.recursos || {}).map(([uri, recurso]) => {
        const absoluta = new URL(uri).href;
        if (recuperacao.has(absoluta)) throw new Error('URI de recuperação duplicada: ' + absoluta);
        recuperacao.set(absoluta, '/$defs/' + uri.replace(/~/g, '~0').replace(/\//g, '~1'));
        if (typeof recurso === 'boolean') return [uri, { $id: absoluta, allOf: [recurso] }];
        return [
          uri,
          {
            ...structuredClone(recurso),
            $id: recurso.$id ? new URL(recurso.$id, absoluta).href : absoluta,
          },
        ];
      }),
    );
    snapshot = { $defs: recursos, allOf: [documento] };
  }
  // Compile-only normalization: the user's document is never rewritten.
  for (const { node } of indexarDocumento(snapshot as any)) {
    if (typeof node !== 'object' || !node) continue;
    if (Object.hasOwn(node.properties || {}, '__proto__')) {
      const padrao = '^__proto__$';
      const regra = node.properties.__proto__;
      node.patternProperties = {
        ...node.patternProperties,
        [padrao]:
          node.patternProperties?.[padrao] === undefined
            ? regra
            : { allOf: [node.patternProperties[padrao], regra] },
      };
      delete node.properties.__proto__;
    }
  }
  const ajv = criarAjv(perfil);
  const usados = new Set(
    indexarDocumento(snapshot as any)
      .filter((item) => item.node.$id)
      .map((item) => new URL(item.base).href),
  );
  let chaveDocumento = 'https://schema.local/validacao';
  while (usados.has(chaveDocumento)) chaveDocumento += '-1';
  if (typeof snapshot === 'object') snapshot.$id ||= chaveDocumento;
  if (!ajv.validateSchema(snapshot)) throw new Error(ajv.errorsText(ajv.errors));
  const composto =
    Object.keys(perfil.recursos || {}).length > 0 ||
    indexarDocumento(snapshot as any).some(
      ({ node }) =>
        typeof node === 'object' &&
        (['$ref', '$dynamicRef', 'unevaluatedItems', 'unevaluatedProperties'].some((chave) =>
          Object.hasOwn(node, chave),
        ) ||
          (Array.isArray(node.enum) && node.enum.length === 0)),
    );
  let validate: ValidateFunction;
  if (composto) {
    const compiladas = new Map<string, ValidateFunction>();
    let ajvDeFormatos: Ajv2020 | undefined;
    validate = criarValidadorAvaliado(
      snapshot,
      (assercoes, exigirFormatos = false) => {
        const chave = JSON.stringify([assercoes, exigirFormatos]);
        const motor =
          exigirFormatos && perfil.formatos === 'anotacao'
            ? (ajvDeFormatos ||= criarAjv({ formatos: 'validacao' }))
            : ajv;
        if (!compiladas.has(chave))
          compiladas.set(
            chave,
            motor.compile(
              typeof assercoes === 'object' &&
                Array.isArray(assercoes.enum) &&
                !assercoes.enum.length
                ? false
                : assercoes,
            ),
          );
        return compiladas.get(chave)!;
      },
      recuperacao,
    );
  } else {
    ajv.addSchema(snapshot, chaveDocumento);
    validate = ajv.getSchema(chaveDocumento)!;
  }
  validators.set(key, { schema: snapshot, validate });
  if (validators.size > MAX_CACHED_SCHEMAS) {
    const oldest = validators.entries().next().value!;
    validators.delete(oldest[0]);
  }
  return validate;
}

export function lerDocumentoSchema(
  source: string,
  perfil: PerfilValidacao = {},
): Record<string, any> {
  const schema: unknown = JSON.parse(source);
  if (typeof schema === 'boolean')
    throw new Error(
      'Schema booleano é válido em JSON Schema, mas a importação do Studio exige um objeto. Use {} para true ou {"not":{}} para false.',
    );
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error('Schema deve ser um objeto JSON.');
  }
  compilarValidador(schema, perfil);
  return schema as Record<string, any>;
}

/** Avalia um fragmento com as mesmas bases e referências do documento original. */
export function compilarFragmento(
  schema: any,
  root: Record<string, any>,
  contextoOriginal: any = schema,
) {
  if (typeof schema === 'boolean' || schema === root) return compilarValidador(schema);
  const documento = structuredClone(root);
  documento.$id ||= BASE_DOCUMENTO;
  const originais = indexarDocumento(root);
  const fonte = originais.find((item) => item.node === contextoOriginal) || originais[0];
  if (schema === contextoOriginal && fonte?.node === schema) {
    const ponteiro = fonte.caminho.slice(fonte.recurso.length);
    const uri = new URL(fonte.base);
    uri.hash = encodeURIComponent(ponteiro);
    return compilarValidador({ $defs: { documento }, $ref: uri.href });
  }
  const fragmento = structuredClone(schema);
  const copias = indexarDocumento(fragmento);
  const originaisDoFragmento = indexarDocumento(schema);
  for (const copia of copias) {
    if (typeof copia.node === 'boolean') continue;
    const original = originaisDoFragmento.find((item) => item.caminho === copia.caminho);
    if (!original) continue;
    const contexto = originais.find((item) => item.node === original.node) || fonte;
    for (const chave of ['$ref', '$dynamicRef']) {
      if (typeof copia.node[chave] !== 'string' || !contexto) continue;
      const alvo = localizarReferencia(originais, contexto, copia.node[chave]);
      if (alvo) copia.node[chave] = new URL(copia.node[chave], contexto.base).href;
    }
    delete copia.node.$id;
    delete copia.node.$anchor;
    delete copia.node.$dynamicAnchor;
  }
  return compilarValidador({ $defs: { documento }, allOf: [fragmento] });
}
