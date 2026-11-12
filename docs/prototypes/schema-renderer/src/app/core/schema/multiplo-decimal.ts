/** Divisibilidade da representação decimal JSON, sem divisão que transborde para Infinity. */
export function ehMultiploDecimal(divisor: number, valor: number): boolean {
  if (!Number.isFinite(valor) || !Number.isFinite(divisor) || divisor <= 0) return false;
  const decompor = (numero: number) => {
    const [mantissa, expoente = '0'] = Math.abs(numero).toString().split('e');
    const casas = mantissa.split('.')[1]?.length || 0;
    return { coeficiente: BigInt(mantissa.replace('.', '')), escala: Number(expoente) - casas };
  };
  const a = decompor(valor),
    b = decompor(divisor);
  const diferenca = a.escala - b.escala;
  const numerador = a.coeficiente * 10n ** BigInt(Math.max(0, diferenca));
  const denominador = b.coeficiente * 10n ** BigInt(Math.max(0, -diferenca));
  return numerador % denominador === 0n;
}
