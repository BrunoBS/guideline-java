import type { Schema } from '../../core/schema/schema-engine';

export const schemaCompatibilidadeTipos: Schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Environment type compatibility request',
  type: 'object',
  additionalProperties: false,
  required: ['parentTypeCode', 'childTypeCode'],
  properties: {
    parentTypeCode: { type: 'string', enum: ['DEFAULT', 'CUSTOM', 'SHARD', 'CELL'] },
    childTypeCode: { type: 'string', enum: ['DEFAULT', 'CUSTOM', 'SHARD', 'CELL'] },
    campo: { type: 'integer', title: 'campo' },
  },
  allOf: [
    {
      if: { properties: { parentTypeCode: { const: 'DEFAULT' } } },
      then: { properties: { childTypeCode: { not: { const: 'DEFAULT' } } } },
    },
    {
      if: { properties: { parentTypeCode: { const: 'CUSTOM' } } },
      then: { properties: { childTypeCode: { not: { const: 'CUSTOM' } } } },
    },
    {
      if: { properties: { parentTypeCode: { const: 'SHARD' } } },
      then: { properties: { childTypeCode: { not: { const: 'SHARD' } } } },
    },
    {
      if: { properties: { parentTypeCode: { const: 'CELL' } } },
      then: { properties: { childTypeCode: { not: { const: 'CELL' } } } },
    },
  ],
};
