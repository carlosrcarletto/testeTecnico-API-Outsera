const { test, expect, criarProduto } = require('./support/fixtures');
const { validarResposta } = require('./support/validacoes');
const { novoProduto, ID_INEXISTENTE } = require('./support/dados');

const POSITIVO = { tag: '@positivo' };
const NEGATIVO = { tag: '@negativo' };

test.describe('POST /carrinhos', () => {
  test('deve criar carrinho e baixar o estoque do produto', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto({ quantidade: 5, preco: 30 }));
    const res = await api.post('/carrinhos', {
      headers: admin.auth,
      data: { produtos: [{ idProduto: produto._id, quantidade: 2 }] },
    });
    limpeza(() => api.delete('/carrinhos/cancelar-compra', { headers: admin.auth }));

    validarResposta(res, { status: 201, schema: 'cadastro' });
    expect((await api.get(`/produtos/${produto._id}`)).body.quantidade).toBe(3);
  });

  test('deve recusar um segundo carrinho para o mesmo usuário', NEGATIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const data = { produtos: [{ idProduto: produto._id, quantidade: 1 }] };
    expect((await api.post('/carrinhos', { headers: admin.auth, data })).status).toBe(201);
    limpeza(() => api.delete('/carrinhos/cancelar-compra', { headers: admin.auth }));

    const res = await api.post('/carrinhos', { headers: admin.auth, data });

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Não é permitido ter mais de 1 carrinho');
  });

  test('deve recusar produto inexistente', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/carrinhos', {
      headers: admin.auth,
      data: { produtos: [{ idProduto: ID_INEXISTENTE, quantidade: 1 }] },
    });

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({
      message: 'Produto não encontrado',
      item: { idProduto: ID_INEXISTENTE, quantidade: 1, index: 0 },
    });
  });

  test('deve recusar quantidade maior que o estoque', NEGATIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto({ quantidade: 2 }));
    const res = await api.post('/carrinhos', {
      headers: admin.auth,
      data: { produtos: [{ idProduto: produto._id, quantidade: 3 }] },
    });

    validarResposta(res, { status: 400 });
    expect(res.body.message).toBe('Produto não possui quantidade suficiente');
    expect(res.body.item).toMatchObject({ quantidade: 3, quantidadeEstoque: 2 });
  });

  test('deve recusar produto duplicado na lista', NEGATIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const item = { idProduto: produto._id, quantidade: 1 };
    const res = await api.post('/carrinhos', { headers: admin.auth, data: { produtos: [item, item] } });

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({ message: 'Não é permitido possuir produto duplicado', idProdutosDuplicados: [produto._id] });
  });

  test('deve recusar lista de produtos vazia', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/carrinhos', { headers: admin.auth, data: { produtos: [] } });

    validarResposta(res, { status: 400 });
    expect(res.body.produtos).toBe('produtos não contém 1 valor obrigatório');
  });

  test('deve exigir autenticação', NEGATIVO, async ({ api }) => {
    const res = await api.post('/carrinhos', { data: { produtos: [{ idProduto: ID_INEXISTENTE, quantidade: 1 }] } });

    validarResposta(res, { status: 401, schema: 'mensagem' });
  });
});

test.describe('GET /carrinhos/{_id}', () => {
  test('deve retornar o carrinho com totais calculados', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto({ preco: 25, quantidade: 10 }));
    const criado = await api.post('/carrinhos', {
      headers: admin.auth,
      data: { produtos: [{ idProduto: produto._id, quantidade: 4 }] },
    });
    limpeza(() => api.delete('/carrinhos/cancelar-compra', { headers: admin.auth }));

    const res = await api.get(`/carrinhos/${criado.body._id}`);

    validarResposta(res, { status: 200, schema: 'carrinho' });
    expect(res.body).toMatchObject({ precoTotal: 100, quantidadeTotal: 4, idUsuario: admin._id });
  });

  test('deve informar carrinho não encontrado', NEGATIVO, async ({ api }) => {
    const res = await api.get(`/carrinhos/${ID_INEXISTENTE}`);

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Carrinho não encontrado');
  });
});

test.describe('DELETE /carrinhos/cancelar-compra', () => {
  test('deve excluir o carrinho e devolver o estoque', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto({ quantidade: 5 }));
    await api.post('/carrinhos', { headers: admin.auth, data: { produtos: [{ idProduto: produto._id, quantidade: 5 }] } });

    const res = await api.delete('/carrinhos/cancelar-compra', { headers: admin.auth });

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Registro excluído com sucesso. Estoque dos produtos reabastecido');
    expect((await api.get(`/produtos/${produto._id}`)).body.quantidade).toBe(5);
  });

  test('deve informar quando o usuário não tem carrinho', NEGATIVO, async ({ api, admin }) => {
    const res = await api.delete('/carrinhos/cancelar-compra', { headers: admin.auth });

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Não foi encontrado carrinho para esse usuário');
  });
});

test.describe('DELETE /carrinhos/concluir-compra', () => {
  test('deve concluir a compra sem devolver o estoque', POSITIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto({ quantidade: 5 }));
    await api.post('/carrinhos', { headers: admin.auth, data: { produtos: [{ idProduto: produto._id, quantidade: 2 }] } });

    const res = await api.delete('/carrinhos/concluir-compra', { headers: admin.auth });

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Registro excluído com sucesso');
    expect((await api.get(`/produtos/${produto._id}`)).body.quantidade).toBe(3);
  });

  test('deve exigir autenticação', NEGATIVO, async ({ api }) => {
    const res = await api.delete('/carrinhos/concluir-compra');

    validarResposta(res, { status: 401, schema: 'mensagem' });
  });
});
