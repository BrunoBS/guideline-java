import { localizarReferencia, type EntradaSchema } from './documento-schema';

const BASE = 'https://json-schema.org/draft/2020-12/';
const CONHECIDOS = new Set(
  [
    'core',
    'applicator',
    'validation',
    'unevaluated',
    'meta-data',
    'format-annotation',
    'format-assertion',
    'content',
  ].map((nome) => BASE + 'vocab/' + nome),
);
export const ASSERTIVAS_VALIDACAO = new Set([
  'type',
  'enum',
  'const',
  'multipleOf',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'maxItems',
  'minItems',
  'uniqueItems',
  'maxProperties',
  'minProperties',
  'required',
  'dependentRequired',
]);

/** O dialeto é lexical por recurso; o escopo de dynamicRef não muda o vocabulário. */
export function obterVocabularios(
  entradas: EntradaSchema[],
  entrada: EntradaSchema,
  recuperacao: ReadonlyMap<string, string>,
) {
  const declaracao = entradas
    .filter(
      (item) =>
        item.caminho === item.recurso &&
        typeof item.node.$schema === 'string' &&
        (entrada.caminho === item.caminho || entrada.caminho.startsWith(item.caminho + '/')),
    )
    .sort((a, b) => b.caminho.length - a.caminho.length)[0];
  const uri = declaracao?.node.$schema?.replace(/#$/, '') || BASE + 'schema';
  if (uri === BASE + 'schema')
    return {
      validacao: true,
      aplicadores: true,
      naoAvaliados: true,
      formatos: true,
      formatosObrigatorios: false,
    };
  const meta = localizarReferencia(entradas, declaracao || entrada, uri, recuperacao);
  if (!meta) throw new Error('Metaschema não registrado: ' + uri);
  const vocabularios = meta.node.$vocabulary;
  if (!vocabularios) throw new Error('Metaschema customizado precisa declarar $vocabulary: ' + uri);
  for (const [nome, obrigatorio] of Object.entries(vocabularios))
    if (obrigatorio === true && !CONHECIDOS.has(nome))
      throw new Error('Vocabulário obrigatório não suportado: ' + nome);
  const possui = (nome: string) => Object.hasOwn(vocabularios, BASE + 'vocab/' + nome);
  return {
    validacao: possui('validation'),
    aplicadores: possui('applicator'),
    naoAvaliados: possui('unevaluated'),
    formatos: possui('format-annotation') || possui('format-assertion'),
    formatosObrigatorios: possui('format-assertion'),
  };
}
