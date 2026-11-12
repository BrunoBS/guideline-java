import { obterTipoDoValor, obterTipos, type Schema } from '../../../core/schema/schema-engine';
import { converterValorAlternativa } from '../alternativas/valores-alternativas';
import { valoresJsonIguais } from '../../../core/schema/json-value';

export function inferirTipoDaComparacao(campo: Schema, valor: unknown): string {
  const tipos = obterTipos(campo),
    atual = obterTipoDoValor(valor);
  if (tipos.includes(atual)) return atual;
  if (atual === 'integer' && tipos.includes('number')) return 'number';
  return (
    tipos.find((tipo) => tipo !== 'null') || tipos[0] || (valor === undefined ? 'string' : atual)
  );
}
export function validarTipoDoValorCondicional(
  campo: Schema,
  valor: unknown,
  tipo: string,
): unknown {
  const tipos = obterTipos(campo);
  if (tipos.length && !tipos.includes(tipo))
    throw new Error('Tipo de comparação incompatível com o campo.');
  const atual = obterTipoDoValor(valor);
  if (atual !== tipo && !(tipo === 'number' && atual === 'integer'))
    throw new Error('O valor deve corresponder ao tipo selecionado.');
  if (
    Array.isArray(campo.enum) &&
    !campo.enum.some((item: unknown) => valoresJsonIguais(item, valor))
  )
    throw new Error('Selecione um valor permitido.');
  return valor;
}
export function converterTextoDaCondicao(campo: Schema, texto: string, tipo: string): unknown {
  if (tipo === 'null') {
    if (texto !== 'null') throw new Error('Selecione Nulo para comparar com null.');
    return validarTipoDoValorCondicional(campo, null, tipo);
  }
  const convertido = converterValorAlternativa({ ...campo, type: tipo }, texto);
  return validarTipoDoValorCondicional(campo, convertido, tipo);
}
