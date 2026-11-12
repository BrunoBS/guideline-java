import type { Schema } from '../../../core/schema/schema-engine';

export function obterValorFormatado(s: Schema, valor: unknown): string {
  if (typeof valor !== 'string') return '';
  if (s.format === 'date-time') {
    const match = valor.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    );
    if (match) {
      const date = new Date(valor);
      if (!Number.isNaN(date.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      }
    }
    return valor;
  }
  if (s.format === 'time')
    return valor.replace(/^(\d{2}:\d{2}):\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/, '$1');
  return valor;
}
export function converterValorFormatado(s: Schema, value: string) {
  if (s.format === 'date-time' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  if (s.format === 'time' && /^\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const pad = (n: number) => String(n).padStart(2, '0');
    const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
    return (value.length === 5 ? value + ':00' : value) + offset;
  }
  return value;
}
export function obterTipoDoControle(s: Schema) {
  switch (s.format) {
    case 'password':
      return 'password';
    case 'email':
      return 'email';
    case 'date':
      return 'date';
    case 'date-time':
      return 'datetime-local';
    case 'time':
      return 'time';
    case 'uri':
    case 'url':
      return 'url';
    default:
      return 'text';
  }
}
export function obterExemploDoCampo(s: Schema) {
  const example = Array.isArray(s.examples) ? s.examples[0] : s.example;
  return example === undefined
    ? ''
    : typeof example === 'string'
      ? example
      : JSON.stringify(example);
}
export function formatarValorJson(value: any) {
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return String(value ?? '');
  }
}
