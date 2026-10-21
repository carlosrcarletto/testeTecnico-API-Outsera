// Tarefa 2: tentativa de uso de métodos HTTP não suportados em cada rota.
const { test, expect } = require('./support/fixtures');
const { validarResposta } = require('./support/validacoes');

const ID = 'ZZZZZZZZZZZZZZZZ';
const casos = [
  ['PATCH', '/usuarios'], ['PUT', '/usuarios'], ['DELETE', '/usuarios'], ['POST', `/usuarios/${ID}`], ['PATCH', `/usuarios/${ID}`],
  ['GET', '/login'], ['PUT', '/login'], ['DELETE', '/login'], ['PATCH', '/login'],
  ['PATCH', '/produtos'], ['PUT', '/produtos'], ['DELETE', '/produtos'], ['POST', `/produtos/${ID}`],
  ['PUT', `/carrinhos/${ID}`], ['PATCH', '/carrinhos'], ['POST', `/carrinhos/${ID}`],
];

test.describe('Métodos HTTP não suportados', () => {
  for (const [metodo, rota] of casos) {
    test(`${metodo} ${rota} deve retornar 405`, { tag: '@negativo' }, async ({ api }) => {
      const res = await api.fetch(metodo, rota, { data: {} });

      validarResposta(res, { status: 405, schema: 'mensagem' });
      expect(res.body.message).toContain(`Não é possível realizar ${metodo} em ${rota}`);
    });
  }
});
