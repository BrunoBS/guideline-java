import { readFileSync, readdirSync } from 'node:fs';
import type { AnySchema } from 'ajv';

/** Recursos locais, nunca um servidor HTTP: a URI é apenas a chave de recuperação. */
export function carregarRecursosOficiais(): Record<string, AnySchema> {
  const raiz = new URL('./vendor/json-schema/remotes/', import.meta.url);
  const recursos: Record<string, AnySchema> = {};
  function visitar(diretorio: URL, prefixo: string) {
    for (const item of readdirSync(diretorio, { withFileTypes: true })) {
      const caminho = prefixo + item.name;
      if (item.isDirectory()) visitar(new URL(item.name + '/', diretorio), caminho + '/');
      else if (item.name.endsWith('.json'))
        recursos['http://localhost:1234/draft2020-12/' + caminho] = JSON.parse(
          readFileSync(new URL(item.name, diretorio), 'utf8'),
        );
    }
  }
  visitar(raiz, '');
  return recursos;
}
