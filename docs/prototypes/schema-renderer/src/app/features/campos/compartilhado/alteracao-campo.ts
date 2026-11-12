import type { EditorValidacoes } from '../../builder/editor-validacoes';
import type { EdicaoLista } from '../lista/edicao-lista';

type Comandos<T> = {
  [K in keyof T]: T[K] extends (...argumentos: infer P) => unknown
    ? { metodo: K; argumentos: P }
    : never;
}[keyof T];
export type AlteracaoCampo = Comandos<
  Pick<
    EditorValidacoes,
    | 'definirLimiteNumerico'
    | 'definirAtributoOpcional'
    | 'definirExpressaoRegular'
    | 'definirPermissaoDeTextoVazio'
    | 'definirAtributoBooleano'
  >
>;
export type AlteracaoLista = Comandos<
  Pick<
    EdicaoLista,
    | 'definirTipoDoItemDaLista'
    | 'definirControleDaLista'
    | 'atualizarOpcaoDaLista'
    | 'removerOpcaoDaLista'
    | 'adicionarOpcaoDaLista'
  >
>;

export function aplicarAlteracaoCampo(editor: EditorValidacoes, alteracao: AlteracaoCampo): void {
  switch (alteracao.metodo) {
    case 'definirLimiteNumerico':
      editor.definirLimiteNumerico(...alteracao.argumentos);
      break;
    case 'definirAtributoOpcional':
      editor.definirAtributoOpcional(...alteracao.argumentos);
      break;
    case 'definirExpressaoRegular':
      editor.definirExpressaoRegular(...alteracao.argumentos);
      break;
    case 'definirPermissaoDeTextoVazio':
      editor.definirPermissaoDeTextoVazio(...alteracao.argumentos);
      break;
    case 'definirAtributoBooleano':
      editor.definirAtributoBooleano(...alteracao.argumentos);
      break;
  }
}
export function aplicarAlteracaoLista(editor: EdicaoLista, alteracao: AlteracaoLista): void {
  switch (alteracao.metodo) {
    case 'definirTipoDoItemDaLista':
      editor.definirTipoDoItemDaLista(...alteracao.argumentos);
      break;
    case 'definirControleDaLista':
      editor.definirControleDaLista(...alteracao.argumentos);
      break;
    case 'atualizarOpcaoDaLista':
      editor.atualizarOpcaoDaLista(...alteracao.argumentos);
      break;
    case 'removerOpcaoDaLista':
      editor.removerOpcaoDaLista(...alteracao.argumentos);
      break;
    case 'adicionarOpcaoDaLista':
      editor.adicionarOpcaoDaLista(...alteracao.argumentos);
      break;
  }
}
