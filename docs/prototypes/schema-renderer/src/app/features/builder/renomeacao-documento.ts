import {
  indexarDocumento,
  localizarReferencia,
  escaparPonteiro,
  type EntradaSchema,
} from '../../core/schema/documento-schema';
import type { Schema } from '../../core/schema/schema-engine';
/** Planeja todos os alvos antes da mutação; recursos e anchors permanecem estáveis. */
export function planejarRenomeacao(
  raiz: Schema,
  caminho: string,
  novo: string,
): (root: Schema) => void {
  const entradas = indexarDocumento(raiz),
    selecionada = entradas.find((item) => item.caminho === caminho);
  if (!selecionada) throw new Error('Selecione uma definição de propriedade.');
  if (entradas.some((item) => item.node.$dynamicRef))
    throw new Error('Referência dinâmica preservada. Ajuste a renomeação pela aba Para Dev.');
  const partes = caminho.split('/'),
    antigo = partes.pop()!.replace(/~1/g, '/').replace(/~0/g, '~');
  if (partes.pop() !== 'properties') throw new Error('Selecione uma propriedade.');
  const pai = entradas.find((item) => item.caminho === partes.join('/'));
  if (!pai) throw new Error('Objeto de origem não encontrado.');
  // Definições reutilizadas obtêm os escopos de seus consumidores.
  const instancias = new Set<string>(pai.instancia === undefined ? [] : [pai.instancia]);
  const relacionados = new Set<EntradaSchema>([pai]);
  for (let rodada = 0; rodada < entradas.length; rodada++) {
    let alterou = false;
    for (const item of entradas) {
      if (
        item.instancia !== undefined &&
        instancias.has(item.instancia) &&
        !relacionados.has(item)
      ) {
        relacionados.add(item);
        alterou = true;
      }
      if (item.node.$ref) {
        const destino = localizarReferencia(entradas, item, item.node.$ref);
        if (destino && (relacionados.has(destino) || relacionados.has(item))) {
          for (const candidato of [item, destino])
            if (!relacionados.has(candidato)) {
              relacionados.add(candidato);
              alterou = true;
            }
          if (item.instancia !== undefined && !instancias.has(item.instancia)) {
            instancias.add(item.instancia);
            alterou = true;
          }
        }
      }
    }
    if (!alterou) break;
  }
  for (const item of relacionados) {
    for (const key of ['properties', 'dependentRequired', 'dependentSchemas'])
      if (Object.hasOwn(item.node[key] || {}, antigo) && Object.hasOwn(item.node[key] || {}, novo))
        throw new Error('O novo nome já é utilizado em uma regra deste objeto.');
    if (
      (item.node.const && typeof item.node.const === 'object') ||
      item.node.enum?.some((v: any) => v && typeof v === 'object')
    )
      throw new Error('Objeto com valores fixos. Ajuste os nomes em Para Dev.');
  }
  const movimentos = [...relacionados]
    .filter((item) => Object.hasOwn(item.node.properties || {}, antigo))
    .map((item) => ({
      de: item.caminho + '/properties/' + escaparPonteiro(antigo),
      para: item.caminho + '/properties/' + escaparPonteiro(novo),
    }));
  const mover = (path: string) => {
    const movimento = movimentos.find((m) => path === m.de || path.startsWith(m.de + '/'));
    return movimento ? movimento.para + path.slice(movimento.de.length) : path;
  };
  const refs = entradas.flatMap((item) =>
    ['$ref', '$dynamicRef'].flatMap((key) => {
      if (typeof item.node[key] !== 'string') return [];
      const destino = localizarReferencia(entradas, item, item.node[key]);
      if (!destino) return [];
      const fragmento = new URL(item.node[key], item.base).hash;
      if (fragmento && !decodeURIComponent(fragmento.slice(1)).startsWith('/')) return []; // anchors não dependem do nome
      const uri = new URL(item.node[key], item.base);
      uri.hash = '';
      const sufixo = mover(destino.caminho).slice(mover(destino.recurso).length);
      const ref =
        item.node[key].split('#')[0] +
        (sufixo ? '#' + encodeURI(sufixo).replace(/#/g, '%23').replace(/\?/g, '%3F') : '');
      return mover(destino.caminho) !== destino.caminho
        ? [{ path: item.caminho, key, valor: ref }]
        : [];
    }),
  );
  return (root) => {
    const copia = indexarDocumento(root);
    const porCaminho = new Map(copia.map((item) => [item.caminho, item.node]));
    for (const ref of refs) porCaminho.get(ref.path)![ref.key] = ref.valor;
    for (const item of relacionados) {
      const no = porCaminho.get(item.caminho)!;
      for (const key of ['properties', 'dependentRequired', 'dependentSchemas'])
        if (Object.hasOwn(no[key] || {}, antigo))
          no[key] = Object.fromEntries(
            Object.entries(no[key]).map(([k, v]) => [k === antigo ? novo : k, v]),
          );
      if (no.required) no.required = no.required.map((k: string) => (k === antigo ? novo : k));
      for (const key of Object.keys(no.dependentRequired || {}))
        no.dependentRequired[key] = no.dependentRequired[key].map((k: string) =>
          k === antigo ? novo : k,
        );
    }
  };
}
