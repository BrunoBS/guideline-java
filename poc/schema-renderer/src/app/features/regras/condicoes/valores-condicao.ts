import {
  criarValorInicial,
  obterTipos,
  resolverReferencia,
  valorAtendeSchema,
  type Schema,
} from '../../../core/schema/schema-engine';
import { listarValoresIniciais } from '../alternativas/valores-alternativas';

export function resolverCampoDaCondicao(campo: Schema, raiz: Schema): Schema {
  const resolvido = resolverReferencia(campo, raiz);
  if (resolvido.__jsonFallback || resolvido.__externalRef || (campo.$ref && resolvido.$ref))
    throw new Error('Referência não resolvida. Edite esta condição pela aba Para Dev.');
  return resolvido;
}

/** Procura candidatos, sem prometer sintetizar valores para qualquer schema. */
export function escolherValorInicialDaCondicao(campo: Schema, raiz: Schema, tipo?: string): any {
  const tipos = tipo
    ? [tipo]
    : [
        ...obterTipos(campo).filter((item) => item !== 'null'),
        ...obterTipos(campo).filter((item) => item === 'null'),
      ];
  const candidatos: any[] = [campo.default, ...(campo.examples || []), ...(campo.enum || [])];
  if (Object.hasOwn(campo, 'const')) candidatos.push(campo.const);
  for (const atual of tipos.length ? tipos : ['string']) {
    const restrito = { ...campo, type: atual };
    if ((campo.minItems || 0) <= 100 && (campo.minLength || 0) <= 1000)
      candidatos.push(criarValorInicial(restrito, raiz));
    candidatos.push(...listarValoresIniciais(restrito, raiz));
    if (atual === 'null') candidatos.push(null);
    if (atual === 'object') candidatos.push({});
    if (atual === 'array') candidatos.push([]);
    if (atual === 'string') candidatos.push('');
  }
  const valor = candidatos.find(
    (item) =>
      item !== undefined &&
      (!tipo || valorAtendeSchema({ type: tipo }, item, raiz)) &&
      valorAtendeSchema(campo, item, raiz),
  );
  if (valor === undefined)
    throw new Error(
      'Não foi possível obter um valor inicial válido. Cadastre um exemplo ou valor padrão válido no campo de origem.',
    );
  return structuredClone(valor);
}
