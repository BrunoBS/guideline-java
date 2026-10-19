import { indexarDocumento, localizarReferencia, type EntradaSchema } from './documento-schema';
import { Schema, normalizarSchemaBooleano } from './tipos-schema';
import { combinarSchemas } from './combinacao-schemas';
import { criarApresentacaoJson, LIMITE_PROFUNDIDADE_FORMULARIO } from './limites-apresentacao';

/** Referências são resolvidas exclusivamente no documento; nenhuma URL é carregada. */
export function resolverReferencia(schema: any, root: Schema, depth = 0): Schema {
  const entradas = indexarDocumento(root);
  const ativos = new Set<unknown>();
  function resolver(node: any, contexto: EntradaSchema | undefined, nivel: number): Schema {
    const s = normalizarSchemaBooleano(node);
    if (typeof node === 'boolean') return s;
    if (typeof s.$dynamicRef === 'string')
      return criarApresentacaoJson(
        s,
        'Referência dinâmica: edite o valor em JSON. A validação usa o contrato original.',
      );
    if (typeof s.$ref !== 'string') return s;
    if (ativos.has(node) || nivel > LIMITE_PROFUNDIDADE_FORMULARIO)
      return criarApresentacaoJson(
        s,
        'Referência cíclica ou limite de resolução atingido. Edite o valor em JSON.',
      );
    const entrada = entradas.find((item) => item.node === node) || contexto || entradas[0];
    const alvo = entrada ? localizarReferencia(entradas, entrada, s.$ref) : undefined;
    if (!alvo) {
      return {
        ...criarApresentacaoJson(
          s,
          'Referência não disponível neste documento. Nenhum recurso externo foi carregado; a validação exige o recurso incorporado em $defs.',
        ),
        __externalRef: s.$ref,
      };
    }
    ativos.add(node);
    const resolvido = resolver(alvo.node, alvo, nivel + 1);
    ativos.delete(node);
    if (resolvido.__jsonFallback) return { ...resolvido, title: s.title || resolvido.title };
    const irmaos = Object.fromEntries(Object.entries(s).filter(([chave]) => chave !== '$ref'));
    return combinarSchemas(resolvido, irmaos);
  }
  return resolver(schema, undefined, depth);
}
