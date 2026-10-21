// Fábrica de massa de dados: cada chamada gera valores únicos para evitar
// conflitos entre testes paralelos e entre execuções.
const unico = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const novoUsuario = (sobrescrever = {}) => {
  const id = unico();
  return {
    nome: `Usuário QA ${id}`,
    email: `qa.${id}@teste.com`,
    password: `Senha@${id}`,
    administrador: 'true',
    ...sobrescrever,
  };
};

const novoProduto = (sobrescrever = {}) => ({
  nome: `Produto QA ${unico()}`,
  preco: 150,
  descricao: 'Produto criado por teste automatizado',
  quantidade: 10,
  ...sobrescrever,
});

// ID com formato válido (16 alfanuméricos) que não existe na base
const ID_INEXISTENTE = 'ZZZZZZZZZZZZZZZZ';

module.exports = { novoUsuario, novoProduto, ID_INEXISTENTE };
