import { Schema, valorAtendeSchema } from '../../../core/schema/schema-engine';
import {
  criarPadraoDeTexto,
  lerPadraoDeTexto,
  OPCOES_COMPARACAO_TEXTO,
} from './restricoes-texto-condicional';

export function obterTipoDaRestricao(campo: Schema = {}): string {
  return Array.isArray(campo.type)
    ? campo.type.find((tipo: string) => tipo !== 'null') || ''
    : campo.type || '';
}
export function lerComparacaoUnificada(schema: Schema): { operador: string; valor: string } {
  if (!schema || typeof schema !== 'object') return { operador: 'advanced', valor: '' };
  const comparacoes = ['const', 'not', 'pattern'].filter((chave) => Object.hasOwn(schema, chave));
  if (comparacoes.length > 1) return { operador: 'advanced', valor: '' };
  if (comparacoes[0] === 'pattern') {
    const padrao = lerPadraoDeTexto(schema.pattern);
    return { operador: padrao.operador, valor: padrao.texto };
  }
  if (
    comparacoes[0] === 'not' &&
    (!schema.not ||
      typeof schema.not !== 'object' ||
      Object.keys(schema.not).length !== 1 ||
      !Object.hasOwn(schema.not, 'const'))
  )
    return { operador: 'advanced', valor: '' };
  const valor = comparacoes[0] === 'not' ? schema.not.const : schema.const;
  return {
    operador:
      comparacoes[0] === 'not' ? 'different' : comparacoes[0] === 'const' ? 'equals' : 'none',
    valor: valor === undefined ? '' : typeof valor === 'string' ? valor : JSON.stringify(valor),
  };
}
export interface RascunhoRestricao {
  operador: string;
  valor: string;
}
export function criarRestricaoUnificada(
  campo: Schema,
  atual: Schema,
  rascunho: RascunhoRestricao,
  raiz: Schema,
): Schema {
  if (typeof atual === 'boolean')
    throw new Error('Schema booleano preservado. Edite pela aba Para Dev.');
  const tipo = obterTipoDaRestricao(campo);
  const { operador, valor } = rascunho;
  const avancada = lerComparacaoUnificada(atual).operador === 'advanced';
  if (avancada !== (operador === 'advanced'))
    throw new Error('A comparação avançada deve ser preservada.');
  const texto = OPCOES_COMPARACAO_TEXTO.some((opcao) => opcao.valor === operador);
  if (
    !['none', 'equals', 'different', 'advanced'].includes(operador) &&
    !(tipo === 'string' && texto)
  )
    throw new Error('Comparação incompatível com o tipo do campo.');
  const proxima = structuredClone(atual);
  if (!avancada) {
    delete proxima.const;
    delete proxima.not;
    delete proxima.pattern;
    if (texto) {
      if (!valor.length) throw new Error('Informe o trecho de texto para a comparação.');
      proxima.pattern = criarPadraoDeTexto(operador, valor);
    } else if (operador === 'equals' || operador === 'different') {
      let convertido: unknown = valor;
      const opcaoEnum = campo.enum?.find(
        (item: unknown) => (typeof item === 'string' ? item : JSON.stringify(item)) === valor,
      );
      if (campo.enum) {
        if (opcaoEnum === undefined) throw new Error('Selecione um valor permitido para o campo.');
        convertido = opcaoEnum;
      } else if (tipo === 'boolean') {
        if (!['true', 'false'].includes(valor)) throw new Error('Selecione Sim ou Não.');
        convertido = valor === 'true';
      } else if (tipo === 'integer' || tipo === 'number') {
        convertido = Number(valor);
        if (
          !valor.trim() ||
          !Number.isFinite(convertido) ||
          (tipo === 'integer' && !Number.isInteger(convertido))
        )
          throw new Error('Informe um número válido para o tipo do campo.');
      } else if (tipo === 'object' || tipo === 'array') {
        try {
          convertido = JSON.parse(valor);
        } catch {
          throw new Error('Informe um valor JSON válido.');
        }
        if (
          tipo === 'array'
            ? !Array.isArray(convertido)
            : !convertido || typeof convertido !== 'object' || Array.isArray(convertido)
        )
          throw new Error('O valor deve corresponder ao tipo do campo.');
      }
      if (operador === 'equals') proxima.const = convertido;
      else proxima.not = { const: convertido };
    }
  }
  // A comparação nunca altera limites da origem ou de um ramo importado.
  const maximoEfetivo = Math.min(campo.maxLength ?? Infinity, proxima.maxLength ?? Infinity);
  if (texto && !operador.startsWith('not') && [...valor].length > maximoEfetivo)
    throw new Error('O trecho de texto é maior que o tamanho máximo permitido.');
  if (operador === 'equals' && !valorAtendeSchema({ allOf: [campo, proxima] }, proxima.const, raiz))
    throw new Error('O valor exato não atende às validações do campo.');
  if (
    operador !== 'equals' &&
    Object.hasOwn(proxima, 'const') &&
    !valorAtendeSchema({ allOf: [campo, proxima] }, proxima.const, raiz)
  )
    throw new Error('A comparação é incompatível com o valor exato importado.');
  if (
    Array.isArray(campo.enum) &&
    !campo.enum.some((valor: unknown) =>
      valorAtendeSchema({ allOf: [campo, proxima] }, valor, raiz),
    )
  )
    throw new Error('Nenhum valor permitido atende à combinação de restrições.');
  if (
    Object.hasOwn(campo, 'const') &&
    !valorAtendeSchema({ allOf: [campo, proxima] }, campo.const, raiz)
  )
    throw new Error('A restrição é incompatível com o valor fixo do campo.');
  return proxima;
}
