import type { Schema } from '../../core/schema/schema-engine';

/** Visita apenas posições de schema; nunca interpreta const/default/extensões como regras. */
function visitarSchemas(schema: any, visitar: (schema: Schema) => void) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
  visitar(schema);
  for (const chave of ['properties', 'patternProperties', '$defs', 'dependentSchemas'])
    for (const filho of Object.values(schema[chave] || {})) visitarSchemas(filho, visitar);
  for (const chave of ['allOf', 'anyOf', 'oneOf', 'prefixItems'])
    for (const filho of schema[chave] || []) visitarSchemas(filho, visitar);
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
    visitarSchemas(schema[chave], visitar);
}
/** Composições e dependências aplicam-se ao mesmo objeto; propriedades/itens abrem outro escopo. */
function visitarMesmoObjeto(
  schema: Schema,
  visitar: (schema: Schema, raiz: boolean) => void,
  raiz = true,
) {
  if (!schema || typeof schema !== 'object') return;
  visitar(schema, raiz);
  for (const chave of ['allOf', 'anyOf', 'oneOf'])
    for (const filho of schema[chave] || []) visitarMesmoObjeto(filho, visitar, false);
  for (const chave of ['if', 'then', 'else', 'not'])
    visitarMesmoObjeto(schema[chave], visitar, false);
  for (const filho of Object.values(schema.dependentSchemas || {}))
    visitarMesmoObjeto(filho as Schema, visitar, false);
}
function referenciaApontaPara(ref: string, caminho: string) {
  try {
    ref = decodeURIComponent(ref);
  } catch {
    return false;
  }
  return ref === '#' + caminho || ref.startsWith('#' + caminho + '/');
}
export function verificarExclusaoReferenciada(
  raiz: Schema,
  objeto: Schema,
  nome: string,
  caminho: string,
): string {
  let usada = false;
  visitarMesmoObjeto(objeto, (no, principal) => {
    if (!principal && (Object.hasOwn(no.properties || {}, nome) || no.required?.includes(nome)))
      usada = true;
    if (
      Object.hasOwn(no.dependentRequired || {}, nome) ||
      Object.values(no.dependentRequired || {}).some((lista: any) => lista.includes(nome)) ||
      Object.hasOwn(no.dependentSchemas || {}, nome)
    )
      usada = true;
  });
  if (usada) return 'Campo utilizado em regras. Ajuste as regras antes de excluir o campo.';
  return verificarReferenciasAoNo(raiz, caminho);
}
export function verificarReferenciasAoNo(raiz: Schema, caminho: string): string {
  let encontrada = false;
  let avancada = false;
  visitarSchemas(raiz, (no) => {
    if (
      (no !== raiz && no.$id) ||
      no.$dynamicRef ||
      (typeof no.$ref === 'string' && !no.$ref.startsWith('#/'))
    )
      avancada = true;
    for (const chave of ['$ref', '$dynamicRef'])
      if (typeof no[chave] === 'string' && referenciaApontaPara(no[chave], caminho))
        encontrada = true;
  });
  if (avancada) return 'Schema com referências avançadas. Ajuste a exclusão pela aba Para Dev.';
  return encontrada
    ? 'Nó utilizado por uma referência. Ajuste as referências antes de excluir.'
    : '';
}
export function verificarRenomeacaoReferenciada(
  raiz: Schema,
  objeto: Schema,
  antigo: string,
  novo: string,
): string {
  let erro = '';
  visitarMesmoObjeto(objeto, (no) => {
    if (
      (no.const && typeof no.const === 'object') ||
      no.enum?.some((valor: any) => valor && typeof valor === 'object')
    )
      erro = 'Objeto com valores fixos. Ajuste os nomes pela aba Para Dev.';
    for (const chave of ['properties', 'dependentRequired', 'dependentSchemas'])
      if (Object.hasOwn(no[chave] || {}, antigo) && Object.hasOwn(no[chave] || {}, novo))
        erro = 'O novo nome já é utilizado em uma regra deste objeto.';
  });
  // Sem resolver recursos/anchors não é seguro reescrever referências com outra base.
  visitarSchemas(raiz, (no) => {
    if (no !== raiz && no.$id)
      erro = 'Schema com recursos internos ($id). Ajuste os nomes pela aba Para Dev.';
    if (no.$dynamicRef || (typeof no.$ref === 'string' && !no.$ref.startsWith('#/')))
      erro = 'Schema com referências avançadas. Ajuste os nomes pela aba Para Dev.';
  });
  return erro;
}
export function renomearUsosDaPropriedade(
  raiz: Schema,
  objeto: Schema,
  antigo: string,
  novo: string,
  caminhoAntigo: string,
  caminhoNovo: string,
) {
  visitarMesmoObjeto(objeto, (no) => {
    for (const chave of ['properties', 'dependentRequired', 'dependentSchemas']) {
      if (Object.hasOwn(no[chave] || {}, antigo))
        no[chave] = Object.fromEntries(
          Object.entries(no[chave]).map(([key, value]) => [key === antigo ? novo : key, value]),
        );
    }
    if (no.required) no.required = no.required.map((key: string) => (key === antigo ? novo : key));
    for (const key of Object.keys(no.dependentRequired || {}))
      no.dependentRequired[key] = no.dependentRequired[key].map((value: string) =>
        value === antigo ? novo : value,
      );
  });
  visitarSchemas(raiz, (no) => {
    if (typeof no.$ref === 'string' && referenciaApontaPara(no.$ref, caminhoAntigo)) {
      const ref = decodeURIComponent(no.$ref);
      no.$ref = '#' + caminhoNovo + ref.slice(1 + caminhoAntigo.length);
    }
  });
}

/** Regras de ancestrais podem restringir objetos internos por outro caminho de schema. */
export function verificarEscopoDaManutencao(raiz: Schema, caminho: string): string {
  const partes = caminho
    .split('/')
    .slice(1)
    .map((parte) => parte.replace(/~1/g, '/').replace(/~0/g, '~'));
  let atual: any = raiz;
  for (let i = 0; i < partes.length; i++) {
    if (
      [
        'allOf',
        'anyOf',
        'oneOf',
        'if',
        'then',
        'else',
        'not',
        '$defs',
        'patternProperties',
      ].includes(partes[i])
    )
      return 'Edite o nome na definição de origem ou ajuste esta regra pela aba Para Dev.';
    if (partes[i] === 'properties') {
      const nome = partes[++i];
      // O último segmento é a propriedade sendo editada: suas regras locais são atualizadas.
      if (i < partes.length - 1) {
        let sobreposto = false;
        visitarMesmoObjeto(atual, (no, principal) => {
          if (!principal && Object.hasOwn(no.properties || {}, nome)) sobreposto = true;
        });
        if (sobreposto)
          return 'Objeto interno utilizado em regras de outro nível. Ajuste o nome ou exclusão pela aba Para Dev.';
      }
      atual = atual?.properties?.[nome];
    } else atual = atual?.[partes[i]];
  }
  return '';
}
