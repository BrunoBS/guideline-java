import { AtributosObjetoComponent } from './atributos-objeto.component';
import { avaliarCompatibilidadeDaConstrucao } from './compatibilidade-construcao';
import { EditorEstruturasComponent } from './editor-estruturas.component';
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Schema } from '../../core/schema/schema-engine';
import { EditorBooleanoComponent } from '../campos/booleano/editor-booleano.component';
import { CATALOGO_CAMPOS, criarSchemaDoCampo } from '../campos/catalogo-campos';
import {
  aplicarAlteracaoCampo,
  aplicarAlteracaoLista,
  type AlteracaoCampo,
  type AlteracaoLista,
} from '../campos/compartilhado/alteracao-campo';
import { EdicaoLista } from '../campos/lista/edicao-lista';
import { EditorListaComponent } from '../campos/lista/editor-lista.component';
import { EditorNumeroComponent } from '../campos/numero/editor-numero.component';
import { EditorObjetoComponent } from '../campos/objeto/editor-objeto.component';
import { EditorTextoComponent } from '../campos/texto/editor-texto.component';
import { EditorAlternativas } from '../regras/alternativas/edicao-alternativas';
import { EditorAlternativasComponent } from '../regras/alternativas/editor-alternativas.component';
import type { AlteracaoRegra } from '../regras/compartilhado/contexto-regra';
import { EditorCondicoes } from '../regras/condicoes/edicao-condicoes';
import { EditorCondicoesComponent } from '../regras/condicoes/editor-condicoes.component';
import type { ContextoEditor } from './contexto-editor';
import { EditorPropriedades } from './editor-propriedades';
import { EditorValidacoes } from './editor-validacoes';
import {
  ehSchemaObjeto,
  escaparSegmento,
  listarNosSchema,
  obterNoSchema,
  separarCaminho,
} from './estrutura-builder';

import type { LinhaSchema } from './estrutura-builder';
@Component({
  selector: 'app-schema-builder',
  standalone: true,
  imports: [
    AtributosObjetoComponent,
    CommonModule,
    FormsModule,
    EditorTextoComponent,
    EditorNumeroComponent,
    EditorBooleanoComponent,
    EditorObjetoComponent,
    EditorListaComponent,
    EditorEstruturasComponent,
    EditorCondicoesComponent,
    EditorAlternativasComponent,
  ],
  styleUrls: [
    './schema-builder.component.css',
    '../campos/compartilhado/editor-campo.css',
    './construcao-ajuda.css',
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './schema-builder.component.html',
})
export class SchemaBuilderComponent implements OnChanges {
  aplicarAlteracaoDeRegra(editar: AlteracaoRegra) {
    this.aplicarAlteracao(editar);
  }
  aplicarAlteracaoDoCampo(alteracao: AlteracaoCampo) {
    aplicarAlteracaoCampo(this.validacoes, alteracao);
  }
  aplicarAlteracaoDaLista(alteracao: AlteracaoLista) {
    aplicarAlteracaoLista(this.listas, alteracao);
  }
  private readonly contextoEditor: ContextoEditor = {
    obterSchema: () => this.schema,
    obterCaminhoAtivo: () => this.activeContainerPath,
    obterCaminhoSelecionado: () => this.selectedPath,
    selecionarCaminho: (caminho) => {
      this.selectedPath = caminho;
    },
    obterPaleta: () => this.palette,
    alterarSchema: (editar) => this.aplicarAlteracao(editar),
    informarErro: (mensagem) => {
      this.error = mensagem;
    },
  };
  readonly ehSchemaObjeto = ehSchemaObjeto;
  readonly listas = new EdicaoLista(this.contextoEditor);
  readonly propriedades = new EditorPropriedades(this.contextoEditor);
  readonly condicoes = new EditorCondicoes(this.contextoEditor);
  readonly validacoes = new EditorValidacoes(this.contextoEditor);
  readonly alternativas = new EditorAlternativas(this.contextoEditor);
  builderStep: 'components' | 'rules' = 'components';
  selecionarEtapa(step: 'components' | 'rules') {
    this.builderStep = step;
    this.activeContainerPath = '';
    this.containerHistory = [];
    this.error = '';
  }
  private persistedSchema: Schema = { type: 'object', properties: {} };
  private editorDraft: Schema | null = null;
  @Input() set schema(value: Schema) {
    this.persistedSchema = value;
    this.motivosDeBloqueio = avaliarCompatibilidadeDaConstrucao(value);
    this.cancelarEdicao();
  }
  get schema(): Schema {
    return this.editorDraft ?? this.persistedSchema;
  }
  motivosDeBloqueio = avaliarCompatibilidadeDaConstrucao(this.persistedSchema);
  @Input() bloqueioExterno = '';
  @Output() abrirDev = new EventEmitter<void>();
  get edicaoBloqueada() {
    return (
      this.mode === 'construction' && (!!this.bloqueioExterno || this.motivosDeBloqueio.length > 0)
    );
  }
  @Input() mode: 'construction' | 'dev' = 'construction';
  @Output() schemaChange = new EventEmitter<Schema>();
  selectedPath = '';
  editorModalOpen = false;
  private iniciarRascunho() {
    this.editorDraft = structuredClone(this.persistedSchema);
    this.propriedades.propertyNameDraft = null;
    this.propriedades.propertyNameError = '';
  }
  abrirEditorDoCampo(path: string) {
    if (this.edicaoBloqueada) return;
    this.iniciarRascunho();
    this.selecionarCampo(path);
    this.editorModalOpen = true;
  }
  abrirEditorDoFormulario() {
    if (this.edicaoBloqueada) return;
    this.iniciarRascunho();
    this.selecionarFormulario();
    this.editorModalOpen = true;
  }
  abrirEditorDoGrupo(id: string) {
    if (this.edicaoBloqueada) return;
    this.iniciarRascunho();
    this.selecionarGrupo(id);
    this.editorModalOpen = true;
  }
  salvarEdicao() {
    if (this.edicaoBloqueada) return;
    if (this.propriedades.propertyNameDraft !== null)
      this.propriedades.confirmarNomeDaPropriedade();
    if (this.propriedades.propertyNameError) return;
    const draft = this.editorDraft;
    if (!draft) return;
    this.editorModalOpen = false;
    this.editorDraft = null;
    this.editingForm = false;
    this.selectedGroupId = '';
    this.persistedSchema = draft;
    this.motivosDeBloqueio = avaliarCompatibilidadeDaConstrucao(draft);
    this.atualizarArvore();
    this.schemaChange.emit(draft);
  }
  cancelarEdicao() {
    this.editorModalOpen = false;
    this.editorDraft = null;
    this.propriedades.propertyNameDraft = null;
    this.propriedades.propertyNameError = '';
    this.editingForm = false;
    this.selectedGroupId = '';
    this.atualizarArvore();
  }
  selectedGroupId = '';
  editingForm = false;
  groupAddPickerOpen = false;
  get paletaDoGrupo() {
    return this.palette;
  }
  abrirSeletorDeCamposDoGrupo(id: string) {
    this.selecionarGrupo(id);
    this.groupAddPickerOpen = true;
  }
  adicionarCampoAoGrupoSelecionado(type: string) {
    if (!this.selectedGroupId) return;
    this.adicionarCampoAoGrupo(this.selectedGroupId, type);
    this.groupAddPickerOpen = false;
  }
  collapsedGroups = new Set<string>();
  collapsedObjects = new Set<string>();
  alternarExpansaoDoObjeto(path: string) {
    const next = new Set(this.collapsedObjects);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    this.collapsedObjects = next;
  }
  activeContainerPath = '';
  containerHistory: string[] = [];
  error = '';
  readonly inlineTypes = CATALOGO_CAMPOS.map((campo) => ({
    type: campo.tipo,
    label: campo.rotulo,
  }));

  types = ['string', 'integer', 'number', 'boolean', 'object', 'array', 'null'];
  compositionKinds = ['oneOf', 'anyOf', 'allOf'];
  conditionalKinds = ['if', 'then', 'else'];
  formats = [
    'email',
    'uri',
    'uuid',
    'date',
    'date-time',
    'time',
    'hostname',
    'ipv4',
    'ipv6',
    'password',
    'regex',
  ];
  rows: LinhaSchema[] = [];
  showAddMenu = false;
  showAdvanced = false;
  editorTab: 'property' | 'validation' = 'property';
  showDeleteConfirmation = false;
  solicitarExclusaoDoCampoSelecionado() {
    this.showDeleteConfirmation = true;
  }
  solicitarExclusaoDoCampo(path: string) {
    this.selecionarCampo(path);
    this.showDeleteConfirmation = true;
  }
  cancelarExclusao() {
    this.showDeleteConfirmation = false;
  }
  confirmarExclusao() {
    this.showDeleteConfirmation = false;
    this.propriedades.removerCampoSelecionado();
  }
  showStructure = false;
  palette = CATALOGO_CAMPOS.map((campo) => ({
    type: campo.tipo,
    label: campo.rotulo,
    icon: campo.icone,
  }));
  get grupoSelecionado(): any {
    return this.listarGruposVisuais.find((g: any) => g.id === this.selectedGroupId);
  }
  selecionarFormulario() {
    this.editingForm = true;
    this.selectedGroupId = '';
    this.selectedPath = '';
  }
  atualizarFormulario(key: 'title' | 'description', value: string) {
    this.aplicarAlteracao((root) => {
      if (value) root[key] = value;
      else delete root[key];
    });
  }
  selecionarGrupo(id: string) {
    this.editingForm = false;
    this.selectedGroupId = id;
    this.selectedPath = '';
    this.editorTab = 'property';
    this.showAddMenu = false;
    this.groupAddPickerOpen = false;
  }
  selecionarCampoDoGrupo(key: string) {
    this.selectedGroupId = '';
    this.selecionarCampo((this.activeContainerPath || '') + '/properties/' + escaparSegmento(key));
  }
  obterTituloDoCampo(key: string) {
    return (
      obterNoSchema(
        this.schema,
        (this.activeContainerPath || '') + '/properties/' + escaparSegmento(key),
      )?.title || key
    );
  }

  private preservarRolagem(action: () => void) {
    const x = window.scrollX,
      y = window.scrollY;
    action();
    requestAnimationFrame(() => window.scrollTo(x, y));
  }
  adicionarCampoAoGrupo(id: string, type: string) {
    this.adicionarPropriedadeDoTipo(type);
  }
  get ordemDosCampos(): string[] {
    return Object.keys(obterNoSchema(this.schema, this.activeContainerPath)?.properties || {}).map(
      (k) => 'field:' + k,
    );
  }
  obterPosicaoDoCampo(t: string) {
    return this.ordemDosCampos.indexOf(t);
  }
  podeMoverCampoRaiz(t: string, d: number) {
    const i = this.ordemDosCampos.indexOf(t);
    return i >= 0 && i + d >= 0 && i + d < this.ordemDosCampos.length;
  }
  moverCampoRaiz(t: string, d: number) {
    if (!this.podeMoverCampoRaiz(t, d)) return;
    const keys = this.ordemDosCampos.map((x) => x.slice(6));
    const i = keys.indexOf(t.slice(6));
    [keys[i], keys[i + d]] = [keys[i + d], keys[i]];
    this.aplicarAlteracao((root) => {
      const node = obterNoSchema(root, this.activeContainerPath);
      if (node?.properties)
        node.properties = Object.fromEntries(keys.map((k) => [k, node.properties![k]]));
    });
  }
  moverGrupo(id: string, d: number) {
    this.moverCampoRaiz('field:' + id, d);
  }
  private listarCaminhosDosCamposIrmaos(path: string): string[] {
    return this.camposVisiveis.map((x) => x.path);
  }
  podeMoverCampo(path: string, d: number) {
    return this.podeMoverCampoRaiz('field:' + this.obterChaveDaPropriedade(path), d);
  }
  moverCampo(path: string, d: number) {
    this.moverCampoRaiz('field:' + this.obterChaveDaPropriedade(path), d);
  }
  get listarGruposVisuais(): any[] {
    return [];
  }
  atualizarGrupo(id: string, key: 'title' | 'description', value: string) {}
  alternarCampoDoGrupo(id: string, field: string, enabled: boolean) {}
  excluirGrupo(id: string) {}
  alternarExpansaoDoGrupo(id: string) {
    const next = new Set(this.collapsedGroups);
    next.has(id) ? next.delete(id) : next.add(id);
    this.collapsedGroups = next;
  }
  listarCamposDoGrupo(group: any): LinhaSchema[] {
    return [];
  }
  get camposSemGrupo() {
    return this.camposVisiveis;
  }
  obterChaveDaPropriedade(path: string) {
    return separarCaminho(path).at(-1) || '';
  }
  private localizarPropriedadeNoObjeto(
    path: string,
  ): { parentPath: string; key: string; keys: string[] } | null {
    const parts = separarCaminho(path);
    if (parts.length < 2 || parts[parts.length - 2] !== 'properties') return null;
    const key = parts[parts.length - 1];
    const parentPath = parts
      .slice(0, -2)
      .map((part) => '/' + escaparSegmento(part))
      .join('');
    const parent = obterNoSchema(this.schema, parentPath);
    if (
      !parent ||
      !ehSchemaObjeto(parent) ||
      !parent.properties ||
      !Object.prototype.hasOwnProperty.call(parent.properties, key)
    )
      return null;
    return { parentPath, key, keys: Object.keys(parent.properties) };
  }
  podeMoverPropriedade(path: string, direction: number): boolean {
    const location = this.localizarPropriedadeNoObjeto(path);
    if (!location) return false;
    const index = location.keys.indexOf(location.key);
    return index >= 0 && index + direction >= 0 && index + direction < location.keys.length;
  }
  moverPropriedade(path: string, direction: number): void {
    const location = this.localizarPropriedadeNoObjeto(path);
    if (!location || !this.podeMoverPropriedade(path, direction)) return;
    const keys = [...location.keys];
    const index = keys.indexOf(location.key);
    [keys[index], keys[index + direction]] = [keys[index + direction], keys[index]];
    this.aplicarAlteracao((root) => {
      const parent = obterNoSchema(root, location.parentPath);
      if (!parent?.properties) return;
      parent.properties = Object.fromEntries(keys.map((key) => [key, parent.properties![key]]));
    });
  }

  dragSource = '';
  iniciarArrasteDoCampo(path: string, event: DragEvent) {
    if (this.edicaoBloqueada) {
      event.preventDefault();
      return;
    }
    this.dragSource = 'field:' + path;
    event.stopPropagation();
    event.dataTransfer?.setData('text/plain', this.dragSource);
  }
  iniciarArrasteDoGrupo(id: string, event: DragEvent) {
    if (this.edicaoBloqueada) {
      event.preventDefault();
      return;
    }
    this.dragSource = 'group:' + id;
    event.stopPropagation();
    event.dataTransfer?.setData('text/plain', this.dragSource);
  }
  permitirSoltarCampo(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
  soltarGrupo(id: string, event: DragEvent) {
    this.permitirSoltarCampo(event);
  }
  soltarCampo(groupId: string | null, before: string | null, event: DragEvent) {
    this.permitirSoltarCampo(event);
    const source = this.dragSource;
    this.dragSource = '';
    if (!source.startsWith('field:')) return;
    const path = source.slice(6),
      key = this.obterChaveDaPropriedade(path),
      prefix = (this.activeContainerPath || '') + '/properties/';
    if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/')) return;
    this.aplicarAlteracao((root) => {
      const node = obterNoSchema(root, this.activeContainerPath);
      if (!node?.properties || !node.properties[key]) return;
      const keys = Object.keys(node.properties).filter((k) => k !== key),
        i = before ? keys.indexOf(before) : -1;
      if (i < 0) keys.push(key);
      else keys.splice(i, 0, key);
      node.properties = Object.fromEntries(keys.map((k) => [k, node.properties![k]]));
    });
  }
  get camposVisiveis() {
    const prefix = this.activeContainerPath
      ? this.activeContainerPath + '/properties/'
      : '/properties/';
    return this.rows.filter(
      (row) => row.path.startsWith(prefix) && !row.path.slice(prefix.length).includes('/'),
    );
  }
  get tituloDoObjetoAtual(): string {
    return this.activeContainerPath
      ? obterNoSchema(this.schema, this.activeContainerPath)?.title || this.rotuloDoObjetoAtual
      : this.schema.title || 'Formulário sem título';
  }
  get descricaoDoObjetoAtual(): string {
    return this.activeContainerPath
      ? obterNoSchema(this.schema, this.activeContainerPath)?.description || ''
      : this.schema.description || '';
  }
  get rotuloDoObjetoAtual() {
    if (!this.activeContainerPath) return 'Raiz do schema';
    const node = obterNoSchema(this.schema, this.activeContainerPath);
    return node?.title || separarCaminho(this.activeContainerPath).at(-1) || 'Agrupador';
  }
  abrirObjeto(path: string) {
    const node = obterNoSchema(this.schema, path);
    if (!ehSchemaObjeto(node)) {
      this.error = 'Só é possível abrir um agrupador do tipo objeto.';
      return;
    }
    this.containerHistory.push(this.activeContainerPath);
    this.activeContainerPath = path;
    this.selectedGroupId = '';
    this.error = '';
  }
  alternarMenuDeCampos() {
    this.showAddMenu = !this.showAddMenu;
  }
  abrirGrupoSelecionado() {
    this.abrirObjeto(this.selectedPath);
  }
  abrirItensDaLista() {
    if (
      !this.campoSelecionado ||
      this.obterTipoDeEdicao(this.campoSelecionado) !== 'array' ||
      this.listas.obterTipoDoItemDaLista(this.campoSelecionado) !== 'object'
    )
      return;
    this.abrirObjeto(this.selectedPath + '/items');
  }
  voltarAoObjetoPai() {
    this.selectedGroupId = '';
    this.activeContainerPath = this.containerHistory.pop() || '';
  }
  ehListaDeObjetos(node: Schema): boolean {
    return (
      this.obterTipoDeEdicao(node) === 'array' &&
      !!node.items &&
      typeof node.items === 'object' &&
      !Array.isArray(node.items) &&
      ehSchemaObjeto(node.items as Schema)
    );
  }
  obterCaminhoDasPropriedades(path: string): string {
    const node = obterNoSchema(this.schema, path);
    return node && this.ehListaDeObjetos(node) ? path + '/items' : path;
  }
  listarPropriedadesDoObjeto(path: string) {
    const node = obterNoSchema(this.schema, path);
    return Object.entries(node?.properties || {}).map(([key, schema]) => ({
      path: path + '/properties/' + escaparSegmento(key),
      label: key,
      schema: schema as Schema,
    }));
  }
  propriedadeEhObrigatoria(path: string, key: string): boolean {
    return !!obterNoSchema(this.schema, path)?.required?.includes(key);
  }
  adicionarPropriedadeNoObjeto(path: string, type: string) {
    if (!this.inlineTypes.some((item) => item.type === type)) return;
    this.preservarRolagem(() =>
      this.aplicarAlteracao((root) => {
        const node = obterNoSchema(root, path);
        if (!node || !ehSchemaObjeto(node)) return;
        node.properties ??= {};
        let key = 'campo',
          i = 2;
        while (Object.prototype.hasOwnProperty.call(node.properties, key)) key = 'campo' + i++;
        node.properties[key] = criarSchemaDoCampo(type, key);
        this.selectedPath = path + '/properties/' + escaparSegmento(key);
        this.selectedGroupId = '';
        this.editingForm = false;
      }),
    );
  }

  adicionarPropriedadeDoTipo(type: string) {
    if (type === 'condition') {
      this.condicoes.adicionarCondicao();
      return;
    }
    const targetPath = this.activeContainerPath;
    const node = obterNoSchema(this.schema, targetPath);
    if (!node || !ehSchemaObjeto(node)) {
      this.error = 'Selecione um objeto para adicionar campos.';
      return;
    }
    this.error = '';
    this.aplicarAlteracao((root) => {
      const target = obterNoSchema(root, targetPath)!;
      target.properties ??= {};
      let key = 'campo',
        i = 2;
      while (Object.prototype.hasOwnProperty.call(target.properties, key)) key = 'campo' + i++;
      target.properties[key] = criarSchemaDoCampo(type, key);
      if (type === 'object') target.properties[key].description = 'Objeto JSON.';
      this.selectedPath = targetPath + '/properties/' + escaparSegmento(key);
      this.selectedGroupId = '';
    });
    this.showAddMenu = false;
  }
  newDefinitionName = '';
  newPatternName = '';
  get possuiPropriedadeSelecionada() {
    const parts = separarCaminho(this.selectedPath);
    return parts.length >= 2 && parts[parts.length - 2] === 'properties';
  }
  listarEntradas(value: any): [string, any][] {
    return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
  }
  escaparCaminho(value: string) {
    return escaparSegmento(value);
  }
  get nomesDasDefinicoes() {
    return Object.keys(this.schema?.['$defs'] || {});
  }
  ehReferenciaLocal(ref: string) {
    return this.nomesDasDefinicoes.some((name) => ref === '#/$defs/' + escaparSegmento(name));
  }
  obterModoDePropriedadesAdicionais(node: Schema) {
    return node.additionalProperties === false
      ? 'deny'
      : node.additionalProperties && typeof node.additionalProperties === 'object'
        ? 'schema'
        : 'allow';
  }
  definirModoDePropriedadesAdicionais(mode: string) {
    this.aplicarAlteracao((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (mode === 'deny') node.additionalProperties = false;
      else if (mode === 'schema') node.additionalProperties = { type: 'string' };
      else node.additionalProperties = true;
    });
  }
  definirReferencia(ref: string) {
    this.aplicarAlteracao((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (ref) node['$ref'] = ref;
      else delete node['$ref'];
    });
  }
  adicionarDefinicao(kind: '$defs' | 'patternProperties') {
    const name = kind === '$defs' ? 'Definicao' : '^campo_';
    const proposed = kind === '$defs' ? this.newDefinitionName : this.newPatternName;
    if (!proposed.trim()) {
      this.error = 'Informe um nome.';
      return;
    }
    const key = proposed.trim();
    if (!key) {
      this.error = 'Informe um nome.';
      return;
    }
    if (kind === 'patternProperties') {
      try {
        new RegExp(key);
      } catch {
        this.error = 'Padrão regex inválido.';
        return;
      }
    }
    const node = this.campoSelecionado!;
    if (node[kind] && Object.prototype.hasOwnProperty.call(node[kind], key)) {
      this.error = 'Nome já utilizado.';
      return;
    }
    this.error = '';
    this.aplicarAlteracao((root) => {
      const target = this.obterCampoSelecionado(root)!;
      target[kind] ??= {};
      target[kind][key] = { type: 'string' };
      this.selectedPath += '/' + kind + '/' + escaparSegmento(key);
    });
    if (kind === '$defs') this.newDefinitionName = '';
    else this.newPatternName = '';
  }
  removerDefinicao(kind: '$defs' | 'patternProperties', key: string) {
    this.error = '';
    if (kind === '$defs') {
      const reference = '#/$defs/' + escaparSegmento(key);
      const usesReference = (value: any): boolean => {
        if (!value || typeof value !== 'object') return false;
        if (value['$ref'] === reference) return true;
        return Object.values(value).some(usesReference);
      };
      if (usesReference(this.schema)) {
        this.error = 'A definição possui referências. Remova os vínculos primeiro.';
        return;
      }
    }
    this.aplicarAlteracao((root) => {
      const node = this.obterCampoSelecionado(root)!;
      delete node[kind]?.[key];
      if (node[kind] && !Object.keys(node[kind]).length) delete node[kind];
    });
  }
  ngOnChanges(_changes: SimpleChanges) {
    this.atualizarArvore();
  }
  private obterNo(root: Schema, path: string): Schema | undefined {
    return obterNoSchema(root, path);
  }
  get campoSelecionado() {
    return this.obterNo(this.schema, this.selectedPath);
  }
  obterTipoDeEdicao(node: Schema): string {
    return Array.isArray(node.type) ? node.type.find((tipo: string) => tipo !== 'null') : node.type;
  }
  obterSchemaDeEdicao(node: Schema): Schema {
    return Array.isArray(node.type) ? { ...node, type: this.obterTipoDeEdicao(node) } : node;
  }
  campoPermiteNulo(node: Schema) {
    return Array.isArray(node.type) && node.type.includes('null');
  }
  definirCampoAnulavel(enabled: boolean) {
    this.aplicarAlteracao((root) => {
      const node = this.obterCampoSelecionado(root);
      if (!node) return;
      const types = Array.isArray(node.type)
        ? node.type.filter((type: string) => type !== 'null')
        : node.type
          ? [node.type]
          : [];
      node.type = enabled ? [...types, 'null'] : types.length === 1 ? types[0] : types;
      if (Array.isArray(node.enum)) {
        const opcoes = node.enum.map((valor: unknown, indice: number) => ({
          valor,
          rotulo: node['x-enumLabels']?.[indice] ?? String(valor),
        }));
        const proxima = enabled
          ? opcoes.some((opcao: { valor: unknown }) => opcao.valor === null)
            ? opcoes
            : [...opcoes, { valor: null, rotulo: 'Nulo' }]
          : opcoes.filter((opcao: { valor: unknown }) => opcao.valor !== null);
        node.enum = proxima.map((opcao: { valor: unknown }) => opcao.valor);
        if (Array.isArray(node['x-enumLabels']))
          node['x-enumLabels'] = proxima.map((opcao: { rotulo: string }) => opcao.rotulo);
      }
    });
  }
  get nomeDoCampoSelecionado() {
    return separarCaminho(this.selectedPath).at(-1) || '';
  }
  get campoSelecionadoEhObrigatorio() {
    const parts = separarCaminho(this.selectedPath),
      name = parts.pop();
    if (parts.pop() !== 'properties') return false;
    const parent = obterNoSchema(this.schema, '/' + parts.map((p) => escaparSegmento(p)).join('/'));
    return !!name && !!parent?.required?.includes(name);
  }
  obterRotuloDoTipo(node: Schema) {
    return Array.isArray(node.type) ? node.type.join('|') : node.type || 'livre';
  }
  selecionarCampo(path: string) {
    this.editingForm = false;
    this.groupAddPickerOpen = false;
    this.selectedGroupId = '';
    this.showDeleteConfirmation = false;
    this.selectedPath = path;
    this.propriedades.propertyNameDraft = null;
    this.propriedades.propertyNameError = '';
    this.editorTab = 'property';
    this.error = '';
  }
  private atualizarArvore() {
    this.rows = listarNosSchema(this.schema);
    if (!this.obterNo(this.schema, this.selectedPath)) this.selectedPath = '';
    if (
      this.activeContainerPath &&
      !ehSchemaObjeto(obterNoSchema(this.schema, this.activeContainerPath))
    ) {
      this.activeContainerPath = '';
      this.containerHistory = [];
    }
  }
  private aplicarAlteracao(edit: (root: Schema) => void) {
    if (this.edicaoBloqueada) return;
    const next = structuredClone(this.schema);
    edit(next);

    if (this.editorModalOpen && this.editorDraft) {
      this.editorDraft = next;
      this.atualizarArvore();
      return;
    }
    this.persistedSchema = next;
    this.motivosDeBloqueio = avaliarCompatibilidadeDaConstrucao(next);
    this.atualizarArvore();
    this.schemaChange.emit(next);
  }
  private obterCampoSelecionado(root: Schema) {
    return obterNoSchema(root, this.selectedPath);
  }
  adicionarPropriedade() {
    this.error = '';
    const node = this.campoSelecionado;
    if (!node || !ehSchemaObjeto(node)) return;
    this.aplicarAlteracao((root) => {
      const target = this.obterCampoSelecionado(root)!;
      target.properties ??= {};
      let key = 'campo',
        i = 2;
      while (Object.prototype.hasOwnProperty.call(target.properties, key)) key = 'campo' + i++;
      target.properties[key] = criarSchemaDoCampo('string', key);
      this.selectedPath += '/properties/' + escaparSegmento(key);
    });
  }
  adicionarItens() {
    this.error = '';
    this.aplicarAlteracao((root) => {
      const node = this.obterCampoSelecionado(root)!;
      if (node.items === undefined) node.items = { type: 'string' };
      if (typeof node.items === 'object' && !Array.isArray(node.items))
        this.selectedPath += '/items';
    });
  }
}
