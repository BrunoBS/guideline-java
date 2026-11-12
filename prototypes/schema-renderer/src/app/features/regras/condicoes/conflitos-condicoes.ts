import {
  combinarSchemas,
  resolverReferencia,
  valorAtendeSchema,
  type Schema,
} from '../../../core/schema/schema-engine';
import { valoresJsonIguais } from '../../../core/schema/json-value';
/** Diagnósticos demonstráveis. Não tenta resolver satisfatibilidade arbitrária de regex/vocabulários. */
export function diagnosticarConflitosCondicionais(objeto: Schema, raiz: Schema): string[] {
  const avisos: string[] = [];
  function sobrepoem(a: Schema, b: Schema): boolean {
    if (valoresJsonIguais(a, b)) return true;
    const keys = [
      ...new Set([
        ...Object.keys(a.properties || {}),
        ...Object.keys(b.properties || {}),
        ...(a.required || []),
        ...(b.required || []),
      ]),
    ];
    const exemplo: Schema = {};
    for (const key of keys) {
      const origem = objeto.properties?.[key] || {};
      const candidatos = [
        a.properties?.[key]?.const,
        b.properties?.[key]?.const,
        ...(origem.enum || []),
        origem.default,
        true,
        false,
        null,
        0,
        1,
        10,
        '',
        'A',
      ];
      const valor = candidatos.find(
        (v) =>
          v !== undefined &&
          valorAtendeSchema(
            { allOf: [origem, a.properties?.[key] || {}, b.properties?.[key] || {}] },
            v,
            raiz,
          ),
      );
      if (valor === undefined) return false;
      exemplo[key] = valor;
    }
    return valorAtendeSchema(a, exemplo, raiz) && valorAtendeSchema(b, exemplo, raiz);
  }

  const regras = (objeto.allOf || []).filter((r: Schema) => r?.if !== undefined);
  function verificarRamo(ramo: any, nome: string) {
    if (ramo === false) {
      avisos.push(`${nome}: este ramo rejeita qualquer preenchimento.`);
      return;
    }
    for (const [key, restricao] of Object.entries(ramo?.properties || {})) {
      const origem = objeto.properties?.[key] ?? {};
      const s = combinarSchemas(resolverReferencia(origem, raiz), restricao);
      const candidatos = Object.hasOwn(s, 'const') ? [s.const] : s.enum;
      const impossivel =
        s.__booleanSchema === false ||
        (Array.isArray(candidatos) &&
          !candidatos.some((v) => valorAtendeSchema({ allOf: [origem, restricao] }, v, raiz))) ||
        Math.max(s.minimum ?? -Infinity, s.exclusiveMinimum ?? -Infinity) >
          Math.min(s.maximum ?? Infinity, s.exclusiveMaximum ?? Infinity) ||
        (Math.max(s.minimum ?? -Infinity, s.exclusiveMinimum ?? -Infinity) ===
          Math.min(s.maximum ?? Infinity, s.exclusiveMaximum ?? Infinity) &&
          (s.exclusiveMinimum !== undefined || s.exclusiveMaximum !== undefined)) ||
        (s.minLength !== undefined && s.maxLength !== undefined && s.minLength > s.maxLength);
      if (impossivel)
        avisos.push(
          `${nome}: as restrições de ${key} são incompatíveis com a origem ou com outro ramo ativo.`,
        );
    }
  }
  regras.forEach((regra: Schema, i: number) => {
    verificarRamo(regra.then, `Condição ${i + 1}, ENTÃO`);
    verificarRamo(regra.else, `Condição ${i + 1}, SENÃO`);
    for (const [key, valor] of Object.entries(regra.if?.properties || {})) {
      const comparacao = valor as Schema;
      if (
        Object.hasOwn(comparacao, 'const') &&
        !valorAtendeSchema(objeto.properties?.[key] ?? {}, comparacao.const, raiz)
      )
        avisos.push(`Condição ${i + 1}: o valor esperado de ${key} não é aceito na origem.`);
    }
    regras.slice(i + 1).forEach((outra: Schema, j: number) => {
      if (sobrepoem(regra.if, outra.if))
        verificarRamo(
          combinarSchemas(regra.then ?? {}, outra.then ?? {}),
          `Condições ${i + 1} e ${i + j + 2} simultâneas`,
        );
    });
  });
  return [...new Set(avisos)];
}
