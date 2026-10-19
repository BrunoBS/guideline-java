import type { Schema } from './tipos-schema';
export const BASE_DOCUMENTO = 'https://schema.local/documento';
export interface EntradaSchema {
  node: Schema;
  caminho: string;
  base: string;
  recurso: string;
  instancia?: string;
}
export const escaparPonteiro = (key: string) => key.replace(/~/g, '~0').replace(/\//g, '~1');
/** Somente posições definidas pelo vocabulário 2020-12; valores/anotações são opacos. */
export function indexarDocumento(raiz: Schema): EntradaSchema[] {
  const entradas: EntradaSchema[] = [];
  function visitar(node: any, caminho: string, base: string, recurso: string, instancia?: string) {
    if (typeof node === 'boolean') {
      entradas.push({ node: node as any, caminho, base, recurso, instancia });
      return;
    }
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (typeof node.$id === 'string') {
      base = new URL(node.$id, base).href;
      recurso = caminho;
    }
    entradas.push({ node, caminho, base, recurso, instancia });
    const filho = (valor: any, sufixo: string, local?: string) =>
      visitar(valor, caminho + sufixo, base, recurso, local);
    for (const chave of ['properties', 'patternProperties', '$defs', 'dependentSchemas'])
      for (const [key, valor] of Object.entries(node[chave] || {}))
        filho(
          valor,
          '/' + chave + '/' + escaparPonteiro(key),
          chave === 'properties' && instancia !== undefined
            ? instancia + '/' + escaparPonteiro(key)
            : chave === 'dependentSchemas'
              ? instancia
              : '@' + caminho + '/' + chave + '/' + escaparPonteiro(key),
        );
    for (const chave of ['allOf', 'anyOf', 'oneOf', 'prefixItems'])
      (node[chave] || []).forEach((valor: any, i: number) =>
        filho(
          valor,
          '/' + chave + '/' + i,
          chave === 'prefixItems'
            ? instancia === undefined
              ? undefined
              : instancia + '/*'
            : instancia,
        ),
      );
    for (const chave of [
      'items',
      'additionalProperties',
      'unevaluatedProperties',
      'unevaluatedItems',
      'contains',
      'propertyNames',
      'if',
      'then',
      'else',
      'not',
      'contentSchema',
    ])
      filho(
        node[chave],
        '/' + chave,
        ['if', 'then', 'else', 'not'].includes(chave)
          ? instancia
          : ['items', 'contains', 'unevaluatedItems'].includes(chave) && instancia !== undefined
            ? instancia + '/*'
            : undefined,
      );
  }
  visitar(raiz, '', BASE_DOCUMENTO, '', '');
  return entradas;
}
export function localizarReferencia(
  entradas: EntradaSchema[],
  entrada: EntradaSchema,
  ref: string,
  recuperacao: ReadonlyMap<string, string> = new Map(),
): EntradaSchema | undefined {
  const uri = new URL(ref, entrada.base),
    fragmento = decodeURIComponent(uri.hash.slice(1));
  uri.hash = '';
  const caminhoRecuperado = recuperacao.get(uri.href);
  const recurso =
    entradas.find(
      (item) => item.caminho === item.recurso && new URL(item.base).href.split('#')[0] === uri.href,
    ) || entradas.find((item) => item.caminho === caminhoRecuperado);
  if (!recurso) return undefined;
  if (!fragmento) return recurso;
  if (fragmento.startsWith('/'))
    return entradas.find((item) => item.caminho === recurso.caminho + fragmento);
  return entradas.find(
    (item) =>
      item.recurso === recurso.caminho &&
      (item.node.$anchor === fragmento || item.node.$dynamicAnchor === fragmento),
  );
}
