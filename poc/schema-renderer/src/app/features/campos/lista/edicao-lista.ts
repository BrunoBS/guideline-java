import type { Schema } from '../../../core/schema/schema-engine';
import type { ContextoEditor } from '../../builder/contexto-editor';
import { obterNoSchema } from '../../builder/estrutura-builder';
import { converterValorPermitido } from '../../builder/valores-permitidos';
import { criarSchemaDoCampo } from '../catalogo-campos';
import {
  listarOpcoesDaLista,
  obterControleDaLista,
  obterTipoDoItemDaLista,
} from './configuracao-lista';

export class EdicaoLista {
  constructor(private readonly contexto: ContextoEditor) {}
  private get campoSelecionado() {
    return this.obterCampoSelecionado(this.contexto.obterSchema());
  }
  private set error(mensagem: string) {
    this.contexto.informarErro(mensagem);
  }
  private obterCampoSelecionado(schema: Schema) {
    return obterNoSchema(schema, this.contexto.obterCaminhoSelecionado());
  }

  readonly obterControleDaLista = obterControleDaLista;

  definirControleDaLista(widget: string) {
    if (!['list', 'checkboxes', 'multiselect'].includes(widget)) return;
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      node['x-ui'] ??= {};
      node['x-ui'].widget = widget;
      if (widget !== 'list') {
        node.uniqueItems = true;
        const type = this.obterTipoDoItemDaLista(node);
        if (!['string', 'integer', 'number'].includes(type)) node.items = { type: 'string' };
        const item = node.items as Schema;
        const saved = node['x-ui'].savedOptions as
          | { value: any; label: string; autoLabel?: boolean }[]
          | undefined;
        if (!item.enum?.length && saved?.length) {
          item.enum = saved.map((option) => option.value);
          node['x-ui'].options = saved;
        }
      } else {
        const item = node.items;
        if (item && typeof item === 'object' && !Array.isArray(item) && Array.isArray(item.enum)) {
          const existing = node['x-ui'].options || [];
          node['x-ui'].savedOptions = item.enum.map((value: any) => {
            const found = existing.find((option: any) => Object.is(option.value, value));
            return { value, label: String(found?.label ?? value), autoLabel: found?.autoLabel };
          });
          delete item.enum;
        }
        delete node['x-ui'].options;
      }
    });
  }

  readonly listarOpcoesDaLista = listarOpcoesDaLista;

  private salvarOpcoesDaLista(
    listarEntradas: { value: any; label: string; autoLabel?: boolean }[],
  ) {
    if (
      listarEntradas.some(
        (entry, i) =>
          listarEntradas.findIndex((other) => Object.is(entry.value, other.value)) !== i,
      )
    ) {
      this.error = 'Valores duplicados não são permitidos.';
      return;
    }
    if (
      listarEntradas.some(
        (entry, i) =>
          listarEntradas.findIndex(
            (other) =>
              other.label.trim().toLocaleLowerCase() === entry.label.trim().toLocaleLowerCase(),
          ) !== i,
      )
    ) {
      this.error = 'Labels duplicados não são permitidos nas opções de múltipla seleção.';
      return;
    }
    this.error = '';
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (!node.items || typeof node.items !== 'object') node.items = { type: 'string' };
      const item = node.items as Schema;
      if (listarEntradas.length) item.enum = listarEntradas.map((entry) => entry.value);
      else delete item.enum;
      node['x-ui'] ??= {};
      node['x-ui'].options = listarEntradas.map((entry) => ({
        value: entry.value,
        label: entry.label,
        autoLabel: entry.autoLabel ?? entry.label === String(entry.value),
      }));
      delete node['x-ui'].savedOptions;
    });
  }

  adicionarOpcaoDaLista() {
    const node = this.campoSelecionado!,
      listarEntradas = this.listarOpcoesDaLista(node),
      type = this.obterTipoDoItemDaLista(node);
    let value: any =
      type === 'integer' || type === 'number' ? 0 : 'VALOR_' + (listarEntradas.length + 1);
    if (typeof value === 'number') {
      while (listarEntradas.some((entry) => Object.is(entry.value, value))) value++;
    } else {
      while (listarEntradas.some((entry) => entry.value === value)) value += '_';
    }
    this.salvarOpcoesDaLista([...listarEntradas, { value, label: String(value), autoLabel: true }]);
  }

  atualizarOpcaoDaLista(index: number, key: 'value' | 'label', text: string) {
    const node = this.campoSelecionado!,
      listarEntradas = this.listarOpcoesDaLista(node);
    if (!listarEntradas[index]) return;
    try {
      const previous = listarEntradas[index],
        value = key === 'value' ? converterValorPermitido(text, node.items as Schema) : text;
      listarEntradas[index] = { ...previous, [key]: value };
      // Preserve labels explicitly edited by the user, even when they match the original value.
      const savedOptions = node['x-ui']?.options || [];
      const saved = savedOptions.find((entry: any) => Object.is(entry.value, previous.value));
      const autoLabel =
        saved?.autoLabel !== false &&
        (saved?.autoLabel === true || previous.label === String(previous.value));
      if (key === 'value' && autoLabel) listarEntradas[index].label = String(value);
      if (key === 'label') listarEntradas[index].autoLabel = false;
      else listarEntradas[index].autoLabel = autoLabel;
      this.salvarOpcoesDaLista(listarEntradas);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }
  }

  removerOpcaoDaLista(index: number) {
    const listarEntradas = this.listarOpcoesDaLista(this.campoSelecionado!);
    listarEntradas.splice(index, 1);
    this.salvarOpcoesDaLista(listarEntradas);
  }

  obterTextoDasOpcoesDaLista(node: Schema): string {
    const item = node.items;
    return item && typeof item === 'object' && !Array.isArray(item) && Array.isArray(item.enum)
      ? item.enum.map((v: unknown) => String(v)).join('\n')
      : '';
  }

  definirOpcoesDaLista(text: string) {
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!,
        item = node.items;
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      const type = this.obterTipoDoItemDaLista(node);
      const values = text
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => (type === 'integer' || type === 'number' ? Number(v) : v))
        .filter((v) => typeof v !== 'number' || Number.isFinite(v));
      if (values.length) item.enum = [...new Set(values)];
      else delete item.enum;
    });
  }

  readonly obterTipoDoItemDaLista = obterTipoDoItemDaLista;

  definirTipoDoItemDaLista(type: string) {
    if (type === 'array') {
      this.error = 'Não é permitido criar uma lista dentro de outra lista.';
      return;
    }
    this.contexto.alterarSchema((root) => {
      const node = this.obterCampoSelecionado(root)!;
      node.items = criarSchemaDoCampo(type, 'Item');
      delete node['x-ui']?.options;
      delete node['x-ui']?.savedOptions;
      if (!['string', 'integer', 'number'].includes(type) && node['x-ui'])
        node['x-ui'].widget = 'list';
    });
  }
}
