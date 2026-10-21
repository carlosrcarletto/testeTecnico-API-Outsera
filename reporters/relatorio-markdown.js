// Reporter customizado do Playwright: gera relatorio/RELATORIO.md ao final de cada execução,
// com resumo geral, separação positivos/negativos, cobertura por endpoint/método,
// defeitos e observações anotados nos testes e o detalhe de cada falha.
const fs = require('fs');
const path = require('path');

const semAnsi = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '');
const celula = (s = '') => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const ms = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`);

class RelatorioMarkdown {
  constructor(opcoes = {}) {
    this.arquivo = opcoes.outputFile || 'relatorio/RELATORIO.md';
    this.resultados = [];
  }

  onBegin(config, suite) {
    this.inicio = new Date();
    const projeto = suite.suites[0]?.project();
    this.ambiente = projeto ? `${projeto.name} (${projeto.use.baseURL})` : 'n/d';
  }

  onTestEnd(test, result) {
    const [, , arquivo, grupo] = test.titlePath(); // ['', projeto, arquivo, describe, título]
    this.resultados.push({
      arquivo,
      grupo: grupo || arquivo,
      titulo: test.title,
      tipo: test.tags.includes('@positivo') ? 'Positivo' : test.tags.includes('@negativo') ? 'Negativo' : '-',
      desfecho: test.outcome(), // expected | unexpected | flaky | skipped
      falhaEsperada: test.expectedStatus === 'failed',
      duracao: result.duration,
      erro: semAnsi(result.errors[0]?.message || ''),
      anotacoes: test.annotations,
      local: [test.location.file, test.location.line],
    });
  }

  onEnd(resultado) {
    // Os testes rodam em paralelo; ordena por arquivo/linha para um relatório estável
    const r = this.resultados.sort((a, b) => a.local[0].localeCompare(b.local[0]) || a.local[1] - b.local[1]);
    const conta = (filtro) => r.filter(filtro).length;
    const aprovado = (t) => t.desfecho === 'expected' || t.desfecho === 'flaky';
    const reprovado = (t) => t.desfecho === 'unexpected';

    const linhas = [];
    const add = (...l) => linhas.push(...l);

    add('# Relatório de execução: testes automatizados de API (ServeRest)', '');
    add(`- **Data:** ${this.inicio.toLocaleString('pt-BR')}`);
    add(`- **Ambiente:** ${this.ambiente}`);
    add(`- **Duração total:** ${ms(resultado.duration)}`);
    add(`- **Resultado geral:** ${resultado.status === 'passed' ? '✅ APROVADO' : '❌ REPROVADO'}`, '');

    add('## Resumo', '');
    add('| Total | ✅ Aprovados | ❌ Reprovados | ⚠️ Defeitos conhecidos (falha esperada) | ⏭️ Ignorados |');
    add('|---:|---:|---:|---:|---:|');
    add(`| ${r.length} | ${conta((t) => aprovado(t) && !t.falhaEsperada)} | ${conta(reprovado)} | ${conta((t) => t.falhaEsperada && aprovado(t))} | ${conta((t) => t.desfecho === 'skipped')} |`, '');

    add('## Por tipo de cenário', '');
    add('| Tipo | Total | Aprovados | Reprovados |', '|---|---:|---:|---:|');
    for (const tipo of ['Positivo', 'Negativo']) {
      const doTipo = r.filter((t) => t.tipo === tipo);
      add(`| ${tipo} | ${doTipo.length} | ${doTipo.filter(aprovado).length} | ${doTipo.filter(reprovado).length} |`);
    }
    add('');

    const grupos = [...new Set(r.map((t) => t.grupo))];
    add('## Cobertura por endpoint e método', '');
    add('| Endpoint / método | Positivos | Negativos | Aprovados | Reprovados |', '|---|---:|---:|---:|---:|');
    for (const g of grupos) {
      const dg = r.filter((t) => t.grupo === g);
      add(`| ${celula(g)} | ${dg.filter((t) => t.tipo === 'Positivo').length} | ${dg.filter((t) => t.tipo === 'Negativo').length} | ${dg.filter(aprovado).length} | ${dg.filter(reprovado).length} |`);
    }
    add('');

    const anotados = r.flatMap((t) => t.anotacoes.filter((a) => ['defeito', 'observacao'].includes(a.type)).map((a) => ({ ...a, t })));
    if (anotados.length) {
      add('## Defeitos e observações sobre a API', '');
      for (const { type, description, t } of anotados) {
        add(`- ${type === 'defeito' ? '🐞 **Defeito**' : '🔎 **Observação**'} (${celula(t.grupo)}: _${celula(t.titulo)}_): ${description}`);
      }
      add('');
    }

    const falhas = r.filter(reprovado);
    if (falhas.length) {
      add('## Falhas', '');
      for (const f of falhas) add(`### ❌ ${f.grupo}: ${f.titulo}`, '', '```', f.erro.trim(), '```', '');
    }

    add('## Detalhamento por cenário', '');
    for (const g of grupos) {
      add(`### ${g}`, '', '| # | Cenário | Tipo | Resultado | Duração |', '|---:|---|---|---|---:|');
      r.filter((t) => t.grupo === g).forEach((t, i) => {
        const status = t.desfecho === 'skipped' ? '⏭️ Ignorado'
          : reprovado(t) ? '❌ Reprovado'
            : t.falhaEsperada ? '⚠️ Falha esperada (defeito conhecido)'
              : t.desfecho === 'flaky' ? '🟡 Instável' : '✅ Aprovado';
        add(`| ${i + 1} | ${celula(t.titulo)} | ${t.tipo} | ${status} | ${ms(t.duracao)} |`);
      });
      add('');
    }

    add('---', '_Gerado automaticamente por `reporters/relatorio-markdown.js`. As requisições e respostas de cada teste estão anexadas no relatório HTML (`npm run relatorio`)._');

    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    fs.writeFileSync(this.arquivo, linhas.join('\n'));
  }

  printsToStdio() { return false; }
}

module.exports = RelatorioMarkdown;
