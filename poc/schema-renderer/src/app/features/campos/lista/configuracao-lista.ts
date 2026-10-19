import type { Schema } from '../../../core/schema/schema-engine';

export function obterControleDaLista(node: Schema): string {
  return node['x-ui']?.widget === 'multiselect' ? 'checkboxes' : node['x-ui']?.widget || 'list';
}

export function listarOpcoesDaLista(
  node: Schema,
): { value: any; label: string; autoLabel?: boolean }[] {
  const item = node.items as Schema | undefined;
  const options = node['x-ui']?.options || [];
  return (item?.enum || []).map((value: any) => {
    const option = options.find((entry: any) => Object.is(entry.value, value));
    return { value, label: String(option?.label ?? value), autoLabel: option?.autoLabel };
  });
}

export function obterTipoDoItemDaLista(node: Schema): string {
  const item = node.items;
  if (item === true || item === undefined) return 'string';
  if (item === false) return 'null';
  return Array.isArray(item.type) ? item.type[0] || 'string' : item.type || 'string';
}
