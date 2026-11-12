import { lerPadraoDeTexto } from './restricoes-texto-condicional';
import type { Schema } from '../../../core/schema/schema-engine';

const ANOTACOES = ['title', 'description', '$comment', 'examples', 'x-ui'];

export function possuiRestricoesDoCampo(schema: Schema | boolean): boolean {
  return (
    typeof schema === 'boolean' || Object.keys(schema).some((chave) => !ANOTACOES.includes(chave))
  );
}

export function descreverRestricoesDoCampo(schema: Schema | boolean): string {
  if (schema === false) return 'Nenhum valor é permitido neste ramo.';
  if (schema === true) return 'Qualquer valor é permitido neste ramo.';
  const mensagens: string[] = [];
  if (schema.type === 'null' && schema['x-ui']?.visible === false)
    mensagens.push('Campo oculto: o valor enviado será null.');
  if (Object.hasOwn(schema, 'const'))
    mensagens.push(`Deve ser igual a ${JSON.stringify(schema.const)}.`);
  if (
    schema.not &&
    typeof schema.not === 'object' &&
    Object.keys(schema.not).length === 1 &&
    Object.hasOwn(schema.not, 'const')
  ) {
    mensagens.push(`Não pode ser igual a ${JSON.stringify(schema.not.const)}.`);
  }
  if (Array.isArray(schema.enum))
    mensagens.push(
      `Valores permitidos: ${schema.enum.map((valor: unknown) => JSON.stringify(valor)).join(', ')}.`,
    );
  const padrao = lerPadraoDeTexto(schema.pattern);
  if (padrao.operador === 'contains')
    mensagens.push(`Deve conter ${JSON.stringify(padrao.texto)}.`);
  if (padrao.operador === 'starts')
    mensagens.push(`Deve começar com ${JSON.stringify(padrao.texto)}.`);
  if (padrao.operador === 'ends')
    mensagens.push(`Deve terminar com ${JSON.stringify(padrao.texto)}.`);
  if (padrao.operador === 'notContains')
    mensagens.push(`Não deve conter ${JSON.stringify(padrao.texto)}.`);
  if (padrao.operador === 'notStarts')
    mensagens.push(`Não deve começar com ${JSON.stringify(padrao.texto)}.`);
  if (padrao.operador === 'notEnds')
    mensagens.push(`Não deve terminar com ${JSON.stringify(padrao.texto)}.`);
  if (padrao.operador === 'advanced') mensagens.push('Padrão de texto avançado.');
  if (schema.minLength !== undefined) mensagens.push(`Mínimo de ${schema.minLength} caracteres.`);
  if (schema.maxLength !== undefined) mensagens.push(`Máximo de ${schema.maxLength} caracteres.`);
  if (schema.minimum !== undefined) mensagens.push(`Valor mínimo: ${schema.minimum}.`);
  if (schema.maximum !== undefined) mensagens.push(`Valor máximo: ${schema.maximum}.`);
  if (schema.minItems !== undefined) mensagens.push(`Mínimo de ${schema.minItems} itens.`);
  if (schema.maxItems !== undefined) mensagens.push(`Máximo de ${schema.maxItems} itens.`);
  if (schema.minProperties !== undefined)
    mensagens.push(`Mínimo de ${schema.minProperties} propriedades.`);
  if (schema.maxProperties !== undefined)
    mensagens.push(`Máximo de ${schema.maxProperties} propriedades.`);
  return mensagens.join(' ') || 'Este campo possui restrições adicionais neste ramo.';
}
