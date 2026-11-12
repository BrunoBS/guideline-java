import type { PerfilValidacao } from './perfil-validacao';
import { Schema, ehSchemaIrrestrito, ehSchemaProibido, ValidationIssue } from './tipos-schema';
import { compilarValidador, compilarFragmento } from './schema-validator';
import { resolverReferencia } from './referencias-schema';
import { escaparSegmentoJson } from './caminhos-json';

export function compilarSchemaComDefinicoes(schema: any, root: Schema) {
  if (ehSchemaIrrestrito(schema) || ehSchemaProibido(schema))
    return compilarValidador(!ehSchemaProibido(schema));
  return compilarFragmento(schema, root);
}

export function valorAtendeSchema(schema: any, value: any, root: Schema): boolean {
  try {
    return !!compilarSchemaComDefinicoes(schema, root)(value);
  } catch {
    return false;
  }
}

export function validarNomeDaPropriedade(schema: any, key: string, root: Schema): string {
  const s = resolverReferencia(schema, root);
  if (s.propertyNames === undefined) return '';
  try {
    const validator = compilarSchemaComDefinicoes(s.propertyNames, root);
    if (validator(key)) return '';
    return validator.errors?.[0]?.message || 'Nome de propriedade inválido.';
  } catch {
    return 'Não foi possível validar o nome da propriedade.';
  }
}

export function obterCaminhoDoErro(error: any): string {
  let path = error.instancePath || '';
  if (error.keyword === 'required' && error.params?.missingProperty)
    path = `${path}/${escaparSegmentoJson(String(error.params.missingProperty))}`;
  if (error.keyword === 'propertyNames' && error.params?.propertyName)
    path = `${path}/${escaparSegmentoJson(String(error.params.propertyName))}`;
  return path || '/';
}

export function removerErrosDuplicados(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter(
    (issue, index, all) =>
      all.findIndex((other) => other.path === issue.path && other.message === issue.message) ===
      index,
  );
}

export function selecionarErrosRelevantes(errors: any[]): any[] {
  const filtered = errors.filter((error) => error.keyword !== 'if');
  return filtered.length ? filtered : errors;
}

export function obterProblemasDeValidacao(
  schema: any,
  value: any,
  perfil: PerfilValidacao = {},
): ValidationIssue[] {
  try {
    const validator = compilarValidador(schema, perfil),
      ok = validator(value);
    if (ok) return [];
    const errors = selecionarErrosRelevantes(validator.errors || []),
      oneOf = errors.find((error) => error.keyword === 'oneOf');
    if (oneOf) {
      const details = errors.filter(
        (error) => error.keyword !== 'oneOf' && error.keyword !== 'false schema',
      );
      return removerErrosDuplicados([
        {
          path: obterCaminhoDoErro(oneOf),
          message:
            Array.isArray(oneOf.params?.passingSchemas) && oneOf.params.passingSchemas.length > 1
              ? 'Mais de uma alternativa foi atendida: ' +
                oneOf.params.passingSchemas.map((i: number) => i + 1).join(', ') +
                '. Exatamente uma deve ser válida.'
              : 'Nenhuma alternativa foi atendida. Exatamente uma deve ser válida.',
        },
        ...details.map((error) => ({
          path: obterCaminhoDoErro(error),
          message: /\/oneOf\/(\d+)/.test(error.schemaPath || '')
            ? 'Alternativa ' +
              (Number(/\/oneOf\/(\d+)/.exec(error.schemaPath)![1]) + 1) +
              ': ' +
              (error.message || 'inválido')
            : error.message || 'inválido',
        })),
      ]);
    }
    return removerErrosDuplicados(
      errors.map((error) => ({
        path: obterCaminhoDoErro(error),
        message: error.message || 'inválido',
      })),
    );
  } catch (error) {
    return [{ path: '/', message: String(error) }];
  }
}

export function validarValor(schema: any, value: any, perfil: PerfilValidacao = {}): string[] {
  return obterProblemasDeValidacao(schema, value, perfil).map(
    (issue) => `${issue.path}: ${issue.message}`,
  );
}
