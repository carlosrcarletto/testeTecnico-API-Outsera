// Fixtures compartilhadas:
//  - api: cliente HTTP que anexa requisição e resposta ao relatório (evidência de cada chamada)
//  - limpeza: registra ações de teardown, executadas mesmo se o teste falhar
//  - admin / usuarioComum: usuários criados e autenticados para cada teste, e removidos ao final
const base = require('@playwright/test');
const { novoUsuario } = require('./dados');

const test = base.test.extend({
  api: async ({ request }, use, testInfo) => {
    let seq = 0;
    const chamar = async (method, url, options = {}) => {
      const resposta = await request.fetch(url, { method, ...options });
      const texto = await resposta.text();
      let body;
      try { body = JSON.parse(texto); } catch { body = texto; }
      const res = { method, url, status: resposta.status(), headers: resposta.headers(), body };

      seq += 1;
      await testInfo.attach(`${String(seq).padStart(2, '0')} ${method} ${url} → ${res.status}`, {
        contentType: 'application/json',
        body: JSON.stringify(
          { requisicao: { method, url, headers: options.headers, data: options.data, params: options.params }, resposta: res },
          null,
          2,
        ),
      });
      return res;
    };

    await use({
      get: (url, o) => chamar('GET', url, o),
      post: (url, o) => chamar('POST', url, o),
      put: (url, o) => chamar('PUT', url, o),
      delete: (url, o) => chamar('DELETE', url, o),
      fetch: chamar,
    });
  },

  limpeza: async ({ api }, use) => { // depende de api para ser desmontada antes dela
    const acoes = [];
    await use((fn) => acoes.push(fn));
    for (const acao of acoes.reverse()) {
      try { await acao(); } catch (e) { console.warn('Falha na limpeza:', e.message); }
    }
  },

  admin: async ({ api, limpeza }, use) => {
    await use(await criarUsuarioAutenticado(api, limpeza, 'true'));
  },

  usuarioComum: async ({ api, limpeza }, use) => {
    await use(await criarUsuarioAutenticado(api, limpeza, 'false'));
  },
});

async function criarUsuarioAutenticado(api, limpeza, administrador) {
  const dados = novoUsuario({ administrador });
  const cadastro = await api.post('/usuarios', { data: dados });
  base.expect(cadastro.status, 'pré-condição: cadastro do usuário').toBe(201);
  const login = await api.post('/login', { data: { email: dados.email, password: dados.password } });
  base.expect(login.status, 'pré-condição: login do usuário').toBe(200);

  const usuario = { ...dados, _id: cadastro.body._id, token: login.body.authorization };
  usuario.auth = { Authorization: usuario.token };
  limpeza(() => api.delete(`/usuarios/${usuario._id}`));
  return usuario;
}

/** Cria um produto (pré-condição) e registra sua exclusão no teardown. */
async function criarProduto(api, limpeza, admin, dados) {
  const res = await api.post('/produtos', { data: dados, headers: admin.auth });
  base.expect(res.status, 'pré-condição: cadastro do produto').toBe(201);
  limpeza(() => api.delete(`/produtos/${res.body._id}`, { headers: admin.auth }));
  return { ...dados, _id: res.body._id };
}

module.exports = { test, expect: base.expect, criarProduto };
