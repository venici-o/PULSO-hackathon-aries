# PULSO

Inteligência para Priorização da Vigilância em Saúde. Acesse [aqui](https://sistemapulso.up.railway.app/).

PULSO é uma ferramenta de apoio à decisão para a Vigilância em Saúde de Recife.
Ela transforma sinais epidemiológicos, climáticos e territoriais em uma fila
dinâmica de prioridades operacionais, com corte pela capacidade de equipes
disponíveis no momento.

**PULSO não é um dashboard de monitoramento climático.** A pergunta que o
produto responde é: *"Tenho equipes limitadas e vários territórios pedindo
atenção — onde ajo primeiro?"* O clima é um sinal de entrada entre vários,
não a identidade do produto. O sistema recomenda; o profissional decide.

## Stack

- **Frontend:** React 19 + Vite, CSS puro. SPA com navegação entre 6 telas controlada por estado.
- **Backend:** Python (Flask) com XGBoost, pandas, scikit-learn. consome dados reais do CKAN (dengue), APAC (chuva) e GIS (bairros/ZEIS).
- **ML:** Modelo XGBoost Regressor treinado com 8 features, 94 territórios. MAE ~4.04, R² ~0.87.

## Como rodar localmente

### 1. Backend (Python)

```bash
cd backend
# Criar e ativar ambiente virtual (opcional mas recomendado)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependências
pip install -r requirements.txt

# Rodar o servidor Flask
python -m app.main
# ou
python app/main.py
```

O backend sobe em **http://localhost:8000**.

### 2. Frontend (React + Vite)

```bash
# Na raiz do projeto
npm install
npm run dev      # ambiente de desenvolvimento, http://localhost:5173
npm run build    # build de produção em dist/
npm run preview  # serve o build de produção localmente
npm run lint     # oxlint
```

### Ambiente de desenvolvimento completo

Em terminais separados:

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate
python -m app.main

# Terminal 2 — Frontend (raiz do projeto)
npm run dev
```

Acesse o frontend em **http://localhost:5173**. Ele se comunica automaticamente com o backend em **http://localhost:8000**.

## Estrutura do projeto

```
backend/
  app/
    main.py              # servidor Flask (endpoints /prioridade, /mapa, /health)
    config.py            # URLs CKAN/INMET, paths, hiperparâmetros XGBoost
    data/
      bairros_lookup.json        # 94 bairros com scores de vulnerabilidade/histórico
      bairros_esig.geojson       # polígonos reais dos bairros (fonte: ESIG)
      training_data.csv          # dataset de treinamento do modelo
    services/
      model.py             # XGBoost: treinamento, predição, explicabilidade
      etl.py               # pipeline ETL: coleta, feature engineering
      ckan_client.py       # consumo CKAN Recife (dengue SINAN)
      inmet_client.py      # consumo INMET/BDMEP (precipitação)
    models/
      xgb_prioridade.json  # modelo serializado
  requirements.txt

src/
  data/
    priorizacao.js       # PESOS_PRIORIZACAO para exibição frontend
  context/
    PulsoContext.jsx     # estado global: capacidade, seleção, decisões, fila ordenada
  components/
    Sidebar.jsx, Header.jsx, BadgeClassificacao.jsx
    ModalFontesDados.jsx   # modal com fontes de dados do ML
    ModalAlgoritmo.jsx     # modal explicando o algoritmo XGBoost
    MapaRecife.jsx         # mapa interativo com polígonos de bairros
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

## Modelo de priorização (ML)

O PULSO emprega um **XGBoost Regressor** para calcular o score de prioridade
(0–100) de cada um dos 94 bairros do Recife. O modelo é treinado com 8
features normalizadas:

| Feature | Origem |
|---------|--------|
| `tendencia_epidemiologica` | Variação % de casos de dengue vs. semana anterior (CKAN/SINAN) |
| `condicoes_climaticas` | Chuva acumulada normalizada pela média histórica (APAC) |
| `focos_identificados` | Índice de focos de dengue identificados |
| `vulnerabilidade_territorial` | Score socioespacial composto (IDH, densidade, ZEIS) |
| `historico` | Severidade de surtos históricos nos últimos 5 anos |
| `vizinhos_semana_passada` | Média de casos do Distrito Sanitário (efeito espacial) |
| `semana_ano` | Semana epidemiológica (sazonalidade) |
| `ds_encoded` | Identificador do Distrito Sanitário |

**Métricas:** MAE ~4.04 pontos | R² ~0.87 | 100 árvores, max_depth=4

**Pipeline ETL:**
1. Coleta: CKAN (dengue 2025: ~9.187 registros), APAC (chuva diária do Recife 2024-2025: 731 dias, ~9.628 leituras), lookup local
2. Feature engineering: normalização para escala [0, 100]
3. Predição: XGBoost retorna score contínuo
4. Classificação: Crítico (≥85), Alto (70–84), Moderado (50–69), Baixo (<50)

## Estado global (`PulsoContext`)

- `territoriosOrdenados` — 94 bairros ordenados por score do modelo (desc).
- `capacidadeEquipes` — número de equipes disponíveis (default: 6, editável na
  Tela 5, máx: 10).
- `cobertura` — derivado via `useMemo`: quem está coberto/em acompanhamento
  e o percentual de cobertura potencial, recalculado sempre que a capacidade
  muda.
- `territorioSelecionado` — controla qual território as Telas 3 e 4 exibem.
- `decisoes` — decisões registradas, exibidas na Tela 6.

## As 6 telas

1. **Visão Geral** — métricas operacionais, card de recomendação, grade territorial
   de risco (94 bairros), Top 8, mapa interativo com polígonos reais dos bairros.
2. **Prioridades** — Top 3 em cards + tabela de fila de acompanhamento, stepper de
   capacidade.
3. **Explicação** — decomposição da predição em 5 fatores + barras de contribuição
   + evolução dos sinais (explicabilidade XAI via pred_contribs).
4. **Recomendação** — ações checklists por classificação, recursos dinâmicos,
   setores envolvidos, alerta de sobrecarga operacional.
5. **Planejamento** — stepper de capacidade (1–10); cards de cobertos vs.
   acompanhamento (top 15 visíveis), comparativo de cenários.
6. **Ações e Resultados** — decisões registradas + KPIs de processo.

## Fontes de dados externas

- **CKAN Recife:** https://dados.recife.pe.gov.br — notificações de dengue (SINAN)
- **APAC:** http://dados.apac.pe.gov.br:41120/boletins/historico-pluviometrico/ — chuva diária do Recife (temperatura de apoio: Open-Meteo archive)
- **ESIG:** https://esigportal2.recife.pe.gov.br — polígonos dos 94 bairros e ZEIS
