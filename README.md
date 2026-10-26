# Testes automatizados de API: ServeRest

Suíte de testes automatizados para a API [ServeRest](https://serverest.dev), escrita com **Playwright** (módulo de testes de API) e **Ajv** para validação de contrato. São **100 cenários** (21 positivos e 79 negativos) cobrindo os endpoints de login, usuários, produtos e carrinhos, com os métodos GET, POST, PUT e DELETE, além de métodos não suportados.

## Como executar

Pré-requisito: Node.js 18 ou superior.

```bash
npm install
npm test
```

O `npm test` sobe automaticamente uma instância **local** da ServeRest (porta 3000) antes dos testes. Assim a execução não depende de internet nem é afetada por dados que outras pessoas criam no servidor público.

| Comando                  | O que faz                                                 |
| ------------------------ | --------------------------------------------------------- |
| `npm test`               | Executa todos os testes contra a ServeRest local          |
| `npm run test:positivos` | Apenas cenários positivos (tag `@positivo`)               |
| `npm run test:negativos` | Apenas cenários negativos (tag `@negativo`)               |
| `npm run test:remoto`    | Executa contra o servidor público `https://serverest.dev` |
| `npm run relatorio`      | Abre o relatório HTML da última execução                  |

## Relatórios gerados

Cada execução gera três relatórios na pasta `relatorio/`:

- **`RELATORIO.md`**: relatório em português gerado por um reporter próprio (`reporters/relatorio-markdown.js`). Contém resumo geral, totais por tipo de cenário (positivo/negativo), cobertura por endpoint e método, defeitos e observações encontrados na API, detalhe de cada falha e a lista de todos os cenários com resultado e duração.
- **`html/`**: relatório HTML do Playwright. Cada teste tem anexadas **todas as requisições e respostas** (método, URL, headers, corpo enviado, status, headers e corpo recebidos), servindo de evidência.
- **`junit.xml`**: formato padrão para integração com CI (GitHub Actions, Jenkins, Azure DevOps).

A pasta `relatorio/` deste pacote já contém os relatórios de uma execução real: 100 testes, 99 aprovados e 1 falha esperada que documenta um defeito da API.

## Estrutura

```
├── playwright.config.js          # baseURL, reporters, paralelismo e servidor local
├── reporters/
│   └── relatorio-markdown.js     # gera relatorio/RELATORIO.md
└── tests/
    ├── 01-login.spec.js          # POST /login
    ├── 02-usuarios.spec.js       # GET, POST, PUT, DELETE /usuarios
    ├── 03-produtos.spec.js       # GET, POST, PUT, DELETE /produtos (com autenticação)
    ├── 04-carrinhos.spec.js      # POST, GET, DELETE /carrinhos
    ├── 05-metodos-invalidos.spec.js  # métodos não suportados → 405
    └── support/
        ├── fixtures.js           # cliente HTTP com evidências, usuários autenticados, limpeza
        ├── dados.js              # fábrica de massa de dados única
        ├── schemas.js            # contratos JSON Schema das respostas
        └── validacoes.js         # validação de status, headers e contrato
```

## Como os requisitos foram atendidos

**Verificações de resposta (status, headers e corpo).** Toda resposta passa por `validarResposta()`, que verifica o status HTTP, os headers (`Content-Type: application/json; charset=utf-8`, `Content-Length`, `X-Content-Type-Options: nosniff` e CORS) e, quando aplicável, o **contrato completo do corpo** via JSON Schema (tipos, campos obrigatórios, formato do ID e do token JWT, ausência de campos extras). Além do contrato, os testes conferem os valores: mensagens exatas, dados persistidos e efeitos colaterais.

**Cenários positivos e negativos.** Os negativos cobrem dados inválidos (e-mail mal formatado, preço negativo ou decimal, tipos errados), campos ausentes (um teste por campo obrigatório, gerado a partir de uma lista), campos não previstos, payload JSON malformado, autenticação inválida (sem token, token inválido, token sem `Bearer`), autorização (usuário comum em rota de administrador → 403), regras de negócio (e-mail ou nome duplicado, exclusão de usuário com carrinho, estoque insuficiente) e métodos HTTP não suportados (16 combinações de rota e método → 405).

**Múltiplos endpoints e métodos.** 16 combinações de endpoint e método, listadas na tabela "Cobertura por endpoint e método" do relatório.

## Boas práticas aplicadas

- **Testes independentes e paralelos:** cada teste cria sua própria massa de dados com valores únicos e não depende da ordem de execução nem de dados pré-existentes.
- **Limpeza garantida:** tudo o que um teste cria é registrado na fixture `limpeza` e removido ao final, mesmo se o teste falhar.
- **Verificação de efeito, não só de resposta:** após POST, PUT e DELETE, os testes consultam o recurso para confirmar que a alteração foi (ou não foi) persistida. Por exemplo, um PUT negado por falta de permissão não pode ter alterado o produto.
- **Testes orientados a dados:** cenários repetitivos (campos obrigatórios, valores inválidos, cenários de acesso, métodos inválidos) são gerados a partir de tabelas, sem código duplicado.
- **Contratos centralizados:** schemas e validações ficam em um só lugar e são reutilizados por todos os testes.
- **Sem retries:** um teste instável aparece no relatório em vez de ser mascarado.
- **Defeitos documentados como teste:** o defeito encontrado usa `test.fail()`. O teste passa enquanto o defeito existir e falha quando ele for corrigido, avisando que precisa ser atualizado.

## Resultados e análise

Defeito encontrado:

- `POST /produtos` aceita `"preco": "150"` (texto) e cadastra o produto, embora o contrato exija número. Os demais valores inválidos de preço são recusados corretamente.

Observações de design da API (comportamentos documentados, mas questionáveis em relação às convenções REST):

- Recurso inexistente retorna **400** em vez de **404**.
- `DELETE` de ID inexistente retorna **200** ("Nenhum registro excluído").
- `PUT` em ID inexistente cria o recurso com **outro ID**, gerado pela API, e não com o informado na URL.
- Respostas de erro para JSON malformado **não incluem os headers de segurança** presentes nas demais respostas.

## Observações

- Com o npm 12, scripts de instalação de dependências são bloqueados por padrão. O `package.json` já declara em `allowScripts` que o script de telemetria `@scarf/scarf` (dependência da ServeRest) não deve rodar, então a instalação não exige aprovações.
- No modo `test:remoto`, os dados do servidor público são compartilhados e reiniciados periodicamente, então resultados pontualmente diferentes são possíveis. A execução local é a referência.
