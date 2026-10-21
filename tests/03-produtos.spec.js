const { test, expect, criarProduto } = require('./support/fixtures');
const { validarResposta } = require('./support/validacoes');
const { novoProduto, ID_INEXISTENTE } = require('./support/dados');

const POSITIVO = { tag: '@positivo' };
const NEGATIVO = { tag: '@negativo' };
const MSG_TOKEN = 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais';

// Cenários de autenticação/autorização reaproveitados por POST, PUT e DELETE
const cenariosDeAcesso = [
  { nome: 'sem token', headers: () => ({}), status: 401, message: MSG_TOKEN },
  { nome: 'com token inválido', headers: () => ({ Authorization: 'Bearer token.invalido.123' }), status: 401, message: MSG_TOKEN },
  { nome: 'com token sem o prefixo Bearer', headers: (u) => ({ Authorization: u.admin.token.replace('Bearer ', '') }), status: 401, message: MSG_TOKEN },
  { nome: 'de usuário não administrador', headers: (u) => u.usuarioComum.auth, status: 403, message: 'Rota exclusiva para administradores' },
];

test.describe('GET /produtos', () => {
  test('deve listar produtos sem exigir autenticação', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const res = await api.get('/produtos');

    validarResposta(res, { status: 200, schema: 'listaProdutos' });
    expect(res.body.quantidade).toBe(res.body.produtos.length);
    expect(res.body.produtos).toContainEqual(produto);
  });

  test('deve filtrar produtos por nome', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const res = await api.get('/produtos', { params: { nome: produto.nome } });

    validarResposta(res, { status: 200, schema: 'listaProdutos' });
    expect(res.body).toEqual({ quantidade: 1, produtos: [produto] });
  });
});

test.describe('GET /produtos/{_id}', () => {
  test('deve retornar o produto cadastrado', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const res = await api.get(`/produtos/${produto._id}`);

    validarResposta(res, { status: 200, schema: 'produto' });
    expect(res.body).toEqual(produto);
  });

  test('deve informar produto não encontrado para ID inexistente', NEGATIVO, async ({ api }) => {
    const res = await api.get(`/produtos/${ID_INEXISTENTE}`);

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Produto não encontrado');
  });
});

test.describe('POST /produtos', () => {
  test('deve cadastrar produto com usuário administrador', POSITIVO, async ({ api, admin, limpeza }) => {
    const dados = novoProduto();
    const res = await api.post('/produtos', { headers: admin.auth, data: dados });
    limpeza(() => api.delete(`/produtos/${res.body._id}`, { headers: admin.auth }));

    validarResposta(res, { status: 201, schema: 'cadastro' });
    const consulta = await api.get(`/produtos/${res.body._id}`);
    expect(consulta.body).toEqual({ ...dados, _id: res.body._id });
  });

  for (const cenario of cenariosDeAcesso) {
    test(`deve recusar cadastro ${cenario.nome} (${cenario.status})`, NEGATIVO, async ({ api, admin, usuarioComum }) => {
      const res = await api.post('/produtos', { headers: cenario.headers({ admin, usuarioComum }), data: novoProduto() });

      validarResposta(res, { status: cenario.status, schema: 'mensagem' });
      expect(res.body.message).toBe(cenario.message);
    });
  }

  test('deve recusar nome de produto já existente', NEGATIVO, async ({ api, admin, limpeza }) => {
    const existente = await criarProduto(api, limpeza, admin, novoProduto());
    const res = await api.post('/produtos', { headers: admin.auth, data: novoProduto({ nome: existente.nome }) });

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Já existe produto com esse nome');
  });

  test('deve listar todos os campos obrigatórios quando o corpo está vazio', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/produtos', { headers: admin.auth, data: {} });

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({
      nome: 'nome é obrigatório',
      preco: 'preco é obrigatório',
      descricao: 'descricao é obrigatório',
      quantidade: 'quantidade é obrigatório',
    });
  });

  const invalidos = [
    { campo: 'preco', valor: -10, mensagem: 'preco deve ser um número positivo' },
    { campo: 'preco', valor: 0, mensagem: 'preco deve ser um número positivo' },
    { campo: 'preco', valor: 10.5, mensagem: 'preco deve ser um inteiro' },
    { campo: 'quantidade', valor: -1, mensagem: 'quantidade deve ser maior ou igual a 0' },
    { campo: 'nome', valor: '', mensagem: 'nome não pode ficar em branco' },
    { campo: 'descricao', valor: 42, mensagem: 'descricao deve ser uma string' },
  ];
  for (const { campo, valor, mensagem } of invalidos) {
    test(`deve recusar valor inválido em "${campo}" (${JSON.stringify(valor)})`, NEGATIVO, async ({ api, admin }) => {
      const res = await api.post('/produtos', { headers: admin.auth, data: novoProduto({ [campo]: valor }) });

      validarResposta(res, { status: 400 });
      expect(res.body[campo]).toBe(mensagem);
    });
  }

  test('deve recusar payload JSON malformado', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/produtos', {
      headers: { ...admin.auth, 'Content-Type': 'application/json' },
      data: '{"nome": "Mouse", "preco": }',
    });

    validarResposta(res, { status: 400, schema: 'mensagem', seguranca: false });
  });

  test('[DEFEITO] deve recusar preço enviado como texto', {
    tag: '@negativo',
    annotation: {
      type: 'defeito',
      description: 'A API aceita "preco": "150" (string) e cadastra o produto, embora o contrato exija número. '
        + 'Marcado com test.fail(): o teste passa enquanto o defeito existir e passa a falhar quando for corrigido.',
    },
  }, async ({ api, admin, limpeza }) => {
    test.fail();
    const res = await api.post('/produtos', { headers: admin.auth, data: novoProduto({ preco: '150' }) });
    if (res.status === 201) limpeza(() => api.delete(`/produtos/${res.body._id}`, { headers: admin.auth }));

    expect(res.status).toBe(400);
  });
});

test.describe('PUT /produtos/{_id}', () => {
  test('deve alterar um produto existente', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const alterado = novoProduto({ preco: 999, quantidade: 1 });
    const res = await api.put(`/produtos/${produto._id}`, { headers: admin.auth, data: alterado });

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Registro alterado com sucesso');
    const consulta = await api.get(`/produtos/${produto._id}`);
    expect(consulta.body).toEqual({ ...alterado, _id: produto._id });
  });

  for (const cenario of cenariosDeAcesso) {
    test(`deve recusar alteração ${cenario.nome} (${cenario.status})`, NEGATIVO, async ({ api, admin, usuarioComum, limpeza }) => {
      const produto = await criarProduto(api, limpeza, admin, novoProduto());
      const res = await api.put(`/produtos/${produto._id}`, {
        headers: cenario.headers({ admin, usuarioComum }),
        data: novoProduto(),
      });

      validarResposta(res, { status: cenario.status, schema: 'mensagem' });
      expect(res.body.message).toBe(cenario.message);
      // O produto não pode ter sido alterado
      expect((await api.get(`/produtos/${produto._id}`)).body).toEqual(produto);
    });
  }

  test('deve recusar alteração para nome de outro produto', NEGATIVO, async ({ api, admin, limpeza }) => {
    const p1 = await criarProduto(api, limpeza, admin, novoProduto());
    const p2 = await criarProduto(api, limpeza, admin, novoProduto());
    const res = await api.put(`/produtos/${p2._id}`, { headers: admin.auth, data: novoProduto({ nome: p1.nome }) });

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Já existe produto com esse nome');
  });

  test('deve recusar payload incompleto', NEGATIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const res = await api.put(`/produtos/${produto._id}`, { headers: admin.auth, data: { preco: 10 } });

    validarResposta(res, { status: 400 });
    expect(Object.keys(res.body).sort()).toEqual(['descricao', 'nome', 'quantidade']);
  });
});

test.describe('DELETE /produtos/{_id}', () => {
  test('deve excluir o produto e ele deixar de existir', POSITIVO, async ({ api, admin }) => {
    const criado = await api.post('/produtos', { headers: admin.auth, data: novoProduto() });
    const res = await api.delete(`/produtos/${criado.body._id}`, { headers: admin.auth });

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Registro excluído com sucesso');
    expect((await api.get(`/produtos/${criado.body._id}`)).body.message).toBe('Produto não encontrado');
  });

  test('deve informar que nenhum registro foi excluído para ID inexistente', POSITIVO, async ({ api, admin }) => {
    const res = await api.delete(`/produtos/${ID_INEXISTENTE}`, { headers: admin.auth });

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Nenhum registro excluído');
  });

  for (const cenario of cenariosDeAcesso) {
    test(`deve recusar exclusão ${cenario.nome} (${cenario.status})`, NEGATIVO, async ({ api, admin, usuarioComum, limpeza }) => {
      const produto = await criarProduto(api, limpeza, admin, novoProduto());
      const res = await api.delete(`/produtos/${produto._id}`, { headers: cenario.headers({ admin, usuarioComum }) });

      validarResposta(res, { status: cenario.status, schema: 'mensagem' });
      expect(res.body.message).toBe(cenario.message);
      expect((await api.get(`/produtos/${produto._id}`)).status, 'produto deve continuar existindo').toBe(200);
    });
  }

  test('deve impedir a exclusão de produto que está em um carrinho', NEGATIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const carrinho = await api.post('/carrinhos', {
      headers: admin.auth,
      data: { produtos: [{ idProduto: produto._id, quantidade: 1 }] },
    });
    expect(carrinho.status, 'pré-condição: carrinho criado').toBe(201);
    limpeza(() => api.delete('/carrinhos/cancelar-compra', { headers: admin.auth }));

    const res = await api.delete(`/produtos/${produto._id}`, { headers: admin.auth });

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({
      message: 'Não é permitido excluir produto que faz parte de carrinho',
      idCarrinhos: [carrinho.body._id],
    });
  });
});
