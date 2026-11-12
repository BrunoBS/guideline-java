import {
  criarApresentacaoJson,
  LIMITE_PROFUNDIDADE_FORMULARIO,
} from '../../../core/schema/limites-apresentacao';
import { obterProblemasDeValidacao } from '../../../core/schema/schema-engine';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  combinarSchemas,
  criarValorInicial,
  obterRotuloDoSchema,
  obterTipoDoValor,
  obterTipoPrincipal,
  obterTiposNaoNulos,
  possuiUniaoDeTipos,
  resolverReferencia,
  resolverSchemaDoCampo,
  restringirTipoDoSchema,
  Schema,
  valorAtendeSchema,
} from '../../../core/schema/schema-engine';

import { CampoBooleanoComponent } from '../../campos/booleano/campo-booleano.component';
import { CampoBase } from '../../campos/compartilhado/campo-base';
import { CampoListaComponent } from '../../campos/lista/campo-lista.component';
import { CampoNumeroComponent } from '../../campos/numero/campo-numero.component';
import { CampoObjetoComponent } from '../../campos/objeto/campo-objeto.component';
import { CampoTextoComponent } from '../../campos/texto/campo-texto.component';
@Component({
  selector: 'app-field',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CampoTextoComponent,
    CampoNumeroComponent,
    CampoBooleanoComponent,
    CampoObjetoComponent,
    CampoListaComponent,
  ],
  templateUrl: './field.component.html',
})
export class FieldComponent extends CampoBase {
  chosenType?: string;

  private selectedStructuralAlternative?: number;

  get schemaResolvido() {
    if (this.path.split('/').length - 1 >= LIMITE_PROFUNDIDADE_FORMULARIO)
      return criarApresentacaoJson(
        this.schema,
        'Limite de profundidade do formulário atingido. Continue a edição deste valor em JSON.',
      );
    return resolverSchemaDoCampo(this.schema, this.value, this.root);
  }

  obterSchemaDeApresentacao(s: Schema): Schema {
    return possuiUniaoDeTipos(s) ? restringirTipoDoSchema(s, this.obterTipoAtivo(s), this.root) : s;
  }

  obterTipoAtivo(s: Schema): string {
    const allowed = obterTiposNaoNulos(s);
    if (this.chosenType && allowed.includes(this.chosenType)) return this.chosenType;
    const current = obterTipoDoValor(this.value);
    if (allowed.includes(current)) return current;
    if (current === 'integer' && allowed.includes('number') && !allowed.includes('integer'))
      return 'number';
    return allowed[0] || obterTipoPrincipal(s);
  }

  alterarTipo(type: string, s: Schema) {
    this.chosenType = type;
    this.emitirValor(criarValorInicial(restringirTipoDoSchema(s, type, this.root), this.root));
  }

  listarOpcoesDeComposicao(): Schema[] {
    const s: any = this.schema || {};
    return [...(s.oneOf || []), ...(s.anyOf || [])].map((option: any) =>
      resolverReferencia(option, this.root),
    );
  }

  possuiOpcoesDeComposicao() {
    return this.listarOpcoesDeComposicao().length > 1;
  }

  obterIndiceDaAlternativaAtiva() {
    const options = this.listarOpcoesDeComposicao();
    if (
      this.listarAlternativasEstruturais() &&
      this.selectedStructuralAlternative !== undefined &&
      this.selectedStructuralAlternative < options.length
    )
      return this.selectedStructuralAlternative;
    const index = options.findIndex((option) => valorAtendeSchema(option, this.value, this.root));
    return index >= 0 ? index : 0;
  }

  obterRotuloDaAlternativa(option: Schema, index: number) {
    return obterRotuloDoSchema(option, index, this.root);
  }

  opcaoAtendeSchema(schema: Schema, valor: unknown): boolean {
    return valorAtendeSchema(schema, valor, this.root);
  }
  selecionarAlternativa(index: number) {
    const options = this.listarOpcoesDeComposicao();
    const choice = Number(index);
    const option = options[choice];
    if (!option) return;
    const structural = this.listarAlternativasEstruturais();
    if (structural) {
      this.selectedStructuralAlternative = choice;
      const selected = structural[choice];
      const relevant = new Set<string>([
        ...(selected.required || []),
        ...Object.keys(selected.properties || {}),
      ]);
      const exclusive = new Set<string>();
      for (const variant of structural) {
        for (const key of variant.required || []) exclusive.add(key);
        for (const key of this.listarCamposEstruturaisProibidos(variant)) exclusive.add(key);
      }
      const next: Record<string, any> = {};
      for (const [key, value] of Object.entries(this.valorObjeto)) {
        if (
          (!exclusive.has(key) || relevant.has(key)) &&
          !this.listarCamposEstruturaisProibidos(selected).has(key) &&
          value !== undefined
        )
          next[key] = value;
      }
      this.chosenType = undefined;
      this.emitirValor(next);
      return;
    }
    this.selectedStructuralAlternative = undefined;
    const raw: any = { ...(this.schema || {}) };
    delete raw.oneOf;
    delete raw.anyOf;
    const composed = combinarSchemas(raw, option);
    this.chosenType = undefined;
    this.emitirValor(criarValorInicial(composed, this.root));
  }

  get diagnosticosDeAlternativas() {
    const opcoes = this.schema?.oneOf;
    if (!Array.isArray(opcoes)) return [];
    const resultados = opcoes.map((opcao: Schema, i: number) => ({
      titulo: opcao?.title || 'Alternativa ' + (i + 1),
      problemas: obterProblemasDeValidacao(
        typeof opcao === 'boolean' ? opcao : { ...opcao, $defs: this.root.$defs || {} },
        this.value,
      ),
    }));
    const validas = resultados.filter((item) => !item.problemas.length);
    return validas.length === 1 ? [] : resultados;
  }
  possuiPropriedades(s: Schema) {
    return Object.keys(s.properties || {}).length > 0;
  }

  obterExemploDeValorLivre() {
    return 'Ex.: "texto", 123, true, null, objeto JSON ou lista JSON';
  }

  aoEditarValorLivre(input: HTMLTextAreaElement) {
    try {
      this.emitirValor(JSON.parse(input.value));
      input.setCustomValidity('');
    } catch {
      input.setCustomValidity('JSON inválido');
      input.reportValidity();
    }
  }
}
