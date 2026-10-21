const { expect } = require('@playwright/test');
const { validadores, ajv } = require('./schemas');

/** Valida os headers comuns de uma resposta JSON da API. */
function validarHeaders(res, { seguranca = true } = {}) {
  expect(res.headers['content-type'], 'Content-Type').toBe('application/json; charset=utf-8');
  expect(Number(res.headers['content-length']), 'Content-Length deve ser > 0').toBeGreaterThan(0);
  if (seguranca) {
    expect(res.headers['x-content-type-options'], 'X-Content-Type-Options').toBe('nosniff');
    expect(res.headers['access-control-allow-origin'], 'CORS').toBe('*');
  }
}

/** Valida o corpo contra um contrato (JSON Schema) nomeado em schemas.js. */
function validarContrato(body, nomeSchema) {
  const validar = validadores[nomeSchema];
  const ok = validar(body);
  expect(ok, `Contrato "${nomeSchema}" violado: ${ajv.errorsText(validar.errors)}`).toBe(true);
}

/** Atalho para as verificações completas de uma resposta: status + headers + contrato. */
function validarResposta(res, { status, schema, seguranca = true }) {
  expect(res.status, `Status HTTP de ${res.method} ${res.url}`).toBe(status);
  validarHeaders(res, { seguranca });
  if (schema) validarContrato(res.body, schema);
}

module.exports = { validarHeaders, validarContrato, validarResposta };
