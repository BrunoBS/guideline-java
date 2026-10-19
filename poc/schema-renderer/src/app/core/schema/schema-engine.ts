// API pública do motor. Cada módulo implementa uma responsabilidade.
export type { Schema, ValidationIssue } from './tipos-schema';
export type { PerfilValidacao } from './perfil-validacao';
export {
  ehSchemaBooleano,
  ehSchemaProibido,
  ehSchemaIrrestrito,
  obterTipos,
  obterTiposNaoNulos,
  obterTipoPrincipal,
  permiteNulo,
  possuiUniaoDeTipos,
  ehSchemaLivre,
  obterTipoDoValor,
} from './tipos-schema';
export { combinarSchemas } from './combinacao-schemas';
export { resolverReferencia } from './referencias-schema';
export {
  valorAtendeSchema,
  validarNomeDaPropriedade,
  obterProblemasDeValidacao,
  validarValor,
} from './validacao-schema';
export {
  escolherAlternativa,
  resolverSchemaDoCampo,
  resolverEstruturaAtual,
  restringirTipoDoSchema,
  listarAlternativasDoSchema,
  obterRotuloDoSchema,
} from './resolucao-schema';
export { obterSchemaDoItem, obterSchemaDaPropriedade } from './estrutura-schema';
export { criarValorInicial } from './valores-iniciais';
export { ajustarValorAoSchema } from './reconciliacao-valores';
