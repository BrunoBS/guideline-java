import { resolverReferencia, type Schema } from '../../../core/schema/schema-engine';
import { lerComparacaoDaCondicao } from './comparacoes-condicao';
export interface CampoDaExpressao {
  caminho: string;
  segmentos: string[];
  schema: Schema;
}
const escapar = (key: string) => key.replace(/~/g, '~0').replace(/\//g, '~1');
export function listarCamposDaExpressao(objeto: Schema, raiz: Schema): CampoDaExpressao[] {
  const resultado: CampoDaExpressao[] = [];
  function visitar(node: Schema, segmentos: string[], depth: number) {
    if (depth > 10) return;
    const resolvido = resolverReferencia(node, raiz);
    for (const [key, child] of Object.entries(resolvido.properties || {})) {
      const partes = [...segmentos, key];
      resultado.push({
        caminho: '/' + partes.map(escapar).join('/'),
        segmentos: partes,
        schema: resolverReferencia(child, raiz),
      });
      visitar(child as Schema, partes, depth + 1);
    }
  }
  visitar(objeto, [], 0);
  return resultado;
}
export function criarCondicaoNoCaminho(
  segmentos: string[],
  comparacao: Schema | undefined,
  ausente = false,
): Schema {
  const [campo, ...resto] = segmentos;
  if (!campo) throw new Error('Selecione um campo.');
  // Em objetos internos, required em cada nível impede que pais ausentes satisfaçam a comparação.
  const presenca: Schema = {
    type: 'object',
    ...(resto.length
      ? { properties: { [campo]: criarCondicaoNoCaminho(resto, comparacao) }, required: [campo] }
      : comparacao
        ? { properties: { [campo]: comparacao }, required: [campo] }
        : { required: [campo] }),
  };
  return ausente ? { not: criarCondicaoNoCaminho(segmentos, undefined) } : presenca;
}
export function expressaoEhGuiada(schema: any): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false;
  const chaves = Object.keys(schema).filter(
    (key) => !['title', 'description', '$comment'].includes(key),
  );
  if (chaves.length === 1 && ['allOf', 'anyOf'].includes(chaves[0]))
    return (
      Array.isArray(schema[chaves[0]]) &&
      schema[chaves[0]].length > 0 &&
      schema[chaves[0]].every(expressaoEhGuiada)
    );
  if (chaves.length === 1 && chaves[0] === 'not') return expressaoEhGuiada(schema.not);
  if (schema.type !== undefined && schema.type !== 'object') return false;
  if (chaves.some((key) => !['required', 'properties', 'type'].includes(key))) return false;
  if (!schema.properties) return Array.isArray(schema.required) && schema.required.length === 1;
  const campos = Object.keys(schema.properties);
  return (
    campos.length === 1 &&
    (!schema.required ||
      (schema.required.length <= 1 && schema.required.every((key: string) => key === campos[0]))) &&
    (!!lerComparacaoDaCondicao(schema.properties[campos[0]]) ||
      expressaoEhGuiada(schema.properties[campos[0]]))
  );
}
export function lerFolhaDaExpressao(
  schema: Schema,
): { segmentos: string[]; comparacao?: Schema } | undefined {
  if (schema?.required?.length === 1 && !schema.properties)
    return { segmentos: [schema.required[0]] };
  if (!schema?.properties || Object.keys(schema.properties).length !== 1) return undefined;
  const campo = Object.keys(schema.properties)[0],
    filho = schema.properties[campo];
  if (lerComparacaoDaCondicao(filho)) return { segmentos: [campo], comparacao: filho };
  const interna = lerFolhaDaExpressao(filho);
  return interna
    ? { segmentos: [campo, ...interna.segmentos], comparacao: interna.comparacao }
    : undefined;
}

/** Autoria de negócio: uma comparação ou uma lista plana combinada por E/OU. */
export function expressaoEhSimplesParaNegocio(schema: Schema): boolean {
  if (!expressaoEhGuiada(schema)) return false;
  const folhaSimples = (node: Schema): boolean => {
    if (lerFolhaDaExpressao(node)) return true;
    // Está ausente é uma comparação simples, embora use not no JSON Schema.
    return (
      !!node.not && !!lerFolhaDaExpressao(node.not) && !lerFolhaDaExpressao(node.not)!.comparacao
    );
  };
  if (folhaSimples(schema)) return true;
  const grupo = schema.allOf || schema.anyOf;
  return Array.isArray(grupo) && grupo.length > 0 && grupo.every(folhaSimples);
}
