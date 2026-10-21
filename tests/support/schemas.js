// Contratos (JSON Schema) das respostas. Validar o contrato garante que o corpo
// tem a estrutura e os tipos esperados, e não apenas um campo isolado.
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const id = { type: 'string', pattern: '^[A-Za-z0-9]{16}$' };

const usuario = {
  type: 'object',
  required: ['nome', 'email', 'password', 'administrador', '_id'],
  properties: {
    nome: { type: 'string' },
    email: { type: 'string', format: 'email' },
    password: { type: 'string' },
    administrador: { enum: ['true', 'false'] },
    _id: id,
  },
  additionalProperties: false,
};

const produto = {
  type: 'object',
  required: ['nome', 'preco', 'descricao', 'quantidade', '_id'],
  properties: {
    nome: { type: 'string' },
    preco: { type: 'integer', minimum: 1 },
    descricao: { type: 'string' },
    quantidade: { type: 'integer', minimum: 0 },
    _id: id,
  },
  additionalProperties: false,
};

const schemas = {
  usuario,
  produto,
  listaUsuarios: {
    type: 'object',
    required: ['quantidade', 'usuarios'],
    properties: { quantidade: { type: 'integer', minimum: 0 }, usuarios: { type: 'array', items: usuario } },
  },
  listaProdutos: {
    type: 'object',
    required: ['quantidade', 'produtos'],
    properties: { quantidade: { type: 'integer', minimum: 0 }, produtos: { type: 'array', items: produto } },
  },
  mensagem: {
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string', minLength: 1 } },
  },
  cadastro: {
    type: 'object',
    required: ['message', '_id'],
    properties: { message: { const: 'Cadastro realizado com sucesso' }, _id: id },
    additionalProperties: false,
  },
  login: {
    type: 'object',
    required: ['message', 'authorization'],
    properties: {
      message: { const: 'Login realizado com sucesso' },
      authorization: { type: 'string', pattern: '^Bearer [\\w-]+\\.[\\w-]+\\.[\\w-]+$' },
    },
    additionalProperties: false,
  },
  carrinho: {
    type: 'object',
    required: ['produtos', 'precoTotal', 'quantidadeTotal', 'idUsuario', '_id'],
    properties: {
      produtos: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['idProduto', 'quantidade', 'precoUnitario'],
          properties: { idProduto: id, quantidade: { type: 'integer' }, precoUnitario: { type: 'integer' } },
        },
      },
      precoTotal: { type: 'integer' },
      quantidadeTotal: { type: 'integer' },
      idUsuario: id,
      _id: id,
    },
  },
};

const validadores = Object.fromEntries(Object.entries(schemas).map(([nome, s]) => [nome, ajv.compile(s)]));

module.exports = { validadores, ajv };
