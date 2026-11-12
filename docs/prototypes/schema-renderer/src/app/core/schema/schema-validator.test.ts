import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compilarValidador, lerDocumentoSchema } from './schema-validator';

test('edited contracts can reuse the same $id without stale validators', () => {
  const first = compilarValidador({ $id: 'urn:test:edited', type: 'string' });
  const edited = compilarValidador({ $id: 'urn:test:edited', type: 'integer' });
  assert.equal(first('value'), true);
  assert.equal(edited('value'), false);
  assert.equal(edited(42), true);
});

test('equivalent schemas reuse a validator and mutated schemas compile again', () => {
  const schema = { type: 'string' };
  const first = compilarValidador(schema);
  assert.equal(compilarValidador({ ...schema }), first);
  schema.type = 'integer';
  assert.notEqual(compilarValidador(schema), first);
  assert.equal(compilarValidador(schema)(42), true);
});

test('cache eviction preserves validation and permits recompilation', () => {
  for (let i = 0; i < 110; i++) compilarValidador({ type: 'integer', minimum: i });
  assert.equal(compilarValidador({ type: 'integer', minimum: 0 })(-1), false);
});

test('document parser rejects invalid JSON, invalid schemas and non-object roots', () => {
  for (const source of ['{', 'null', '[]', 'true', '42', '{"type":"invalid"}']) {
    assert.throws(() => lerDocumentoSchema(source));
  }
  assert.deepEqual(lerDocumentoSchema('{"type":"string"}'), { type: 'string' });
});
