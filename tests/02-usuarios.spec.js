const { test, expect, criarProduto } = require('./support/fixtures');
const { validarResposta } = require('./support/validacoes');
const { novoUsuario, novoProduto, ID_INEXISTENTE } = require('./support/dados');

const POSITIVO = { tag: '@positivo' };
const NEGATIVO = { tag: '@negativo' };

test.describe('GET /usuarios', () => {
  test('deve listar usuários com quantidade coerente com a lista', POSITIVO, async ({ api, admin }) => {
    const res = await api.get('/usuarios');

    validarResposta(res, { status: 200, schema: 'listaUsuarios' });
    expect(res.body.quantidade).toBe(res.body.usuarios.length);
    expect(res.body.usuarios.map((u) => u._id)).toContain(admin._id);
  });

  test('deve filtrar usuários por e-mail via query string', POSITIVO, async ({ api, admin }) => {
    const res = await api.get('/usuarios', { params: { email: admin.email } });

    validarResposta(res, { status: 200, schema: 'listaUsuarios' });
    expect(res.body.quantidade).toBe(1);
    expect(res.body.usuarios[0]).toMatchObject({ email: admin.email, _id: admin._id });
  });

  test('deve recusar parâmetro de busca não suportado', NEGATIVO, async ({ api }) => {
    const res = await api.get('/usuarios', { params: { cidade: 'São Paulo' } });

    validarResposta(res, { status: 400 });
    expect(res.body.cidade).toBe('cidade não é permitido');
  });
});

test.describe('GET /usuarios/{_id}', () => {
  test('deve retornar o usuário com os dados cadastrados', POSITIVO, async ({ api, admin }) => {
    const res = await api.get(`/usuarios/${admin._id}`);

    validarResposta(res, { status: 200, schema: 'usuario' });
    expect(res.body).toEqual({
      nome: admin.nome, email: admin.email, password: admin.password, administrador: 'true', _id: admin._id,
    });
  });

  test('deve informar usuário não encontrado para ID inexistente', {
    tag: '@negativo',
    annotation: { type: 'observacao', description: 'Recurso inexistente retorna 400 (Bad Request) em vez de 404 (Not Found), o que dificulta para o cliente distinguir requisição inválida de recurso ausente. O mesmo ocorre em /produtos e /carrinhos.' },
  }, async ({ api }) => {
    const res = await api.get(`/usuarios/${ID_INEXISTENTE}`);

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Usuário não encontrado');
  });

  test('deve validar o formato do ID', NEGATIVO, async ({ api }) => {
    const res = await api.get('/usuarios/123');

    validarResposta(res, { status: 400 });
    expect(res.body.id).toBe('id deve ter exatamente 16 caracteres alfanuméricos');
  });
});

test.describe('POST /usuarios', () => {
  for (const administrador of ['true', 'false']) {
    test(`deve cadastrar usuário com administrador="${administrador}"`, POSITIVO, async ({ api, limpeza }) => {
      const dados = novoUsuario({ administrador });
      const res = await api.post('/usuarios', { data: dados });
      limpeza(() => api.delete(`/usuarios/${res.body._id}`));

      validarResposta(res, { status: 201, schema: 'cadastro' });
      // Confirma a persistência consultando o recurso criado
      const consulta = await api.get(`/usuarios/${res.body._id}`);
      expect(consulta.status).toBe(200);
      expect(consulta.body).toEqual({ ...dados, _id: res.body._id });
    });
  }

  test('deve recusar e-mail já cadastrado', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/usuarios', { data: novoUsuario({ email: admin.email }) });

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Este email já está sendo usado');
  });

  test('deve listar todos os campos obrigatórios quando o corpo está vazio', NEGATIVO, async ({ api }) => {
    const res = await api.post('/usuarios', { data: {} });

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({
      nome: 'nome é obrigatório',
      email: 'email é obrigatório',
      password: 'password é obrigatório',
      administrador: 'administrador é obrigatório',
    });
  });

  for (const campo of ['nome', 'email', 'password', 'administrador']) {
    test(`deve recusar cadastro sem o campo "${campo}"`, NEGATIVO, async ({ api }) => {
      const dados = novoUsuario();
      delete dados[campo];
      const res = await api.post('/usuarios', { data: dados });

      validarResposta(res, { status: 400 });
      expect(res.body).toEqual({ [campo]: `${campo} é obrigatório` });
    });
  }

  const invalidos = [
    { campo: 'email', valor: 'fulano.com', mensagem: 'email deve ser um email válido' },
    { campo: 'administrador', valor: 'sim', mensagem: "administrador deve ser 'true' ou 'false'" },
    { campo: 'nome', valor: 123, mensagem: 'nome deve ser uma string' },
    { campo: 'password', valor: '', mensagem: 'password não pode ficar em branco' },
  ];
  for (const { campo, valor, mensagem } of invalidos) {
    test(`deve recusar valor inválido em "${campo}" (${JSON.stringify(valor)})`, NEGATIVO, async ({ api }) => {
      const res = await api.post('/usuarios', { data: novoUsuario({ [campo]: valor }) });

      validarResposta(res, { status: 400 });
      expect(res.body[campo]).toBe(mensagem);
    });
  }

  test('deve recusar campos não previstos no contrato', NEGATIVO, async ({ api }) => {
    const res = await api.post('/usuarios', { data: novoUsuario({ telefone: '11999999999' }) });

    validarResposta(res, { status: 400 });
    expect(res.body.telefone).toBe('telefone não é permitido');
  });

  test('deve recusar payload JSON malformado', NEGATIVO, async ({ api }) => {
    const res = await api.post('/usuarios', {
      headers: { 'Content-Type': 'application/json' },
      data: '{"nome": "Fulano", "email": ',
    });

    validarResposta(res, { status: 400, schema: 'mensagem', seguranca: false });
    expect(res.body.message).toContain('Adicione aspas em todos os valores');
  });
});

test.describe('PUT /usuarios/{_id}', () => {
  test('deve alterar todos os dados de um usuário existente', POSITIVO, async ({ api, usuarioComum }) => {
    const novosDados = novoUsuario({ administrador: 'true' });
    const res = await api.put(`/usuarios/${usuarioComum._id}`, { data: novosDados });

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Registro alterado com sucesso');
    const consulta = await api.get(`/usuarios/${usuarioComum._id}`);
    expect(consulta.body).toEqual({ ...novosDados, _id: usuarioComum._id });
  });

  test('deve cadastrar novo usuário quando o ID não existe (upsert)', {
    tag: '@positivo',
    annotation: { type: 'observacao', description: 'PUT em ID inexistente cria um usuário com um ID novo, gerado pela API, e não com o ID informado na URL. Em um upsert idempotente o recurso seria criado no endereço solicitado.' },
  }, async ({ api, limpeza }) => {
    const dados = novoUsuario();
    const res = await api.put(`/usuarios/${ID_INEXISTENTE}`, { data: dados });
    limpeza(() => api.delete(`/usuarios/${res.body._id}`));

    validarResposta(res, { status: 201, schema: 'cadastro' });
    // A API gera um novo ID em vez de usar o informado na URL (ver observações do relatório)
    expect(res.body._id).not.toBe(ID_INEXISTENTE);
  });

  test('deve recusar alteração para e-mail de outro usuário', NEGATIVO, async ({ api, admin, usuarioComum }) => {
    const res = await api.put(`/usuarios/${usuarioComum._id}`, { data: novoUsuario({ email: admin.email }) });

    validarResposta(res, { status: 400, schema: 'mensagem' });
    expect(res.body.message).toBe('Este email já está sendo usado');
  });

  test('deve recusar payload incompleto (PUT exige o recurso completo)', NEGATIVO, async ({ api, usuarioComum }) => {
    const res = await api.put(`/usuarios/${usuarioComum._id}`, { data: { nome: 'Somente o nome' } });

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({
      email: 'email é obrigatório',
      password: 'password é obrigatório',
      administrador: 'administrador é obrigatório',
    });
  });

  test('deve recusar payload JSON malformado', NEGATIVO, async ({ api, usuarioComum }) => {
    const res = await api.put(`/usuarios/${usuarioComum._id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: '{"nome": Fulano}',
    });

    validarResposta(res, { status: 400, schema: 'mensagem', seguranca: false });
  });
});

test.describe('DELETE /usuarios/{_id}', () => {
  test('deve excluir o usuário e ele deixar de existir', POSITIVO, async ({ api }) => {
    const criado = await api.post('/usuarios', { data: novoUsuario() });
    const res = await api.delete(`/usuarios/${criado.body._id}`);

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Registro excluído com sucesso');
    const consulta = await api.get(`/usuarios/${criado.body._id}`);
    expect(consulta.status).toBe(400);
    expect(consulta.body.message).toBe('Usuário não encontrado');
  });

  test('deve informar que nenhum registro foi excluído para ID inexistente', {
    tag: '@positivo',
    annotation: { type: 'observacao', description: 'DELETE de ID inexistente retorna 200 com "Nenhum registro excluído". É um comportamento documentado da ServeRest, mas 404 seria mais informativo. O mesmo ocorre em /produtos.' },
  }, async ({ api }) => {
    const res = await api.delete(`/usuarios/${ID_INEXISTENTE}`);

    validarResposta(res, { status: 200, schema: 'mensagem' });
    expect(res.body.message).toBe('Nenhum registro excluído');
  });

  test('deve impedir a exclusão de usuário com carrinho cadastrado', NEGATIVO, async ({ api, admin, limpeza }) => {
    const produto = await criarProduto(api, limpeza, admin, novoProduto());
    const carrinho = await api.post('/carrinhos', {
      headers: admin.auth,
      data: { produtos: [{ idProduto: produto._id, quantidade: 1 }] },
    });
    expect(carrinho.status, 'pré-condição: carrinho criado').toBe(201);
    limpeza(() => api.delete('/carrinhos/cancelar-compra', { headers: admin.auth }));

    const res = await api.delete(`/usuarios/${admin._id}`);

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({
      message: 'Não é permitido excluir usuário com carrinho cadastrado',
      idCarrinho: carrinho.body._id,
    });
  });
});
