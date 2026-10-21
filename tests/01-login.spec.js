const { test, expect } = require('./support/fixtures');
const { validarResposta } = require('./support/validacoes');
const { novoUsuario } = require('./support/dados');

const POSITIVO = { tag: '@positivo' };
const NEGATIVO = { tag: '@negativo' };

test.describe('POST /login', () => {
  test('deve autenticar com credenciais válidas e retornar token Bearer', POSITIVO, async ({ api, admin }) => {
    const res = await api.post('/login', { data: { email: admin.email, password: admin.password } });

    validarResposta(res, { status: 200, schema: 'login' });
    // O payload do JWT deve identificar o usuário autenticado
    const payload = JSON.parse(Buffer.from(res.body.authorization.split('.')[1], 'base64url').toString());
    expect(payload.email).toBe(admin.email);
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('deve recusar senha incorreta com 401', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/login', { data: { email: admin.email, password: 'senha-errada' } });

    validarResposta(res, { status: 401, schema: 'mensagem' });
    expect(res.body.message).toBe('Email e/ou senha inválidos');
    expect(res.body).not.toHaveProperty('authorization');
  });

  test('deve recusar e-mail não cadastrado com 401', NEGATIVO, async ({ api }) => {
    const { email, password } = novoUsuario();
    const res = await api.post('/login', { data: { email, password } });

    validarResposta(res, { status: 401, schema: 'mensagem' });
    expect(res.body.message).toBe('Email e/ou senha inválidos');
  });

  test('deve exigir e-mail e senha quando o corpo está vazio', NEGATIVO, async ({ api }) => {
    const res = await api.post('/login', { data: {} });

    validarResposta(res, { status: 400 });
    expect(res.body).toEqual({ email: 'email é obrigatório', password: 'password é obrigatório' });
  });

  for (const campo of ['email', 'password']) {
    test(`deve recusar login sem o campo "${campo}"`, NEGATIVO, async ({ api, admin }) => {
      const data = { email: admin.email, password: admin.password };
      delete data[campo];
      const res = await api.post('/login', { data });

      validarResposta(res, { status: 400 });
      expect(res.body).toEqual({ [campo]: `${campo} é obrigatório` });
    });
  }

  test('deve recusar e-mail em formato inválido', NEGATIVO, async ({ api }) => {
    const res = await api.post('/login', { data: { email: 'email-sem-arroba', password: 'qualquer' } });

    validarResposta(res, { status: 400 });
    expect(res.body.email).toBe('email deve ser um email válido');
  });

  test('deve recusar senha em branco', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/login', { data: { email: admin.email, password: '' } });

    validarResposta(res, { status: 400 });
    expect(res.body.password).toBe('password não pode ficar em branco');
  });

  test('deve recusar campos não previstos no contrato', NEGATIVO, async ({ api, admin }) => {
    const res = await api.post('/login', { data: { email: admin.email, password: admin.password, lembrar: true } });

    validarResposta(res, { status: 400 });
    expect(res.body.lembrar).toBe('lembrar não é permitido');
  });

  test('deve recusar payload JSON malformado', {
    tag: '@negativo',
    annotation: { type: 'observacao', description: 'Em erros de JSON malformado a resposta não traz os headers de segurança (X-Content-Type-Options, X-Frame-Options, CORS) presentes nas demais respostas. O erro é tratado antes do middleware de segurança.' },
  }, async ({ api }) => {
    const res = await api.post('/login', {
      headers: { 'Content-Type': 'application/json' },
      data: '{"email": "fulano@qa.com", "password": ',
    });

    // Observação: nesta resposta de erro a API não envia os headers de segurança (ver relatório)
    validarResposta(res, { status: 400, schema: 'mensagem', seguranca: false });
    expect(res.body.message).toContain('Adicione aspas em todos os valores');
  });
});
