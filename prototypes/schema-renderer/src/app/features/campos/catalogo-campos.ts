import type { Schema } from '../../core/schema/schema-engine';
import { DEFINICAO_BOOLEANO } from './booleano/definicao-booleano';
import { DEFINICAO_LISTA } from './lista/definicao-lista';
import { DEFINICAO_DECIMAL, DEFINICAO_INTEIRO } from './numero/definicao-numero';
import { DEFINICAO_OBJETO } from './objeto/definicao-objeto';
import { DEFINICAO_TEXTO } from './texto/definicao-texto';

export const CATALOGO_CAMPOS = [
  DEFINICAO_TEXTO,
  DEFINICAO_INTEIRO,
  DEFINICAO_DECIMAL,
  DEFINICAO_BOOLEANO,
  DEFINICAO_OBJETO,
  DEFINICAO_LISTA,
] as const;
export function criarSchemaDoCampo(tipo: string, titulo: string): Schema {
  const definicao = CATALOGO_CAMPOS.find((definicao) => definicao.tipo === tipo);
  // Mantém compatibilidade com o tipo null e contratos editados no modo avançado.
  return definicao ? definicao.criarSchema(titulo) : { type: tipo, title: titulo };
}
