import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { obterTipos, type Schema } from '../../../core/schema/schema-engine';
import { EditorValorCondicaoComponent } from './editor-valor-condicao.component';
import {
  converterTextoDaCondicao,
  validarTipoDoValorCondicional,
  inferirTipoDaComparacao,
} from './conversao-valor-condicao';
import { escolherValorInicialDaCondicao } from './valores-condicao';
import { formatarValorAlternativa } from '../alternativas/valores-alternativas';
import { valoresJsonIguais } from '../../../core/schema/json-value';
import {
  COMPARACOES_NUMERICAS,
  criarComparacaoDaCondicao,
  lerComparacaoDaCondicao,
} from './comparacoes-condicao';
import { OPCOES_COMPARACAO_TEXTO } from './restricoes-texto-condicional';
import {
  criarCondicaoNoCaminho,
  expressaoEhGuiada,
  listarCamposDaExpressao,
  lerFolhaDaExpressao,
} from './expressoes-condicao';
@Component({
  selector: 'app-editor-expressao',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EditorValorCondicaoComponent,
    forwardRef(() => EditorExpressaoComponent),
  ],
  templateUrl: './editor-expressao.component.html',
  styleUrl: './editor-expressao.component.css',
})
export class EditorExpressaoComponent implements OnChanges {
  @Input() schema: Schema = {};
  @Input() objeto: Schema = {};
  @Input() raiz: Schema = {};
  @Output() alteracao = new EventEmitter<Schema>();
  caminho = '';
  operador = 'equals';
  valor = '';
  erro = '';
  private tipoEscolhido?: string;
  private valorOriginal: unknown;
  private usaValorTipado = false;
  private ultimaExpressao?: Schema;
  ngOnChanges() {
    if (this.ultimaExpressao && valoresJsonIguais(this.ultimaExpressao, this.schema)) return;
    this.ultimaExpressao = structuredClone(this.schema);
    const folha = lerFolhaDaExpressao(this.schema);
    if (!folha) return;
    const campo = this.campos.find(
      (item) => JSON.stringify(item.segmentos) === JSON.stringify(folha.segmentos),
    );
    if (!campo) return;
    this.caminho = campo.caminho;
    const comparacao = folha.comparacao ? lerComparacaoDaCondicao(folha.comparacao) : undefined;
    this.operador = comparacao?.operador || 'present';
    this.carregarValor(comparacao?.valor, campo.schema);
  }
  private carregarValor(valor: unknown, campo: Schema) {
    this.valorOriginal = valor;
    this.tipoEscolhido = inferirTipoDaComparacao(campo, valor);
    this.usaValorTipado = Array.isArray(campo.enum) && valor !== undefined;
    this.valor = formatarValorAlternativa(valor);
  }
  get definicao(): Schema {
    return this.campos.find((c) => c.caminho === this.caminho)?.schema || {};
  }
  get tipoAtivo(): string {
    return this.tipoEscolhido || inferirTipoDaComparacao(this.definicao, this.valorOriginal);
  }
  get valorAtual(): unknown {
    if (this.usaValorTipado) return this.valorOriginal;
    try {
      return converterTextoDaCondicao(this.definicao, this.valor, this.tipoAtivo);
    } catch {
      return undefined;
    }
  }
  definirTexto(texto: string) {
    this.valor = texto;
    this.usaValorTipado = false;
  }
  definirValor(valor: unknown) {
    try {
      const tipo = inferirTipoDaComparacao(this.definicao, valor);
      validarTipoDoValorCondicional(this.definicao, valor, tipo);
      this.carregarValor(valor, this.definicao);
      this.erro = '';
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
  definirTipo(tipo: string) {
    try {
      this.carregarValor(
        escolherValorInicialDaCondicao(this.definicao, this.raiz, tipo),
        this.definicao,
      );
      this.tipoEscolhido = tipo;
      this.operador = ['equals', 'different', 'present', 'absent'].includes(this.operador)
        ? this.operador
        : 'equals';
      this.erro = '';
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
  definirCampo(caminho: string) {
    this.caminho = caminho;
    this.tipoEscolhido = undefined;
    this.usaValorTipado = false;
    this.valorOriginal = undefined;
    if (!['present', 'absent'].includes(this.operador)) {
      try {
        this.carregarValor(
          escolherValorInicialDaCondicao(this.definicao, this.raiz),
          this.definicao,
        );
        this.erro = '';
      } catch (erro) {
        this.valor = '';
        this.erro = (erro as Error).message;
      }
    }
    if (
      ![
        'equals',
        'different',
        'present',
        'absent',
        ...this.operadores.map((opcao) => opcao.valor),
      ].includes(this.operador)
    )
      this.operador = 'equals';
  }

  private cacheObjeto?: Schema;
  private cacheRaiz?: Schema;
  private cacheCampos: ReturnType<typeof listarCamposDaExpressao> = [];
  get campos() {
    if (this.cacheObjeto !== this.objeto || this.cacheRaiz !== this.raiz) {
      this.cacheCampos = listarCamposDaExpressao(this.objeto, this.raiz);
      this.cacheObjeto = this.objeto;
      this.cacheRaiz = this.raiz;
    }
    return this.cacheCampos;
  }
  get guiada() {
    return expressaoEhGuiada(this.schema);
  }
  get grupo(): string {
    return this.schema.allOf ? 'allOf' : this.schema.anyOf ? 'anyOf' : '';
  }
  get operadores() {
    return this.tipoAtivo === 'string'
      ? OPCOES_COMPARACAO_TEXTO
      : ['integer', 'number'].includes(this.tipoAtivo)
        ? COMPARACOES_NUMERICAS
        : [];
  }
  private chavesFilhos: number[] = [];
  private proximaChave = 0;
  private alinharChaves() {
    const quantidade = this.grupo ? this.schema[this.grupo].length : 0;
    while (this.chavesFilhos.length < quantidade) this.chavesFilhos.push(this.proximaChave++);
    if (this.chavesFilhos.length > quantidade) this.chavesFilhos.length = quantidade;
  }
  readonly identificarFilho = (indice: number) => {
    this.alinharChaves();
    return this.chavesFilhos[indice];
  };
  trocarOperadorDoGrupo(chave: string) {
    if (!this.grupo || !['allOf', 'anyOf'].includes(chave) || !this.guiada) return;
    const copia = structuredClone(this.schema),
      filhos = copia[this.grupo];
    delete copia[this.grupo];
    copia[chave] = filhos;
    this.alteracao.emit(copia);
  }
  adicionarSubgrupo(chave: string) {
    if (!this.grupo || !['allOf', 'anyOf'].includes(chave) || !this.guiada) return;
    this.alinharChaves();
    this.chavesFilhos.push(this.proximaChave++);
    const copia = structuredClone(this.schema);
    copia[this.grupo].push({ [chave]: [structuredClone(copia[this.grupo][0])] });
    this.alteracao.emit(copia);
  }
  agrupar(chave: string) {
    this.alteracao.emit({ [chave]: [structuredClone(this.schema)] });
  }
  negar() {
    const anotacoes = Object.fromEntries(
      Object.entries(this.schema).filter(([key]) =>
        ['title', 'description', '$comment'].includes(key),
      ),
    );
    this.alteracao.emit(
      this.schema.not
        ? { ...this.schema.not, ...anotacoes }
        : { not: structuredClone(this.schema) },
    );
  }
  alterarNegacao(valor: Schema) {
    this.alteracao.emit({ ...this.schema, not: valor });
  }
  alterarFilho(chave: string, indice: number, valor: Schema) {
    const copia = structuredClone(this.schema);
    copia[chave][indice] = valor;
    this.alteracao.emit(copia);
  }
  removerFilho(chave: string, indice: number) {
    if (this.schema[chave].length <= 1) return;
    this.alinharChaves();
    this.chavesFilhos.splice(indice, 1);
    const copia = structuredClone(this.schema);
    copia[chave].splice(indice, 1);
    this.alteracao.emit(copia);
  }
  adicionarFilho(chave: string) {
    this.alinharChaves();
    this.chavesFilhos.push(this.proximaChave++);
    const copia = structuredClone(this.schema);
    copia[chave].push(structuredClone(copia[chave][0]));
    this.alteracao.emit(copia);
  }
  aplicarFolha() {
    try {
      const campo = this.campos.find((c) => c.caminho === this.caminho);
      if (!campo) throw new Error('Selecione o campo.');
      const presenca = ['present', 'absent'].includes(this.operador);
      const tipos = obterTipos(campo.schema);
      const valor = presenca
        ? undefined
        : this.usaValorTipado
          ? validarTipoDoValorCondicional(
              campo.schema,
              this.valorOriginal,
              inferirTipoDaComparacao(campo.schema, this.valorOriginal),
            )
          : converterTextoDaCondicao(campo.schema, this.valor, this.tipoAtivo);
      const comparacao = presenca
        ? undefined
        : criarComparacaoDaCondicao(this.operador, valor, tipos);
      this.alteracao.emit({
        ...Object.fromEntries(
          Object.entries(this.schema).filter(([key]) =>
            ['title', 'description', '$comment'].includes(key),
          ),
        ),
        ...criarCondicaoNoCaminho(campo.segmentos, comparacao, this.operador === 'absent'),
      });
      this.erro = '';
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
}
