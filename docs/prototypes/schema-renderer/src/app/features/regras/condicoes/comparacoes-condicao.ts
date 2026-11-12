import type { Schema } from '../../../core/schema/schema-engine';
import {
  criarPadraoDeTexto,
  lerPadraoDeTexto,
  OPCOES_COMPARACAO_TEXTO,
} from './restricoes-texto-condicional';

export const COMPARACOES_NUMERICAS = [
  { valor: 'greater', rotulo: 'Maior que', chave: 'exclusiveMinimum' },
  { valor: 'greaterOrEqual', rotulo: 'Maior ou igual a', chave: 'minimum' },
  { valor: 'less', rotulo: 'Menor que', chave: 'exclusiveMaximum' },
  { valor: 'lessOrEqual', rotulo: 'Menor ou igual a', chave: 'maximum' },
];
export function lerComparacaoDaCondicao(schema: any): { operador: string; valor: any } | undefined {
  if (!schema || typeof schema !== 'object' || Object.keys(schema).length !== 1) return undefined;
  if (Object.hasOwn(schema, 'const')) return { operador: 'equals', valor: schema.const };
  if (
    schema.not &&
    typeof schema.not === 'object' &&
    Object.keys(schema.not).length === 1 &&
    Object.hasOwn(schema.not, 'const')
  )
    return { operador: 'different', valor: schema.not.const };
  const numerica = COMPARACOES_NUMERICAS.find((item) => Object.hasOwn(schema, item.chave));
  if (numerica && typeof schema[numerica.chave] === 'number')
    return { operador: numerica.valor, valor: schema[numerica.chave] };
  if (Object.hasOwn(schema, 'pattern')) {
    const padrao = lerPadraoDeTexto(schema.pattern);
    if (!['none', 'advanced'].includes(padrao.operador))
      return { operador: padrao.operador, valor: padrao.texto };
  }
  return undefined;
}
export function criarComparacaoDaCondicao(operador: string, valor: any, tipos: string[]): Schema {
  if (operador === 'equals') return { const: valor };
  if (operador === 'different') return { not: { const: valor } };
  const numerica = COMPARACOES_NUMERICAS.find((item) => item.valor === operador);
  if (numerica && tipos.some((tipo) => ['integer', 'number'].includes(tipo))) {
    if (typeof valor !== 'number' || !Number.isFinite(valor))
      throw new Error('Informe um número válido para a comparação.');
    return { [numerica.chave]: valor };
  }
  if (tipos.includes('string') && OPCOES_COMPARACAO_TEXTO.some((item) => item.valor === operador)) {
    if (typeof valor !== 'string' || !valor.length)
      throw new Error('Informe o trecho de texto da comparação.');
    return { pattern: criarPadraoDeTexto(operador, valor) };
  }
  throw new Error('Comparação incompatível com o tipo do campo.');
}
