// @ts-check
const { defineConfig } = require('@playwright/test');

const PORTA = 3000;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true, // cada teste cria seus próprios dados, então podem rodar em paralelo
  forbidOnly: !!process.env.CI,
  retries: 0, // sem retries: um teste instável deve aparecer no relatório, não ser mascarado
  reporter: [
    ['list'],
    ['html', { outputFolder: 'relatorio/html', open: 'never' }],
    ['junit', { outputFile: 'relatorio/junit.xml' }],
    ['./reporters/relatorio-markdown.js', { outputFile: 'relatorio/RELATORIO.md' }],
  ],
  use: {
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  projects: [
    { name: 'local', use: { baseURL: `http://localhost:${PORTA}` } },
    { name: 'remoto', use: { baseURL: 'https://serverest.dev' } },
  ],
  // Sobe uma instância local da ServeRest antes dos testes (isolada dos dados públicos)
  webServer: {
    command: `npx serverest --porta ${PORTA} --nodoc --timeout 3600`,
    url: `http://localhost:${PORTA}/usuarios`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
