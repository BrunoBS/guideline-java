import { verificarReferenciasAoNo } from './manutencao-referencias';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { obterTipos, type Schema } from '../../core/schema/schema-engine';
import { compilarValidador } from '../../core/schema/schema-validator';
import { obterNoSchema } from './estrutura-builder';
@Component({
  selector: 'app-editor-estruturas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-estruturas.component.html',
  styleUrl: './editor-estruturas.component.css',
})
export class EditorEstruturasComponent implements OnChanges {
  @Input() schema: Schema = {};
  @Input() caminho = '';
  @Output() alteracao = new EventEmitter<(root: Schema) => void>();
  gatilho = '';
  dependente = '';
  padrao = '';
  tipo = 'string';
  erro = '';
  tipos = ['string', 'integer', 'number', 'boolean', 'object', 'array', 'null'];
  private rascunhos = new Map<string, { origem: string; texto: string }>();
  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['caminho'] &&
      changes['caminho'].previousValue !== changes['caminho'].currentValue
    ) {
      this.rascunhos.clear();
      this.gatilho = '';
      this.dependente = '';
      this.padrao = '';
      this.erro = '';
    }
  }
  get ehObjeto() {
    return obterTipos(this.node).includes('object');
  }
  get ehLista() {
    return obterTipos(this.node).includes('array');
  }
  identificarEntrada(_indice: number, entrada: { key: string }) {
    return entrada.key;
  }
  identificarPosicao(indice: number) {
    return indice;
  }
  textoDoRascunho(chave: string, origem: string): string {
    const atual = this.rascunhos.get(chave);
    if (!atual) {
      this.rascunhos.set(chave, { origem, texto: origem });
      return origem;
    }
    if (atual.origem !== origem) {
      let aplicado = atual.texto === origem;
      if (/^(dependentSchemas:|patternProperties:|prefixItems:|contains$)/.test(chave)) {
        try {
          aplicado = JSON.stringify(JSON.parse(atual.texto)) === JSON.stringify(JSON.parse(origem));
        } catch {}
      }
      if (atual.texto === atual.origem || aplicado) atual.texto = origem;
      atual.origem = origem;
    }
    return atual.texto;
  }
  editarRascunho(chave: string, texto: string) {
    const anterior = this.rascunhos.get(chave) || { origem: '', texto: '' };
    anterior.texto = texto;
    this.rascunhos.set(chave, anterior);
  }
  private deslocarRascunhosDePosicoes(indice: number) {
    const deslocados = new Map<string, { origem: string; texto: string }>();
    for (const [key, rascunho] of this.rascunhos) {
      const encontrado = /^prefixItems:(\d+)$/.exec(key);
      if (!encontrado) {
        deslocados.set(key, rascunho);
        continue;
      }
      const posicao = Number(encontrado[1]);
      if (posicao !== indice)
        deslocados.set('prefixItems:' + (posicao > indice ? posicao - 1 : posicao), rascunho);
    }
    this.rascunhos = deslocados;
  }
  get node(): Schema {
    return obterNoSchema(this.schema, this.caminho) || {};
  }
  get campos() {
    return Object.keys(this.node.properties || {});
  }
  json(valor: any) {
    return JSON.stringify(valor, null, 2);
  }
  entradas(chave: string): { key: string; value: any }[] {
    return Object.entries(this.node[chave] || {}).map(([key, value]) => ({ key, value }));
  }
  private aplicar(editar: (node: Schema) => void) {
    try {
      const copia = structuredClone(this.schema);
      const node = obterNoSchema(copia, this.caminho);
      if (!node) throw new Error('Selecione um schema.');
      editar(node);
      compilarValidador(copia);
      const caminho = this.caminho;
      this.alteracao.emit((root) => editar(obterNoSchema(root, caminho)!));
      this.erro = '';
      return true;
    } catch (erro) {
      this.erro = (erro as Error).message;
      return false;
    }
  }
  adicionarDependencia() {
    if (
      !this.campos.includes(this.gatilho) ||
      !this.campos.includes(this.dependente) ||
      this.gatilho === this.dependente
    ) {
      this.erro = 'Selecione campos distintos.';
      return;
    }
    const gatilho = this.gatilho,
      dependente = this.dependente;
    this.aplicar((node) => {
      node.dependentRequired ??= {};
      node.dependentRequired[gatilho] = [
        ...new Set([...(node.dependentRequired[gatilho] || []), dependente]),
      ];
    });
  }
  definirSchemaDependente(texto: string) {
    if (!this.campos.includes(this.gatilho)) {
      this.erro = 'Selecione o campo que ativa a dependência.';
      return;
    }
    this.definirEntradaJson('dependentSchemas', this.gatilho, texto);
  }
  definirEntradaJson(chave: string, key: string, texto: string) {
    try {
      const valor = JSON.parse(texto);
      this.aplicar((node) => {
        node[chave] ??= {};
        node[chave] = Object.fromEntries([
          ...Object.entries(node[chave]).filter(([chaveAtual]) => chaveAtual !== key),
          [key, valor],
        ]);
      });
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
  removerEntrada(chave: string, key: string) {
    const aplicado = this.aplicar((node) => {
      delete node[chave]?.[key];
      if (!Object.keys(node[chave] || {}).length) delete node[chave];
    });
    if (aplicado) this.rascunhos.delete(chave + ':' + key);
  }
  definirNomes(padrao: string) {
    try {
      new RegExp(padrao);
      this.aplicar((node) => {
        if (typeof node.propertyNames === 'boolean')
          throw new Error('Schema booleano de nomes preservado. Edite em Para Dev.');
        if (padrao) node.propertyNames = { ...node.propertyNames, pattern: padrao };
        else if (node.propertyNames) {
          delete node.propertyNames.pattern;
          if (!Object.keys(node.propertyNames).length) delete node.propertyNames;
        }
      });
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
  adicionarPadrao() {
    try {
      new RegExp(this.padrao);
      if (!this.padrao) throw new Error('Informe o padrão.');
      if (Object.hasOwn(this.node.patternProperties || {}, this.padrao))
        throw new Error('Padrão já cadastrado.');
      this.definirEntradaJson(
        'patternProperties',
        this.padrao,
        JSON.stringify({ type: this.tipo }),
      );
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
  adicionarPosicao() {
    const tipo = this.tipo;
    this.aplicar((node) => {
      node.prefixItems ??= [];
      node.prefixItems.push({ type: tipo });
    });
  }
  definirPosicao(indice: number, texto: string) {
    try {
      const valor = JSON.parse(texto);
      this.aplicar((node) => {
        node.prefixItems[indice] = valor;
      });
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
  removerPosicao(indice: number) {
    const erro = verificarReferenciasAoNo(this.schema, this.caminho + '/prefixItems');
    if (erro) {
      this.erro = erro;
      return;
    }
    const aplicado = this.aplicar((node) => {
      node.prefixItems.splice(indice, 1);
      if (!node.prefixItems.length) delete node.prefixItems;
    });
    if (aplicado) this.deslocarRascunhosDePosicoes(indice);
  }
  definirItens(modo: string) {
    this.aplicar((node) => {
      if (modo === 'proibir') node.items = false;
      else if (node.items === false) node.items = true;
    });
  }
  definirContains(texto: string, minimo: string, maximo: string) {
    try {
      const contem = texto.trim() ? JSON.parse(texto) : undefined;
      const min = minimo.trim() ? Number(minimo) : undefined,
        max = maximo.trim() ? Number(maximo) : undefined;
      if (
        [min, max].some((n) => n !== undefined && (!Number.isInteger(n) || n < 0)) ||
        (min !== undefined && max !== undefined && min > max)
      )
        throw new Error('Limites de correspondências inválidos.');
      this.aplicar((node) => {
        if (contem === undefined) {
          delete node.contains;
          delete node.minContains;
          delete node.maxContains;
        } else {
          node.contains = contem;
          if (min === undefined) delete node.minContains;
          else node.minContains = min;
          if (max === undefined) delete node.maxContains;
          else node.maxContains = max;
        }
      });
    } catch (erro) {
      this.erro = (erro as Error).message;
    }
  }
}
