# PULSO

Inteligência para Priorização da Vigilância em Saúde.

PULSO é uma ferramenta de apoio à decisão para a Vigilância em Saúde de Recife.
Ela transforma sinais epidemiológicos, climáticos e territoriais em uma fila
dinâmica de prioridades operacionais, com corte pela capacidade de equipes
disponíveis no momento.

**PULSO não é um dashboard de monitoramento climático.** A pergunta que o
produto responde é: *"Tenho equipes limitadas e vários territórios pedindo
atenção — onde ajo primeiro?"* O clima é um sinal de entrada entre vários,
não a identidade do produto. O sistema recomenda; o profissional decide.

## Stack

- React 19 + Vite, sem backend — todo o estado vive em memória (`useState` /
  `useContext`).
- CSS puro, sem framework de UI.
- Single-page app com navegação entre 6 telas controlada por estado (sem
  router).

## Como rodar

```bash
npm install
npm run dev      # ambiente de desenvolvimento, http://localhost:5173
npm run build    # build de produção em dist/
npm run preview  # serve o build de produção localmente
npm run lint      # oxlint
```

## Estrutura do projeto

```
src/
  data/
    territorios.js     # sinais brutos dos 6 territórios (dado estático)
    priorizacao.js      # PESOS_PRIORIZACAO + calcularPrioridade() (função pura)
  context/
    PulsoContext.jsx    # estado global: capacidade, seleção, decisões, fila ordenada
  components/
    Sidebar.jsx, Header.jsx, BadgeClassificacao.jsx, ModalDecisao.jsx
  screens/
    TelaVisaoGeral.jsx       # Tela 1 — Central de Decisão
    TelaPrioridades.jsx      # Tela 2 — Fila Dinâmica de Prioridades
    TelaExplicacao.jsx       # Tela 3 — Explicação da Prioridade
    TelaRecomendacao.jsx     # Tela 4 — Recomendação Operacional
    TelaPlanejamento.jsx     # Tela 5 — Planejamento de Capacidade
    TelaAcoesResultados.jsx  # Tela 6 — Ações e Resultados
    Telas.css                 # estilos específicos de cada tela
  index.css   # tokens de design globais
  App.css     # layout (sidebar, header, shell)
```

## Modelo de priorização

Cada território tem sinais brutos (casos da semana, chuva acumulada, focos
identificados, vulnerabilidade, histórico de agravamento). A prioridade
operacional é calculada **ao vivo**, nunca hardcoded, por `calcularPrioridade()`
em `src/data/priorizacao.js`:

```
Prioridade = 0.35 × TendênciaEpidemiológica
           + 0.25 × CondiçõesClimáticas
           + 0.20 × FocosIdentificados
           + 0.15 × VulnerabilidadeTerritorial
           + 0.05 × Histórico
```

Cada componente é normalizado para 0–100 antes da ponderação. Faixas de
classificação: 85–100 Crítico, 70–84 Alto, 50–69 Moderado, 0–49 Baixo.

Os pesos ficam isolados em `PESOS_PRIORIZACAO`, exportado separadamente, com
a nota (também visível na Tela 3):

> Valores demonstrativos definidos pela equipe. A metodologia de priorização
> deverá ser calibrada e validada em conjunto com profissionais da
> Vigilância em Saúde.

## Estado global (`PulsoContext`)

- `territoriosOrdenados` — os 6 territórios com prioridade calculada, já
  ordenados (desc).
- `capacidadeEquipes` — número de equipes disponíveis hoje (1–6, editável na
  Tela 5).
- `cobertura` — derivado via `useMemo`: quem está coberto/em acompanhamento
  e o percentual de cobertura potencial, recalculado sempre que a capacidade
  muda.
- `territorioSelecionado` — controla qual território as Telas 3 e 4 exibem.
- `decisoes` — decisões registradas pelo modal da Tela 4, exibidas na Tela 6.

## As 6 telas

1. **Visão Geral** — bloco de destaque com a capacidade do dia e os top-N
   territórios recomendados; grade territorial ocupa no máximo ~35% da tela.
2. **Prioridades** — fila completa dos 6 territórios, com a linha de corte
   operacional visível na posição da capacidade atual.
3. **Explicação** — decomposição da prioridade em contribuição por sinal
   (explicabilidade), com nota metodológica sempre visível.
4. **Recomendação** — estrutura fixa Ação + Local + Urgência + Recursos,
   mais o modal de registro de decisão.
5. **Planejamento** — stepper de capacidade (1–6); tudo recalcula ao vivo
   (cobertura, fila coberta/acompanhamento, linha de corte).
6. **Ações e Resultados** — decisões registradas + KPIs de processo (tempo
   entre sinal e intervenção), não de impacto em saúde.
