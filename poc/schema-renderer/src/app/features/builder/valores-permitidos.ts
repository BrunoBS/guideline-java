import type { Schema } from '../../core/schema/schema-engine';

export function converterValorPermitido(text: string, node: Schema): any {
  const type = Array.isArray(node.type) ? node.type[0] : node.type;
  if (type === 'integer' || type === 'number') {
    if (text.trim() === '') throw new Error('Informe um número.');
    const number = Number(text);
    if (!Number.isFinite(number) || (type === 'integer' && !Number.isInteger(number)))
      throw new Error(
        type === 'integer' ? 'Informe um número inteiro válido.' : 'Informe um número válido.',
      );
    return number;
  }
  return text;
}
