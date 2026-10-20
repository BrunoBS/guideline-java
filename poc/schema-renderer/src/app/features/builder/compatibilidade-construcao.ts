import type { Schema } from '../../core/schema/schema-engine';
import {
  expressaoEhGuiada,
  expressaoEhSimplesParaNegocio,
} from '../regras/condicoes/expressoes-condicao';
import { lerComparacaoDaCondicao } from '../regras/condicoes/comparacoes-condicao';

export interface MotivoDeBloqueio {
  caminho: string;
  mensagem: string;
}
const anotacoes = ['title', 'description', '$comment', 'examples'];
const comuns = [...anotacoes, 'type', 'x-ui', 'x-enumLabels'];
const porTipo: Record<string, string[]> = {
  string: ['enum', 'minLength', 'maxLength', 'pattern', 'format'],
  integer: ['enum', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'],
  number: ['enum', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'],
  boolean: [],
  object: [
    'properties',
    'required',
    'additionalProperties',
    'minProperties',
    'maxProperties',
    'allOf',
    'oneOf',
  ],
  array: ['items', 'minItems', 'maxItems', 'uniqueItems'],
};
const objeto = (valor: any): valor is Schema =>
  !!valor && typeof valor === 'object' && !Array.isArray(valor);
const escapar = (valor: string) => valor.replace(/~/g, '~0').replace(/\//g, '~1');

/** Perfil de autoria visual. Não valida JSON Schema e nunca transforma o documento. */
export function avaliarCompatibilidadeDaConstrucao(schema: Schema): MotivoDeBloqueio[] {
  const motivos: MotivoDeBloqueio[] = [];
  const avisar = (caminho: string, mensagem: string) => {
    if (motivos.length < 40) motivos.push({ caminho: caminho || '/', mensagem });
  };
  const chaves = (node: Schema, permitidas: string[], caminho: string) => {
    for (const chave of Object.keys(node))
      if (!permitidas.includes(chave))
        avisar(
          `${caminho}/${escapar(chave)}`,
          `O recurso “${chave}” precisa ser editado no Para Dev.`,
        );
  };
  function conferirCampos(node: Schema, origem: Schema, caminho: string) {
    for (const campo of node.required || [])
      if (!Object.hasOwn(origem.properties || {}, campo))
        avisar(caminho, `O campo “${campo}” não está declarado neste objeto.`);
  }
  function conferirComparacao(restricao: Schema, destino: Schema | undefined, caminho: string) {
    const comparacao = lerComparacaoDaCondicao(restricao);
    if (!comparacao || !destino) return;
    const tipos = Array.isArray(destino.type) ? destino.type : [destino.type];
    const { operador, valor } = comparacao;
    if (['greater', 'greaterOrEqual', 'less', 'lessOrEqual'].includes(operador)) {
      if (!tipos.some((tipo: string) => ['integer', 'number'].includes(tipo)))
        avisar(caminho, 'A comparação numérica não possui controle para este tipo de campo.');
    } else if (!['equals', 'different'].includes(operador)) {
      if (!tipos.includes('string'))
        avisar(caminho, 'A comparação de texto exige um campo de texto.');
    } else {
      const tipoValor = valor === null ? 'null' : Array.isArray(valor) ? 'array' : typeof valor;
      if (
        !tipos.includes(tipoValor) &&
        !(tipoValor === 'number' && Number.isInteger(valor) && tipos.includes('integer'))
      )
        avisar(caminho, 'O valor da comparação não corresponde ao tipo do campo na origem.');
      if (
        destino.enum &&
        !destino.enum.some((opcao: unknown) => JSON.stringify(opcao) === JSON.stringify(valor))
      )
        avisar(caminho, 'O valor da comparação não está entre as opções do campo na origem.');
    }
  }
  function expressao(node: Schema, origem: Schema, caminho: string) {
    const cabeNoEditor = (atual: any, nivel = 0): boolean => {
      if (nivel > 10) return false;
      if (!objeto(atual)) return true;
      return (
        ['allOf', 'anyOf'].every(
          (chave) =>
            !Array.isArray(atual[chave]) ||
            atual[chave].every((filho: any) => cabeNoEditor(filho, nivel + 1)),
        ) &&
        (!atual.not || cabeNoEditor(atual.not, nivel + 1)) &&
        Object.values(atual.properties || {}).every((filho) => cabeNoEditor(filho, nivel + 1))
      );
    };
    if (!cabeNoEditor(node)) {
      avisar(caminho, 'A condição excede os 10 níveis da edição visual.');
      return;
    }
    if (!expressaoEhGuiada(node)) {
      avisar(caminho, 'Esta condição não pode ser representada pelos operadores visuais.');
      return;
    }
    if (!expressaoEhSimplesParaNegocio(node)) {
      avisar(
        caminho,
        'A Construção permite uma lista de condições combinadas por E ou OU. Grupos aninhados e inversão da expressão devem ser editados no Para Dev.',
      );
      return;
    }
    function conferir(atual: Schema, base: Schema) {
      for (const chave of ['allOf', 'anyOf'])
        if (atual[chave]) atual[chave].forEach((filho: Schema) => conferir(filho, base));
      if (atual.not) conferir(atual.not, base);
      conferirCampos(atual, base, caminho);
      for (const [campo, filho] of Object.entries(atual.properties || {})) {
        const destino = base.properties?.[campo];
        if (!objeto(destino)) {
          avisar(caminho, `A condição usa o campo “${campo}”, que não está declarado.`);
          continue;
        }
        if (!lerComparacaoDaCondicao(filho)) conferir(filho as Schema, destino);
        else conferirComparacao(filho as Schema, destino, caminho);
      }
    }
    conferir(node, origem);
  }
  function ramo(node: any, origem: Schema, caminho: string) {
    if (!objeto(node)) {
      avisar(caminho, 'Ramos booleanos precisam ser editados no Para Dev.');
      return;
    }
    chaves(node, [...anotacoes, 'properties', 'required'], caminho);
    conferirCampos(node, origem, caminho);
    for (const [campo, valor] of Object.entries(node.properties || {})) {
      const local = `${caminho}/properties/${escapar(campo)}`;
      if (!Object.hasOwn(origem.properties || {}, campo))
        avisar(local, 'Declare o campo na origem antes de usá-lo em um ramo.');
      if (!objeto(valor)) {
        avisar(local, 'Esta restrição não possui edição visual.');
        continue;
      }
      const restricao = Object.fromEntries(
        Object.entries(valor).filter(([key]) => ![...anotacoes, 'x-ui', 'type'].includes(key)),
      );
      if (Object.keys(restricao).length && !lerComparacaoDaCondicao(restricao))
        avisar(
          local,
          'O ramo permite comparação de valor ou texto; outras restrições exigem o Para Dev.',
        );
      conferirComparacao(restricao, origem.properties?.[campo], local);
      if (valor['x-ui'] && Object.keys(valor['x-ui']).some((key) => key !== 'visible'))
        avisar(local, 'Configuração visual avançada neste ramo.');
    }
  }
  function alternativas(opcoes: any, origem: Schema, caminho: string) {
    if (!Array.isArray(opcoes) || opcoes.length < 2 || opcoes.some((opcao) => !objeto(opcao))) {
      avisar(caminho, 'As alternativas visuais precisam de pelo menos dois conjuntos de campos.');
      return;
    }
    if (opcoes.some((opcao) => opcao.properties)) {
      avisar(
        caminho,
        'Alternativas por valor devem ser editadas no Para Dev. Para condicionar campos por valor na Construção, use Quando / Então / Caso contrário.',
      );
      return;
    }
    for (const [indice, opcao] of opcoes.entries()) {
      const local = `${caminho}/${indice}`;
      chaves(opcao, [...anotacoes, 'required', 'not'], local);
      conferirCampos(opcao, origem, local);
      if (opcao.not) {
        const proibidos =
          Object.keys(opcao.not).length === 1 && opcao.not.anyOf ? opcao.not.anyOf : [opcao.not];
        if (
          !Array.isArray(proibidos) ||
          !proibidos.length ||
          proibidos.some(
            (item: any) =>
              !objeto(item) ||
              Object.keys(item).length !== 1 ||
              !Array.isArray(item.required) ||
              item.required.length !== 1,
          )
        )
          avisar(
            local,
            'A proibição desta alternativa não corresponde a um conjunto de campos visual.',
          );
        else proibidos.forEach((item: Schema) => conferirCampos(item, origem, local));
      }
    }
  }
  function visitar(node: any, caminho: string, profundidade: number) {
    if (profundidade > 20) {
      avisar(caminho, 'A estrutura excede os 20 níveis da edição visual.');
      return;
    }
    if (!objeto(node)) {
      avisar(caminho, 'Schemas booleanos precisam ser editados no Para Dev.');
      return;
    }
    const tipos = Array.isArray(node.type)
      ? node.type.filter((tipo: string) => tipo !== 'null')
      : [node.type];
    const tipo = tipos.length === 1 ? tipos[0] : undefined;
    if (typeof tipo !== 'string' || !porTipo[tipo]) {
      avisar(
        caminho,
        'Use um tipo explícito por campo, opcionalmente com null. Uniões de vários tipos e campos sem tipo ficam no Para Dev.',
      );
      return;
    }
    if (!caminho && (tipo !== 'object' || Array.isArray(node.type)))
      avisar('/', 'A Construção trabalha com um objeto na raiz.');
    chaves(node, [...comuns, ...porTipo[tipo], ...(!caminho ? ['$schema'] : [])], caminho);
    if (
      node.format &&
      ![
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
      ].includes(node.format)
    )
      avisar(`${caminho}/format`, 'Este formato não está disponível no seletor visual.');
    if (node['x-ui']) {
      const permitidas = [
        'options',
        'savedOptions',
        'allowEmpty',
        ...(tipo === 'array' ? ['widget'] : []),
      ];
      if (
        tipo === 'array' &&
        node['x-ui'].widget &&
        !['list', 'checkboxes', 'multiselect'].includes(node['x-ui'].widget)
      )
        avisar(
          `${caminho}/x-ui/widget`,
          'Este controle de lista não está disponível na Construção.',
        );
      if (
        !objeto(node['x-ui']) ||
        Object.keys(node['x-ui']).some((key) => !permitidas.includes(key))
      )
        avisar(`${caminho}/x-ui`, 'Esta configuração visual não está disponível na Construção.');
    }
    if (tipo === 'object') {
      conferirCampos(node, node, caminho);
      if (node.additionalProperties !== undefined && typeof node.additionalProperties !== 'boolean')
        avisar(
          `${caminho}/additionalProperties`,
          'Regras para propriedades adicionais precisam do Para Dev.',
        );
      for (const [campo, filho] of Object.entries(node.properties || {}))
        visitar(filho, `${caminho}/properties/${escapar(campo)}`, profundidade + 1);
      for (const [indice, regra] of (node.allOf || []).entries()) {
        const local = `${caminho}/allOf/${indice}`;
        if (!objeto(regra) || !regra.if || (!regra.then && !regra.else)) {
          avisar(
            local,
            'Interseções gerais (allOf) precisam do Para Dev. A Construção permite SE / ENTÃO / SENÃO.',
          );
          continue;
        }
        chaves(regra, [...anotacoes, 'if', 'then', 'else'], local);
        expressao(regra.if, node, `${local}/if`);
        if (regra.then !== undefined) ramo(regra.then, node, `${local}/then`);
        if (regra.else !== undefined) ramo(regra.else, node, `${local}/else`);
      }
      if (node.oneOf) alternativas(node.oneOf, node, `${caminho}/oneOf`);
    }
    if (tipo === 'array') {
      if (node.items === undefined)
        avisar(`${caminho}/items`, 'Defina um tipo para os itens da lista no Para Dev.');
      else {
        if (objeto(node.items)) {
          if (node.items.type === 'array' || Array.isArray(node.items.type))
            avisar(
              `${caminho}/items`,
              'Listas aninhadas e itens com união de tipos precisam do Para Dev.',
            );
          if (node.items.type !== 'object')
            chaves(node.items, [...anotacoes, 'type', 'enum'], `${caminho}/items`);
        }
        visitar(node.items, `${caminho}/items`, profundidade + 1);
      }
    }
  }
  visitar(schema, '', 0);
  return motivos;
}
