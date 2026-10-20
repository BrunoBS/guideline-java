import type { Schema } from './tipos-schema';
import { valorAtendeSchema } from './validacao-schema';

/** Visibilidade explícita do Studio; contratos antigos mantêm a convenção de required. */
export function campoVisivelNaCondicao(
  schema: Schema,
  chave: string,
  valor: Record<string, unknown>,
  raiz: Schema,
): boolean {
  // Uma condição não pode esconder um campo que continua obrigatório na raiz.
  if (schema.required?.includes(chave)) return true;
  const visibilidade = (ramo: Schema | undefined) => ramo?.properties?.[chave]?.['x-ui']?.visible;
  const regras = (schema.allOf || []).filter(
    (regra: Schema) =>
      regra?.if !== undefined &&
      (typeof visibilidade(regra.then) === 'boolean' ||
        typeof visibilidade(regra.else) === 'boolean' ||
        regra.then?.required?.includes(chave) ||
        regra.else?.required?.includes(chave)),
  );
  if (!regras.length) return true;
  return regras.some((regra: Schema) => {
    const ramo = valorAtendeSchema(regra.if, valor, raiz) ? regra.then : regra.else;
    if (ramo?.required?.includes(chave)) return true;
    if (typeof visibilidade(ramo) === 'boolean') return visibilidade(ramo);
    if (
      typeof visibilidade(regra.then) === 'boolean' ||
      typeof visibilidade(regra.else) === 'boolean'
    )
      return false;
    return ramo?.required?.includes(chave) ?? false;
  });
}
