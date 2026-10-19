import { obterVocabularios, ASSERTIVAS_VALIDACAO } from './vocabularios-schema';
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv';
import {
  indexarDocumento,
  localizarReferencia,
  escaparPonteiro,
  type EntradaSchema,
} from './documento-schema';
import type { Schema } from './tipos-schema';

const APLICADORES = new Set([
  '$id',
  '$schema',
  '$anchor',
  '$dynamicAnchor',
  '$ref',
  '$dynamicRef',
  '$defs',
  'properties',
  'patternProperties',
  'additionalProperties',
  'propertyNames',
  'dependentSchemas',
  'items',
  'prefixItems',
  'contains',
  'minContains',
  'maxContains',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',
  'unevaluatedItems',
  'unevaluatedProperties',
  'contentSchema',
]);
interface Resultado {
  erros: ErrorObject[];
  propriedades: Set<string>;
  itens: Set<number>;
}
const novoResultado = (): Resultado => ({ erros: [], propriedades: new Set(), itens: new Set() });
const unir = (destino: Resultado, origem: Resultado) => {
  for (const chave of origem.propriedades) destino.propriedades.add(chave);
  for (const indice of origem.itens) destino.itens.add(indice);
};

/** Aplicadores 2020-12 com escopo dinâmico por caminho e anotações por posição de instância. */
export function criarValidadorAvaliado(
  raiz: AnySchema,
  compilarAssercoes: (schema: AnySchema, exigirFormatos?: boolean) => ValidateFunction,
  recuperacao: ReadonlyMap<string, string> = new Map(),
): ValidateFunction {
  const entradas = indexarDocumento(raiz as Schema);
  const identificadores = new Map<string, EntradaSchema>();
  const anchors = new Map<string, EntradaSchema>();
  for (const entrada of entradas) {
    if (entrada.caminho === entrada.recurso) {
      const uri = new URL(entrada.base).href;
      if (identificadores.has(uri)) throw new Error('URI de recurso duplicada: ' + uri);
      identificadores.set(uri, entrada);
    }
    for (const nome of [entrada.node.$anchor, entrada.node.$dynamicAnchor]) {
      if (typeof nome !== 'string') continue;
      const chave = entrada.recurso + '#' + nome;
      if (anchors.has(chave) && anchors.get(chave) !== entrada)
        throw new Error('Anchor duplicado no recurso: ' + nome);
      anchors.set(chave, entrada);
    }
  }
  const porCaminho = new Map(entradas.map((entrada) => [entrada.caminho, entrada]));
  const vocabularios = new Map(
    entradas.map((entrada) => [entrada, obterVocabularios(entradas, entrada, recuperacao)]),
  );
  const assercoes = new Map<EntradaSchema, ValidateFunction>();
  const referencias = new Map<string, EntradaSchema | ValidateFunction>();
  const padroes = new Map<EntradaSchema, [RegExp, string][]>();
  for (const entrada of entradas) {
    const no = entrada.node;
    if (typeof no !== 'object') continue;
    assercoes.set(
      entrada,
      compilarAssercoes(
        Object.fromEntries(
          Object.entries(no).filter(
            ([chave]) =>
              !APLICADORES.has(chave) &&
              (vocabularios.get(entrada)!.validacao || !ASSERTIVAS_VALIDACAO.has(chave)) &&
              (vocabularios.get(entrada)!.formatos || chave !== 'format'),
          ),
        ),
        vocabularios.get(entrada)!.formatosObrigatorios,
      ),
    );
    padroes.set(
      entrada,
      Object.keys(no.patternProperties || {}).map((padrao) => [new RegExp(padrao, 'u'), padrao]),
    );
  }
  const preparados = new Set<EntradaSchema>();
  const preparando = new Set<EntradaSchema>();
  function preparar(entrada: EntradaSchema) {
    if (preparados.has(entrada) || preparando.has(entrada) || typeof entrada.node === 'boolean')
      return;
    preparando.add(entrada);
    try {
      const no = entrada.node;
      const vocabulario = vocabularios.get(entrada)!;
      for (const chave of ['$ref', '$dynamicRef']) {
        if (typeof no[chave] !== 'string') continue;
        const alvo = localizarReferencia(entradas, entrada, no[chave], recuperacao);
        const uri = new URL(no[chave], entrada.base).href;
        referencias.set(entrada.caminho + '/' + chave, alvo || compilarAssercoes({ $ref: uri }));
        if (alvo) preparar(alvo);
      }
      const filhos = (sufixo: string) => {
        const filho = porCaminho.get(entrada.caminho + sufixo);
        if (filho) preparar(filho);
      };
      if (vocabulario.aplicadores) {
        for (const mapa of ['properties', 'patternProperties', 'dependentSchemas'])
          for (const chave of Object.keys(no[mapa] || {}))
            filhos('/' + mapa + '/' + escaparPonteiro(chave));
        for (const lista of ['allOf', 'anyOf', 'oneOf', 'prefixItems'])
          (no[lista] || []).forEach((_item: unknown, i: number) => filhos('/' + lista + '/' + i));
        for (const chave of [
          'additionalProperties',
          'propertyNames',
          'items',
          'contains',
          'not',
          'if',
          'then',
          'else',
        ])
          filhos('/' + chave);
      }
      if (vocabulario.naoAvaliados) {
        filhos('/unevaluatedItems');
        filhos('/unevaluatedProperties');
      }
      preparados.add(entrada);
    } finally {
      preparando.delete(entrada);
    }
  }
  preparar(entradas[0]);
  const validar = ((dado: unknown) => {
    const ativos = new Set<string>();
    let visitas = 0;
    function avaliar(
      entrada: EntradaSchema,
      valor: any,
      caminho: string,
      escopos: string[],
      profundidade: number,
    ): Resultado {
      preparar(entrada);
      const resultado = novoResultado(),
        no = entrada.node;
      const erro = (keyword: string, params: Record<string, any>, message: string) =>
        resultado.erros.push({
          instancePath: caminho,
          schemaPath: '#' + entrada.caminho + '/' + keyword,
          keyword,
          params,
          message,
        });
      const pilha = escopos.includes(entrada.recurso) ? escopos : [...escopos, entrada.recurso];
      const chaveAtiva = JSON.stringify([entrada.caminho, caminho, pilha]);
      if (++visitas > 100_000 || profundidade > 256 || ativos.has(chaveAtiva)) {
        erro('$ref', {}, 'Limite de avaliação ou referência cíclica sem avanço na instância.');
        return resultado;
      }
      if (typeof no === 'boolean') {
        if (!no) erro('false schema', {}, 'boolean schema is false');
        return resultado;
      }
      ativos.add(chaveAtiva);
      const concluir = () => {
        ativos.delete(chaveAtiva);
        return resultado;
      };
      const avaliarFilho = (sufixo: string, item = valor, path = caminho) =>
        avaliar(porCaminho.get(entrada.caminho + sufixo)!, item, path, pilha, profundidade + 1);
      const aplicar = (outro: Resultado) => {
        resultado.erros.push(...outro.erros);
        if (!outro.erros.length) unir(resultado, outro);
      };
      const validador = assercoes.get(entrada)!;
      if (!validador(valor))
        resultado.erros.push(
          ...(validador.errors || []).map((e) => ({
            ...e,
            instancePath: caminho + e.instancePath,
            schemaPath: '#' + entrada.caminho + e.schemaPath.slice(1),
          })),
        );
      for (const keyword of ['$ref', '$dynamicRef']) {
        const referencia = referencias.get(entrada.caminho + '/' + keyword);
        if (!referencia) continue;
        if (typeof referencia === 'function') {
          if (!referencia(valor))
            resultado.erros.push(
              ...(referencia.errors || []).map((e) => ({
                ...e,
                instancePath: caminho + e.instancePath,
              })),
            );
          continue;
        }
        let alvo = referencia;
        const fragmento = decodeURIComponent(new URL(no[keyword], entrada.base).hash.slice(1));
        if (
          keyword === '$dynamicRef' &&
          fragmento &&
          !fragmento.startsWith('/') &&
          alvo.node.$dynamicAnchor === fragmento
        ) {
          for (const recurso of pilha) {
            const dinamico = entradas.find(
              (item) => item.recurso === recurso && item.node.$dynamicAnchor === fragmento,
            );
            if (dinamico) {
              alvo = dinamico;
              break;
            }
          }
        }
        aplicar(avaliar(alvo, valor, caminho, pilha, profundidade + 1));
      }
      const vocabulario = vocabularios.get(entrada)!;
      const objeto = valor !== null && typeof valor === 'object' && !Array.isArray(valor);
      if (objeto && vocabulario.aplicadores) {
        for (const chave of Object.keys(valor)) {
          const path = caminho + '/' + escaparPonteiro(chave);
          let conhecida = false;
          if (Object.hasOwn(no.properties || {}, chave)) {
            const filho = avaliarFilho('/properties/' + escaparPonteiro(chave), valor[chave], path);
            resultado.erros.push(...filho.erros);
            conhecida = true;
          }
          for (const [regex, padrao] of padroes.get(entrada) || []) {
            if (!regex.test(chave)) continue;
            const filho = avaliarFilho(
              '/patternProperties/' + escaparPonteiro(padrao),
              valor[chave],
              path,
            );
            resultado.erros.push(...filho.erros);
            conhecida = true;
          }
          if (conhecida) resultado.propriedades.add(chave);
          else if (no.additionalProperties !== undefined) {
            const filho = avaliarFilho('/additionalProperties', valor[chave], path);
            resultado.erros.push(...filho.erros);
            resultado.propriedades.add(chave);
          }
          if (no.propertyNames !== undefined) {
            const filho = avaliarFilho('/propertyNames', chave);
            resultado.erros.push(
              ...filho.erros.map((e) => ({ ...e, params: { ...e.params, propertyName: chave } })),
            );
          }
        }
        for (const gatilho of Object.keys(no.dependentSchemas || {}))
          if (Object.hasOwn(valor, gatilho))
            aplicar(avaliarFilho('/dependentSchemas/' + escaparPonteiro(gatilho)));
      }
      if (Array.isArray(valor) && vocabulario.aplicadores) {
        const prefixos = no.prefixItems?.length || 0;
        for (let i = 0; i < valor.length; i++) {
          const path = caminho + '/' + i;
          if (i < prefixos || no.items !== undefined) {
            const filho = avaliarFilho(
              i < prefixos ? '/prefixItems/' + i : '/items',
              valor[i],
              path,
            );
            resultado.erros.push(...filho.erros);
            resultado.itens.add(i);
          }
        }
        if (no.contains !== undefined) {
          const correspondentes = valor.map(
            (item, i) => avaliarFilho('/contains', item, caminho + '/' + i).erros.length === 0,
          );
          const total = correspondentes.filter(Boolean).length;
          if (
            total < (vocabulario.validacao ? (no.minContains ?? 1) : 1) ||
            total > (vocabulario.validacao ? (no.maxContains ?? Infinity) : Infinity)
          )
            erro(
              'contains',
              { minContains: no.minContains ?? 1, maxContains: no.maxContains },
              'must contain the required number of matching items',
            );
          else
            correspondentes.forEach((atende, i) => {
              if (atende) resultado.itens.add(i);
            });
        }
      }
      if (vocabulario.aplicadores) {
        for (let i = 0; i < (no.allOf?.length || 0); i++) aplicar(avaliarFilho('/allOf/' + i));
        for (const keyword of ['anyOf', 'oneOf']) {
          if (!Array.isArray(no[keyword])) continue;
          const alternativas = no[keyword].map((_item: unknown, i: number) =>
            avaliarFilho('/' + keyword + '/' + i),
          );
          const indices = alternativas.flatMap((item: Resultado, i: number) =>
            item.erros.length ? [] : [i],
          );
          if (!indices.length || (keyword === 'oneOf' && indices.length !== 1)) {
            if (!indices.length)
              resultado.erros.push(...alternativas.flatMap((item: Resultado) => item.erros));
            erro(
              keyword,
              { passingSchemas: indices.length ? indices : null },
              keyword === 'oneOf'
                ? 'must match exactly one schema in oneOf'
                : 'must match a schema in anyOf',
            );
          } else for (const i of indices) unir(resultado, alternativas[i]);
        }
        if (no.not !== undefined && !avaliarFilho('/not').erros.length)
          erro('not', {}, 'must NOT be valid');
        if (no.if !== undefined) {
          const condicao = avaliarFilho('/if');
          const ramo = condicao.erros.length ? 'else' : 'then';
          if (!condicao.erros.length) unir(resultado, condicao);
          if (no[ramo] !== undefined) aplicar(avaliarFilho('/' + ramo));
        }
      }
      if (objeto && vocabulario.naoAvaliados && no.unevaluatedProperties !== undefined) {
        for (const chave of Object.keys(valor))
          if (!resultado.propriedades.has(chave)) {
            const filho = avaliarFilho(
              '/unevaluatedProperties',
              valor[chave],
              caminho + '/' + escaparPonteiro(chave),
            );
            resultado.erros.push(...filho.erros);
            resultado.propriedades.add(chave);
          }
      }
      if (Array.isArray(valor) && vocabulario.naoAvaliados && no.unevaluatedItems !== undefined) {
        for (let i = 0; i < valor.length; i++)
          if (!resultado.itens.has(i)) {
            const filho = avaliarFilho('/unevaluatedItems', valor[i], caminho + '/' + i);
            resultado.erros.push(...filho.erros);
            resultado.itens.add(i);
          }
      }
      return concluir();
    }
    const resultado = avaliar(entradas[0], dado, '', [], 0);
    validar.errors = resultado.erros.length ? resultado.erros : null;
    return !resultado.erros.length;
  }) as ValidateFunction;
  validar.errors = null;
  validar.schema = raiz;
  return validar;
}
