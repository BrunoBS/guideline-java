export function escaparSegmentoJson(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}
