# Relatório de execução: testes automatizados de API (ServeRest)

- **Data:** 21/10/2026, 16:03:44
- **Ambiente:** local (http://localhost:3000)
- **Duração total:** 3.4 s
- **Resultado geral:** ✅ APROVADO

## Resumo

| Total | ✅ Aprovados | ❌ Reprovados | ⚠️ Defeitos conhecidos (falha esperada) | ⏭️ Ignorados |
|---:|---:|---:|---:|---:|
| 100 | 99 | 0 | 1 | 0 |

## Por tipo de cenário

| Tipo | Total | Aprovados | Reprovados |
|---|---:|---:|---:|
| Positivo | 21 | 21 | 0 |
| Negativo | 79 | 79 | 0 |

## Cobertura por endpoint e método

| Endpoint / método | Positivos | Negativos | Aprovados | Reprovados |
|---|---:|---:|---:|---:|
| POST /login | 1 | 9 | 10 | 0 |
| GET /usuarios | 2 | 1 | 3 | 0 |
| GET /usuarios/{_id} | 1 | 2 | 3 | 0 |
| POST /usuarios | 2 | 12 | 14 | 0 |
| PUT /usuarios/{_id} | 2 | 3 | 5 | 0 |
| DELETE /usuarios/{_id} | 2 | 1 | 3 | 0 |
| GET /produtos | 2 | 0 | 2 | 0 |
| GET /produtos/{_id} | 1 | 1 | 2 | 0 |
| POST /produtos | 1 | 14 | 15 | 0 |
| PUT /produtos/{_id} | 1 | 6 | 7 | 0 |
| DELETE /produtos/{_id} | 2 | 5 | 7 | 0 |
| POST /carrinhos | 1 | 6 | 7 | 0 |
| GET /carrinhos/{_id} | 1 | 1 | 2 | 0 |
| DELETE /carrinhos/cancelar-compra | 1 | 1 | 2 | 0 |
| DELETE /carrinhos/concluir-compra | 1 | 1 | 2 | 0 |
| Métodos HTTP não suportados | 0 | 16 | 16 | 0 |

## Defeitos e observações sobre a API

- 🔎 **Observação** (POST /login: _deve recusar payload JSON malformado_): Em erros de JSON malformado a resposta não traz os headers de segurança (X-Content-Type-Options, X-Frame-Options, CORS) presentes nas demais respostas. O erro é tratado antes do middleware de segurança.
- 🔎 **Observação** (GET /usuarios/{_id}: _deve informar usuário não encontrado para ID inexistente_): Recurso inexistente retorna 400 (Bad Request) em vez de 404 (Not Found), o que dificulta para o cliente distinguir requisição inválida de recurso ausente. O mesmo ocorre em /produtos e /carrinhos.
- 🔎 **Observação** (PUT /usuarios/{_id}: _deve cadastrar novo usuário quando o ID não existe (upsert)_): PUT em ID inexistente cria um usuário com um ID novo, gerado pela API, e não com o ID informado na URL. Em um upsert idempotente o recurso seria criado no endereço solicitado.
- 🔎 **Observação** (DELETE /usuarios/{_id}: _deve informar que nenhum registro foi excluído para ID inexistente_): DELETE de ID inexistente retorna 200 com "Nenhum registro excluído". É um comportamento documentado da ServeRest, mas 404 seria mais informativo. O mesmo ocorre em /produtos.
- 🐞 **Defeito** (POST /produtos: _[DEFEITO] deve recusar preço enviado como texto_): A API aceita "preco": "150" (string) e cadastra o produto, embora o contrato exija número. Marcado com test.fail(): o teste passa enquanto o defeito existir e passa a falhar quando for corrigido.

## Detalhamento por cenário

### POST /login

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve autenticar com credenciais válidas e retornar token Bearer | Positivo | ✅ Aprovado | 124 ms |
| 2 | deve recusar senha incorreta com 401 | Negativo | ✅ Aprovado | 100 ms |
| 3 | deve recusar e-mail não cadastrado com 401 | Negativo | ✅ Aprovado | 69 ms |
| 4 | deve exigir e-mail e senha quando o corpo está vazio | Negativo | ✅ Aprovado | 76 ms |
| 5 | deve recusar login sem o campo "email" | Negativo | ✅ Aprovado | 59 ms |
| 6 | deve recusar login sem o campo "password" | Negativo | ✅ Aprovado | 34 ms |
| 7 | deve recusar e-mail em formato inválido | Negativo | ✅ Aprovado | 28 ms |
| 8 | deve recusar senha em branco | Negativo | ✅ Aprovado | 54 ms |
| 9 | deve recusar campos não previstos no contrato | Negativo | ✅ Aprovado | 52 ms |
| 10 | deve recusar payload JSON malformado | Negativo | ✅ Aprovado | 18 ms |

### GET /usuarios

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve listar usuários com quantidade coerente com a lista | Positivo | ✅ Aprovado | 54 ms |
| 2 | deve filtrar usuários por e-mail via query string | Positivo | ✅ Aprovado | 85 ms |
| 3 | deve recusar parâmetro de busca não suportado | Negativo | ✅ Aprovado | 61 ms |

### GET /usuarios/{_id}

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve retornar o usuário com os dados cadastrados | Positivo | ✅ Aprovado | 81 ms |
| 2 | deve informar usuário não encontrado para ID inexistente | Negativo | ✅ Aprovado | 8 ms |
| 3 | deve validar o formato do ID | Negativo | ✅ Aprovado | 8 ms |

### POST /usuarios

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve cadastrar usuário com administrador="true" | Positivo | ✅ Aprovado | 20 ms |
| 2 | deve cadastrar usuário com administrador="false" | Positivo | ✅ Aprovado | 24 ms |
| 3 | deve recusar e-mail já cadastrado | Negativo | ✅ Aprovado | 24 ms |
| 4 | deve listar todos os campos obrigatórios quando o corpo está vazio | Negativo | ✅ Aprovado | 12 ms |
| 5 | deve recusar cadastro sem o campo "nome" | Negativo | ✅ Aprovado | 12 ms |
| 6 | deve recusar cadastro sem o campo "email" | Negativo | ✅ Aprovado | 13 ms |
| 7 | deve recusar cadastro sem o campo "administrador" | Negativo | ✅ Aprovado | 28 ms |
| 8 | deve recusar cadastro sem o campo "password" | Negativo | ✅ Aprovado | 15 ms |
| 9 | deve recusar valor inválido em "email" ("fulano.com") | Negativo | ✅ Aprovado | 15 ms |
| 10 | deve recusar valor inválido em "administrador" ("sim") | Negativo | ✅ Aprovado | 17 ms |
| 11 | deve recusar valor inválido em "nome" (123) | Negativo | ✅ Aprovado | 14 ms |
| 12 | deve recusar valor inválido em "password" ("") | Negativo | ✅ Aprovado | 8 ms |
| 13 | deve recusar campos não previstos no contrato | Negativo | ✅ Aprovado | 9 ms |
| 14 | deve recusar payload JSON malformado | Negativo | ✅ Aprovado | 14 ms |

### PUT /usuarios/{_id}

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve alterar todos os dados de um usuário existente | Positivo | ✅ Aprovado | 31 ms |
| 2 | deve cadastrar novo usuário quando o ID não existe (upsert) | Positivo | ✅ Aprovado | 20 ms |
| 3 | deve recusar alteração para e-mail de outro usuário | Negativo | ✅ Aprovado | 38 ms |
| 4 | deve recusar payload incompleto (PUT exige o recurso completo) | Negativo | ✅ Aprovado | 27 ms |
| 5 | deve recusar payload JSON malformado | Negativo | ✅ Aprovado | 23 ms |

### DELETE /usuarios/{_id}

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve excluir o usuário e ele deixar de existir | Positivo | ✅ Aprovado | 16 ms |
| 2 | deve informar que nenhum registro foi excluído para ID inexistente | Positivo | ✅ Aprovado | 17 ms |
| 3 | deve impedir a exclusão de usuário com carrinho cadastrado | Negativo | ✅ Aprovado | 88 ms |

### GET /produtos

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve listar produtos sem exigir autenticação | Positivo | ✅ Aprovado | 61 ms |
| 2 | deve filtrar produtos por nome | Positivo | ✅ Aprovado | 59 ms |

### GET /produtos/{_id}

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve retornar o produto cadastrado | Positivo | ✅ Aprovado | 43 ms |
| 2 | deve informar produto não encontrado para ID inexistente | Negativo | ✅ Aprovado | 14 ms |

### POST /produtos

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve cadastrar produto com usuário administrador | Positivo | ✅ Aprovado | 32 ms |
| 2 | deve recusar cadastro sem token (401) | Negativo | ✅ Aprovado | 37 ms |
| 3 | deve recusar cadastro com token sem o prefixo Bearer (401) | Negativo | ✅ Aprovado | 34 ms |
| 4 | deve recusar cadastro com token inválido (401) | Negativo | ✅ Aprovado | 35 ms |
| 5 | deve recusar cadastro de usuário não administrador (403) | Negativo | ✅ Aprovado | 39 ms |
| 6 | deve recusar nome de produto já existente | Negativo | ✅ Aprovado | 30 ms |
| 7 | deve listar todos os campos obrigatórios quando o corpo está vazio | Negativo | ✅ Aprovado | 15 ms |
| 8 | deve recusar valor inválido em "preco" (-10) | Negativo | ✅ Aprovado | 17 ms |
| 9 | deve recusar valor inválido em "nome" ("") | Negativo | ✅ Aprovado | 25 ms |
| 10 | deve recusar valor inválido em "preco" (10.5) | Negativo | ✅ Aprovado | 23 ms |
| 11 | deve recusar valor inválido em "preco" (0) | Negativo | ✅ Aprovado | 28 ms |
| 12 | deve recusar valor inválido em "quantidade" (-1) | Negativo | ✅ Aprovado | 26 ms |
| 13 | deve recusar valor inválido em "descricao" (42) | Negativo | ✅ Aprovado | 21 ms |
| 14 | deve recusar payload JSON malformado | Negativo | ✅ Aprovado | 22 ms |
| 15 | [DEFEITO] deve recusar preço enviado como texto | Negativo | ⚠️ Falha esperada (defeito conhecido) | 30 ms |

### PUT /produtos/{_id}

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve alterar um produto existente | Positivo | ✅ Aprovado | 34 ms |
| 2 | deve recusar alteração sem token (401) | Negativo | ✅ Aprovado | 39 ms |
| 3 | deve recusar alteração com token inválido (401) | Negativo | ✅ Aprovado | 41 ms |
| 4 | deve recusar alteração com token sem o prefixo Bearer (401) | Negativo | ✅ Aprovado | 48 ms |
| 5 | deve recusar alteração de usuário não administrador (403) | Negativo | ✅ Aprovado | 41 ms |
| 6 | deve recusar alteração para nome de outro produto | Negativo | ✅ Aprovado | 50 ms |
| 7 | deve recusar payload incompleto | Negativo | ✅ Aprovado | 31 ms |

### DELETE /produtos/{_id}

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve excluir o produto e ele deixar de existir | Positivo | ✅ Aprovado | 32 ms |
| 2 | deve informar que nenhum registro foi excluído para ID inexistente | Positivo | ✅ Aprovado | 33 ms |
| 3 | deve recusar exclusão sem token (401) | Negativo | ✅ Aprovado | 45 ms |
| 4 | deve recusar exclusão com token inválido (401) | Negativo | ✅ Aprovado | 44 ms |
| 5 | deve recusar exclusão com token sem o prefixo Bearer (401) | Negativo | ✅ Aprovado | 44 ms |
| 6 | deve recusar exclusão de usuário não administrador (403) | Negativo | ✅ Aprovado | 47 ms |
| 7 | deve impedir a exclusão de produto que está em um carrinho | Negativo | ✅ Aprovado | 60 ms |

### POST /carrinhos

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve criar carrinho e baixar o estoque do produto | Positivo | ✅ Aprovado | 61 ms |
| 2 | deve recusar um segundo carrinho para o mesmo usuário | Negativo | ✅ Aprovado | 61 ms |
| 3 | deve recusar produto inexistente | Negativo | ✅ Aprovado | 27 ms |
| 4 | deve recusar quantidade maior que o estoque | Negativo | ✅ Aprovado | 39 ms |
| 5 | deve recusar produto duplicado na lista | Negativo | ✅ Aprovado | 30 ms |
| 6 | deve recusar lista de produtos vazia | Negativo | ✅ Aprovado | 19 ms |
| 7 | deve exigir autenticação | Negativo | ✅ Aprovado | 7 ms |

### GET /carrinhos/{_id}

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve retornar o carrinho com totais calculados | Positivo | ✅ Aprovado | 46 ms |
| 2 | deve informar carrinho não encontrado | Negativo | ✅ Aprovado | 9 ms |

### DELETE /carrinhos/cancelar-compra

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve excluir o carrinho e devolver o estoque | Positivo | ✅ Aprovado | 42 ms |
| 2 | deve informar quando o usuário não tem carrinho | Negativo | ✅ Aprovado | 25 ms |

### DELETE /carrinhos/concluir-compra

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | deve concluir a compra sem devolver o estoque | Positivo | ✅ Aprovado | 35 ms |
| 2 | deve exigir autenticação | Negativo | ✅ Aprovado | 8 ms |

### Métodos HTTP não suportados

| # | Cenário | Tipo | Resultado | Duração |
|---:|---|---|---|---:|
| 1 | PATCH /usuarios deve retornar 405 | Negativo | ✅ Aprovado | 10 ms |
| 2 | PUT /usuarios deve retornar 405 | Negativo | ✅ Aprovado | 12 ms |
| 3 | DELETE /usuarios deve retornar 405 | Negativo | ✅ Aprovado | 12 ms |
| 4 | POST /usuarios/ZZZZZZZZZZZZZZZZ deve retornar 405 | Negativo | ✅ Aprovado | 13 ms |
| 5 | PATCH /usuarios/ZZZZZZZZZZZZZZZZ deve retornar 405 | Negativo | ✅ Aprovado | 9 ms |
| 6 | GET /login deve retornar 405 | Negativo | ✅ Aprovado | 8 ms |
| 7 | PUT /login deve retornar 405 | Negativo | ✅ Aprovado | 8 ms |
| 8 | DELETE /login deve retornar 405 | Negativo | ✅ Aprovado | 5 ms |
| 9 | PATCH /login deve retornar 405 | Negativo | ✅ Aprovado | 5 ms |
| 10 | PATCH /produtos deve retornar 405 | Negativo | ✅ Aprovado | 6 ms |
| 11 | PUT /produtos deve retornar 405 | Negativo | ✅ Aprovado | 6 ms |
| 12 | DELETE /produtos deve retornar 405 | Negativo | ✅ Aprovado | 6 ms |
| 13 | POST /produtos/ZZZZZZZZZZZZZZZZ deve retornar 405 | Negativo | ✅ Aprovado | 5 ms |
| 14 | PUT /carrinhos/ZZZZZZZZZZZZZZZZ deve retornar 405 | Negativo | ✅ Aprovado | 8 ms |
| 15 | PATCH /carrinhos deve retornar 405 | Negativo | ✅ Aprovado | 6 ms |
| 16 | POST /carrinhos/ZZZZZZZZZZZZZZZZ deve retornar 405 | Negativo | ✅ Aprovado | 7 ms |

---
_Gerado automaticamente por `reporters/relatorio-markdown.js`. As requisições e respostas de cada teste estão anexadas no relatório HTML (`npm run relatorio`)._