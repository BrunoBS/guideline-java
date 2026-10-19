import { Schema } from '../core/schema/schema-engine';

const draft = 'https://json-schema.org/draft/2020-12/schema';

export const parameterKeyRequestSchema: Schema = {
  $schema: draft,
  title: 'Parameter key request',
  type: 'object',
  additionalProperties: false,
  required: ['type', 'value'],
  properties: {
    version: { type: ['integer', 'null'], minimum: 0, maximum: 9223372036854775807 },
    microserviceIdentifier: { type: 'string', format: 'uuid', maxLength: 36 },
    key: { type: 'string', maxLength: 80, pattern: '^[a-z0-9]+(?:[._-][a-z0-9]+)*$' },
    description: { type: ['string', 'null'], maxLength: 200 },
    type: { type: 'string', enum: ['CONFIGURATION', 'EXPRESSION'] },
    value: {},
  },
  allOf: [
    {
      oneOf: [
        { required: ['microserviceIdentifier', 'key'], properties: { version: { type: 'null' } } },
        {
          required: ['version'],
          properties: { version: { type: 'integer' }, microserviceIdentifier: false, key: false },
        },
      ],
    },
    {
      if: { properties: { type: { const: 'CONFIGURATION' } }, required: ['type'] },
      then: { properties: { value: { type: 'object', additionalProperties: true } } },
    },
    {
      if: { properties: { type: { const: 'EXPRESSION' } }, required: ['type'] },
      then: {
        properties: {
          value: {
            type: 'object',
            additionalProperties: false,
            required: ['operator', 'valueType', 'value'],
            properties: {
              operator: {
                enum: [
                  'EQUALS',
                  'NOT_EQUALS',
                  'CONTAINS',
                  'NOT_CONTAINS',
                  'GREATER_THAN',
                  'GREATER_THAN_OR_EQUALS',
                  'LESS_THAN',
                  'LESS_THAN_OR_EQUALS',
                ],
              },
              valueType: { enum: ['STRING', 'INTEGER', 'LONG', 'DECIMAL'] },
              value: {},
            },
            allOf: [
              {
                if: {
                  properties: { operator: { enum: ['CONTAINS', 'NOT_CONTAINS'] } },
                  required: ['operator'],
                },
                then: { properties: { value: { type: 'array', minItems: 1, uniqueItems: true } } },
                else: { properties: { value: { not: { type: 'array' } } } },
              },
              {
                if: {
                  properties: {
                    operator: {
                      enum: [
                        'GREATER_THAN',
                        'GREATER_THAN_OR_EQUALS',
                        'LESS_THAN',
                        'LESS_THAN_OR_EQUALS',
                      ],
                    },
                  },
                  required: ['operator'],
                },
                then: { properties: { valueType: { enum: ['INTEGER', 'LONG', 'DECIMAL'] } } },
              },
              {
                if: { properties: { valueType: { const: 'STRING' } }, required: ['valueType'] },
                then: {
                  if: {
                    properties: { operator: { enum: ['CONTAINS', 'NOT_CONTAINS'] } },
                    required: ['operator'],
                  },
                  then: { properties: { value: { items: { type: 'string' } } } },
                  else: { properties: { value: { type: 'string' } } },
                },
              },
              {
                if: { properties: { valueType: { const: 'INTEGER' } }, required: ['valueType'] },
                then: {
                  if: {
                    properties: { operator: { enum: ['CONTAINS', 'NOT_CONTAINS'] } },
                    required: ['operator'],
                  },
                  then: {
                    properties: {
                      value: {
                        items: { type: 'integer', minimum: -2147483648, maximum: 2147483647 },
                      },
                    },
                  },
                  else: {
                    properties: {
                      value: { type: 'integer', minimum: -2147483648, maximum: 2147483647 },
                    },
                  },
                },
              },
              {
                if: { properties: { valueType: { const: 'LONG' } }, required: ['valueType'] },
                then: {
                  if: {
                    properties: { operator: { enum: ['CONTAINS', 'NOT_CONTAINS'] } },
                    required: ['operator'],
                  },
                  then: {
                    properties: {
                      value: {
                        items: {
                          type: 'integer',
                          minimum: -9223372036854775808,
                          maximum: 9223372036854775807,
                        },
                      },
                    },
                  },
                  else: {
                    properties: {
                      value: {
                        type: 'integer',
                        minimum: -9223372036854775808,
                        maximum: 9223372036854775807,
                      },
                    },
                  },
                },
              },
              {
                if: { properties: { valueType: { const: 'DECIMAL' } }, required: ['valueType'] },
                then: {
                  if: {
                    properties: { operator: { enum: ['CONTAINS', 'NOT_CONTAINS'] } },
                    required: ['operator'],
                  },
                  then: { properties: { value: { items: { type: 'number', multipleOf: 0.01 } } } },
                  else: { properties: { value: { type: 'number', multipleOf: 0.01 } } },
                },
              },
            ],
          },
        },
      },
    },
  ],
};
