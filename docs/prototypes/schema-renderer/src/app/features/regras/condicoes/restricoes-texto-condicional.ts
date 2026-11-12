const COMPARACOES = [
  { valor: 'contains', rotulo: 'Contém', inicio: '', fim: '' },
  { valor: 'starts', rotulo: 'Começa com', inicio: '^', fim: '' },
  { valor: 'ends', rotulo: 'Termina com', inicio: '', fim: '(?![\\s\\S])' },
  { valor: 'notContains', rotulo: 'Não contém', inicio: '^(?![\\s\\S]*', fim: ')' },
  { valor: 'notStarts', rotulo: 'Não começa com', inicio: '^(?!', fim: ')' },
  { valor: 'notEnds', rotulo: 'Não termina com', inicio: '^(?![\\s\\S]*', fim: '(?![\\s\\S]))' },
];
export const OPCOES_COMPARACAO_TEXTO = COMPARACOES.map(({ valor, rotulo }) => ({ valor, rotulo }));

/** Comparações literais: caracteres especiais nunca são tratados como regex. */
export function criarPadraoDeTexto(operador: string, texto: string): string {
  const comparacao = COMPARACOES.find((opcao) => opcao.valor === operador);
  if (!comparacao) throw new Error('Comparação de texto inválida.');
  const literal = texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `${comparacao.inicio}${literal}${comparacao.fim}`;
}

export function lerPadraoDeTexto(padrao: unknown): { operador: string; texto: string } {
  if (padrao === undefined) return { operador: 'none', texto: '' };
  if (typeof padrao !== 'string') return { operador: 'advanced', texto: '' };
  for (const comparacao of [...COMPARACOES].reverse()) {
    if (!padrao.startsWith(comparacao.inicio) || !padrao.endsWith(comparacao.fim)) continue;
    const literal = padrao.slice(
      comparacao.inicio.length,
      comparacao.fim ? -comparacao.fim.length : undefined,
    );
    const texto = literal.replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
    if (criarPadraoDeTexto(comparacao.valor, texto) === padrao)
      return { operador: comparacao.valor, texto };
  }
  return { operador: 'advanced', texto: '' };
}
