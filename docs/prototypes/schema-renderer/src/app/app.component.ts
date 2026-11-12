import { copiarSchemaParaClipboard, baixarSchema } from './features/builder/transferencia-schema';
import { compilarValidador, lerDocumentoSchema } from './core/schema/schema-validator';
import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldComponent } from './features/renderer/field/field.component';
import { SchemaBuilderComponent } from './features/builder/schema-builder.component';
import {
  Schema,
  ValidationIssue,
  criarValorInicial,
  ajustarValorAoSchema,
  obterProblemasDeValidacao,
} from './core/schema/schema-engine';
import { allSchemaExamples, allSchemas } from './data/schema-examples';
import { parameterKeyRequestSchema } from './data/parameter-key-request.schema';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, FieldComponent, SchemaBuilderComponent],
  styleUrl: './app.component.css',
  templateUrl: './app.component.html',
})
export class AppComponent {
  @HostListener('document:keydown.escape')
  fecharVisualizacoes() {
    this.previewOpen = false;
    this.schemaPreviewOpen = false;
  }

  area: 'home' | 'builder' | 'renderer' = 'home';
  activeTab = 1;
  builderTab: 'construction' | 'dev' | 'json' = 'construction';
  previewOpen = false;
  schemaPreviewOpen = false;
  builderSource = '';
  builderSchemaError = '';
  entrarNoConstrutor() {
    this.area = 'builder';
    this.builderTab = 'construction';
    this.criarNovoSchema();
    this.builderSource = JSON.stringify(this.schema, null, 2);
  }
  entrarNoRenderizador() {
    this.area = 'renderer';
    this.activeTab = 1;
    if (!this.valueError) this.atualizarPrevia();
  }
  selecionarAbaDoConstrutor(tab: 'construction' | 'dev') {
    this.builderTab = tab;
    if (tab === 'dev') this.atualizarPrevia();
  }
  private atualizarPrevia() {
    this.value = ajustarValorAoSchema(this.schema, this.value, this.schema);
    this.atualizarValidacaoEJson(true);
  }
  builderError = '';
  builderPreview = false;
  builderJson = true;
  schema: Schema = allSchemas['simple'];
  source = JSON.stringify(this.schema, null, 2);
  value: any = {};
  developerSource = '';
  errors: string[] = [];
  issues: ValidationIssue[] = [];
  parseError = '';
  valueError = '';
  developerValidated = false;
  schemaValidated = false;
  selectedExample = 'simple';
  schemaExamples = allSchemaExamples;

  constructor() {
    this.value = criarValorInicial(this.schema, this.schema);
    this.atualizarValidacaoEJson(true);
  }

  get descricaoDoExemploSelecionado() {
    return (
      this.schemaExamples.find((example) => example.id === this.selectedExample)?.description ||
      'Selecione um exemplo para ver o objetivo do schema e os pontos que devem ser validados.'
    );
  }

  abrirSchemaNoConstrutor() {
    try {
      const parsed = this.lerSchemaDoEditor();
      this.schema = structuredClone(parsed);
      this.builderSource = JSON.stringify(parsed, null, 2);
      this.builderSchemaError = '';
      this.builderError = '';
      this.area = 'builder';
    } catch (error) {
      this.builderError = this.mensagemDeErroDoSchema(error);
      this.area = 'renderer';
      this.activeTab = 1;
      this.parseError = this.builderError;
    }
  }

  schemaCopied = false;
  async copiarSchema() {
    try {
      await copiarSchemaParaClipboard(this.schema);
      this.schemaCopied = true;
    } catch {
      this.schemaCopied = false;
      this.builderError =
        'Não foi possível copiar automaticamente. Verifique as permissões do navegador.';
    }
  }
  exportarSchema() {
    baixarSchema(this.schema);
  }
  criarNovoSchema() {
    const applied = this.aoAlterarSchema({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Novo schema',
      type: 'object',
      properties: {},
      additionalProperties: false,
    });
    if (applied) {
      this.value = criarValorInicial(this.schema, this.schema);
      this.schemaCopied = false;
      this.previewOpen = false;
      this.schemaPreviewOpen = false;
      this.atualizarValidacaoEJson(true);
    }
  }
  aoAlterarSchema(next: Schema): boolean {
    try {
      compilarValidador(next);
      this.schema = next;
      this.source = JSON.stringify(next, null, 2);
      this.builderSource = JSON.stringify(next, null, 2);
      this.builderSchemaError = '';
      this.selectedExample = '';
      // Durante a construção, não reconciliar/validar o payload: os ramos da
      // condição podem estar incompletos e o formulário ainda não está em uso.
      if (this.builderTab === 'construction') {
        this.parseError = '';
        this.builderError = '';
        this.schemaValidated = true;
        this.valueError = '';
        this.developerValidated = false;
        return true;
      }
      this.value = ajustarValorAoSchema(next, this.value, next);
      this.parseError = '';
      this.builderError = '';
      this.schemaValidated = true;
      this.valueError = '';
      this.developerValidated = false;
      this.atualizarValidacaoEJson(true);
      return true;
    } catch (error) {
      this.builderError = this.mensagemDeErroDoSchema(error);
      return false;
    }
  }
  aoEditarSchemaDoConstrutor(text: string) {
    this.builderSource = text;
    try {
      const parsed = lerDocumentoSchema(text);
      this.schema = parsed;
      this.source = JSON.stringify(parsed, null, 2);
      this.selectedExample = '';
      this.value = criarValorInicial(parsed, parsed);
      this.builderSchemaError = '';
      this.builderError = '';
      this.parseError = '';
      this.valueError = '';
      this.developerValidated = false;
      this.schemaValidated = true;
      this.atualizarValidacaoEJson(true);
    } catch (error) {
      this.builderSchemaError = this.mensagemDeErroDoSchema(error);
      this.schemaValidated = false;
    }
  }
  validarSchemaDoConstrutor() {
    try {
      lerDocumentoSchema(this.builderSource);
      this.builderSchemaError = '';
      this.schemaValidated = true;
    } catch (error) {
      this.builderSchemaError = this.mensagemDeErroDoSchema(error);
      this.schemaValidated = false;
    }
  }
  formatarSchemaDoConstrutor() {
    try {
      const schema = lerDocumentoSchema(this.builderSource);
      this.builderSource = JSON.stringify(schema, null, 2);
      this.builderSchemaError = '';
      this.schemaValidated = true;
    } catch (error) {
      this.builderSchemaError = this.mensagemDeErroDoSchema(error);
      this.schemaValidated = false;
    }
  }
  carregarExemplo(id: string) {
    this.selectedExample = id;
    const next = id === 'parameterKeyRequest' ? parameterKeyRequestSchema : allSchemas[id];
    if (!next) return;
    this.schema = structuredClone(next);
    this.source = JSON.stringify(this.schema, null, 2);
    this.value = criarValorInicial(this.schema, this.schema);
    this.parseError = '';
    this.valueError = '';
    this.developerValidated = false;
    this.schemaValidated = false;
    this.atualizarValidacaoEJson(true);
  }

  aoEditarSchemaDoRenderizador(text: string) {
    this.source = text;
    try {
      const next = this.lerSchemaDoEditor();
      this.schema = next;
      this.selectedExample = '';
      this.value = criarValorInicial(next, next);
      this.parseError = '';
      this.valueError = '';
      this.developerValidated = false;
      this.schemaValidated = true;
      this.atualizarValidacaoEJson(true);
    } catch (error) {
      this.parseError = this.mensagemDeErroDoSchema(error);
      this.schemaValidated = false;
    }
  }
  validarDocumentoSchema() {
    try {
      this.lerSchemaDoEditor();
      this.parseError = '';
      this.schemaValidated = true;
    } catch (error) {
      this.parseError = this.mensagemDeErroDoSchema(error);
      this.schemaValidated = false;
    }
  }
  formatarDocumentoSchema() {
    try {
      const parsed = this.lerSchemaDoEditor();
      this.source = JSON.stringify(parsed, null, 2);
      this.parseError = '';
      this.schemaValidated = true;
    } catch (error) {
      this.parseError = this.mensagemDeErroDoSchema(error);
      this.schemaValidated = false;
    }
  }

  renderizarSchema() {
    try {
      const s = this.lerSchemaDoEditor();
      this.schema = s;
      this.selectedExample = '';
      this.value = criarValorInicial(s, s);
      this.parseError = '';
      this.valueError = '';
      this.developerValidated = false;
      this.schemaValidated = true;
      this.atualizarValidacaoEJson(true);
      this.activeTab = 2;
    } catch (error) {
      this.parseError = this.mensagemDeErroDoSchema(error);
      this.schemaValidated = false;
    }
  }

  aoAlterarValor(v: any) {
    if (this.valueError) return;
    this.value = ajustarValorAoSchema(this.schema, v, this.schema);
    this.valueError = '';
    this.developerValidated = false;
    this.atualizarValidacaoEJson(true);
  }
  aoEditarJsonDoValor(text: string) {
    this.developerSource = text;
    this.developerValidated = false;
    try {
      this.value = JSON.parse(text);
      this.valueError = '';
      this.atualizarValidacaoEJson(false);
    } catch (e) {
      this.valueError = this.mensagemDeErroDoJson(e);
      this.developerValidated = false;
    }
  }
  validarJsonDoValor() {
    try {
      this.value = JSON.parse(this.developerSource);
      this.valueError = '';
      this.developerValidated = true;
      this.atualizarValidacaoEJson(false);
    } catch (e) {
      this.valueError = this.mensagemDeErroDoJson(e);
      this.developerValidated = false;
    }
  }
  formatarJsonDoValor() {
    try {
      const parsed = JSON.parse(this.developerSource);
      this.developerSource = JSON.stringify(parsed, null, 2);
      this.value = parsed;
      this.valueError = '';
      this.developerValidated = true;
      this.atualizarValidacaoEJson(false);
    } catch (e) {
      this.valueError = this.mensagemDeErroDoJson(e);
      this.developerValidated = false;
    }
  }

  private lerSchemaDoEditor(): Schema {
    return lerDocumentoSchema(this.source);
  }
  private mensagemDeErroDoSchema(error: any) {
    return `JSON Schema inválido: ${error?.message || String(error)}`;
  }
  private mensagemDeErroDoJson(error: any) {
    return `JSON inválido: ${error?.message || String(error)}`;
  }
  abrirPreviaDoFormulario() {
    this.value = ajustarValorAoSchema(this.schema, this.value, this.schema);
    this.previewOpen = true;
    this.atualizarValidacaoEJson(true);
  }
  private atualizarValidacaoEJson(updateDeveloperSource: boolean) {
    if (updateDeveloperSource) this.developerSource = JSON.stringify(this.value, null, 2);
    this.issues = obterProblemasDeValidacao(this.schema, this.value);
    this.errors = this.issues.map((issue) => `${issue.path}: ${issue.message}`);
  }
}
