/** Equality of JSON values: object member order is irrelevant, array order is significant. */
export function valoresJsonIguais(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => valoresJsonIguais(value, right[index]))
    );
  }
  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const keys = Object.keys(leftObject);
  return (
    keys.length === Object.keys(rightObject).length &&
    keys.every(
      (key) =>
        Object.hasOwn(rightObject, key) && valoresJsonIguais(leftObject[key], rightObject[key]),
    )
  );
}
