import type { Schema } from '../../core/schema/schema-engine';

export function aplicarRestricoesDeTextoObrigatorio(node: Schema, depth = 0): void {
  if (depth > 30 || !node || typeof node !== 'object') return;
  for (const [name, child] of Object.entries(node.properties || {})) {
    if (!child || typeof child !== 'object') continue;
    const prop = child as Schema;
    if (
      (node.required || []).includes(name) &&
      prop.type === 'string' &&
      prop['x-ui']?.allowEmpty !== true &&
      (prop.minLength === undefined || prop.minLength < 1)
    )
      prop.minLength = 1;
    aplicarRestricoesDeTextoObrigatorio(prop, depth + 1);
  }
  if (
    node.type === 'array' &&
    node.items &&
    typeof node.items === 'object' &&
    !Array.isArray(node.items)
  )
    aplicarRestricoesDeTextoObrigatorio(node.items as Schema, depth + 1);
}
