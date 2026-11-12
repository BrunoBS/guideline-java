import { Schema, valorAtendeSchema } from '../../../core/schema/schema-engine';
import { valoresJsonIguais } from '../../../core/schema/json-value';
import { obterTipoDaRestricao } from '../condicoes/restricoes-unificadas';

export function formatarValorAlternativa(valor: unknown): string {
  return typeof valor === 'string' ? valor : valor === undefined ? '' : JSON.stringify(valor);
}
export function converterValorAlternativa(campo: Schema, texto: string): unknown {
  const tipo = obterTipoDaRestricao(campo);
  if (tipo === 'boolean') {
    if (!['true', 'false'].includes(texto)) throw new Error('Selecione Sim ou Não.');
    return texto === 'true';
  }
  if (tipo === 'number' || tipo === 'integer') {
    const numero = Number(texto);
    if (
      !texto.trim() ||
      !Number.isFinite(numero) ||
      (tipo === 'integer' && !Number.isInteger(numero))
    )
      throw new Error('Informe um número válido para o campo de escolha.');
    return numero;
  }
  if (tipo === 'array' || tipo === 'object') {
    try {
      return JSON.parse(texto);
    } catch {
      throw new Error('Informe um valor JSON válido.');
    }
  }
  return texto;
}
export function listarValoresIniciais(campo: Schema, raiz: Schema): unknown[] {
  let candidatos: unknown[] = [];
  if (Array.isArray(campo.enum)) candidatos = campo.enum;
  else if (Object.hasOwn(campo, 'const')) candidatos = [campo.const];
  else {
    const tipo = obterTipoDaRestricao(campo);
    if (tipo === 'boolean') candidatos = [false, true];
    if (tipo === 'string') {
      const tamanho = Math.max(1, campo.minLength || 0);
      if (tamanho <= 1000)
        candidatos = [
          campo.default,
          ...(campo.examples || []),
          'A'.repeat(tamanho),
          'B'.repeat(tamanho),
          'EMAIL',
          'SMS',
        ];
    }
    if (tipo === 'integer' || tipo === 'number') {
      const passo = campo.multipleOf || 1;
      const inicio =
        Math.ceil(
          Math.max(campo.minimum ?? campo.exclusiveMinimum ?? 0, -Number.MAX_SAFE_INTEGER) / passo,
        ) * passo;
      candidatos = [
        campo.default,
        ...(campo.examples || []),
        ...Array.from({ length: 32 }, (_, index) => inicio + index * passo),
        ...Array.from(
          { length: 32 },
          (_, index) =>
            Math.floor((campo.maximum ?? campo.exclusiveMaximum ?? 0) / passo) * passo -
            index * passo,
        ),
        0,
        1,
        -1,
      ];
    }
  }
  return candidatos.filter(
    (valor, index) =>
      valor !== undefined &&
      valorAtendeSchema(campo, valor, raiz) &&
      !candidatos.slice(0, index).some((anterior) => valoresJsonIguais(anterior, valor)),
  );
}
export function validarValorAlternativa(
  campo: Schema,
  valor: unknown,
  anteriores: unknown[],
  raiz: Schema,
) {
  if (!valorAtendeSchema(campo, valor, raiz))
    throw new Error('O valor não atende ao tipo ou às validações do campo de origem.');
  if (anteriores.some((anterior) => valoresJsonIguais(anterior, valor)))
    throw new Error('Cada alternativa deve ter um valor diferente.');
}
