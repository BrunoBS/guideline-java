import type { Schema } from '../../core/schema/schema-engine';

export async function copiarSchemaParaClipboard(schema: Schema): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
}

export function baixarSchema(schema: Schema): void {
  const arquivo = new Blob([JSON.stringify(schema, null, 2)], {
    type: 'application/schema+json',
  });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'json-schema.json';
  link.click();
  URL.revokeObjectURL(url);
}
