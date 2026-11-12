import type { Schema } from '../../core/schema/schema-engine';
export type LinhaSchema = {
  path: string;
  label: string;
  depth: number;
  schema: Schema;
  required: boolean;
};
const TIPOS_COMPOSICAO = ['oneOf', 'anyOf', 'allOf'];
const TIPOS_CONDICAO = ['if', 'then', 'else'];

export function separarCaminho(path: string) {
  return path
    .split('/')
    .slice(1)
    .map((x) => x.replace(/~1/g, '/').replace(/~0/g, '~'));
}
export function escaparSegmento(key: string) {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function ehSchemaObjeto(node: Schema | undefined): boolean {
  return (
    !!node && (node.type === 'object' || (Array.isArray(node.type) && node.type.includes('object')))
  );
}

export function obterNoSchema(root: Schema, path: string): Schema | undefined {
  if (!path || path === '/') return root;
  const parts = separarCaminho(path);
  let node: any = root;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'properties') {
      node = node?.properties?.[parts[++i]];
    } else if (parts[i] === 'items') {
      node = node?.items;
    } else if (TIPOS_COMPOSICAO.includes(parts[i])) {
      node = node?.[parts[i]]?.[Number(parts[++i])];
    } else if (TIPOS_CONDICAO.includes(parts[i])) {
      node = node?.[parts[i]];
    } else if (parts[i] === '$defs' || parts[i] === 'patternProperties') {
      node = node?.[parts[i]]?.[parts[++i]];
    } else if (parts[i] === 'additionalProperties') {
      node = node?.additionalProperties;
    } else return undefined;
  }
  return node && typeof node === 'object' && !Array.isArray(node) ? node : undefined;
}

export function listarNosSchema(schema: Schema): LinhaSchema[] {
  const rows: LinhaSchema[] = [];
  const walk = (node: Schema, path: string, label: string, depth: number, required = false) => {
    if (depth > 20) return;
    rows.push({ path, label, depth, schema: node, required });
    if (ehSchemaObjeto(node) && node.properties)
      for (const [key, child] of Object.entries(node.properties)) {
        if (child && typeof child === 'object' && !Array.isArray(child))
          walk(
            child as Schema,
            path + '/properties/' + escaparSegmento(key),
            key,
            depth + 1,
            (node.required || []).includes(key),
          );
      }
    if (
      node.type === 'array' &&
      node.items &&
      typeof node.items === 'object' &&
      !Array.isArray(node.items)
    )
      walk(node.items, path + '/items', 'items', depth + 1);
    for (const kind of TIPOS_COMPOSICAO)
      if (Array.isArray(node[kind]))
        node[kind].forEach((child: any, index: number) => {
          if (child && typeof child === 'object' && !Array.isArray(child))
            walk(child, path + '/' + kind + '/' + index, kind + ' #' + (index + 1), depth + 1);
        });
    for (const kind of TIPOS_CONDICAO)
      if (node[kind] && typeof node[kind] === 'object' && !Array.isArray(node[kind]))
        walk(node[kind], path + '/' + kind, kind, depth + 1);
    for (const kind of ['$defs', 'patternProperties'])
      for (const [key, child] of Object.entries(node[kind] || {}))
        if (child && typeof child === 'object' && !Array.isArray(child))
          walk(child, path + '/' + kind + '/' + escaparSegmento(key), key, depth + 1);
    if (
      node.additionalProperties &&
      typeof node.additionalProperties === 'object' &&
      !Array.isArray(node.additionalProperties)
    )
      walk(
        node.additionalProperties,
        path + '/additionalProperties',
        'additionalProperties',
        depth + 1,
      );
  };
  walk(schema, '', 'Schema', 0);
  return rows;
}
