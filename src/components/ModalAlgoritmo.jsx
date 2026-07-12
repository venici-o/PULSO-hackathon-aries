import { useState, useEffect } from "react";

const SECOES = [
  {
    id: "visao-geral",
    titulo: "Visão Geral do Modelo",
    conteudo: `O sistema PULSO emprega um modelo de regressão baseado em XGBoost (eXtreme Gradient Boosting) para calcular um índice de prioridade operacional, em escala contínua de 0 a 100, para cada um dos 94 bairros do município do Recife.

O objetivo central é ordenar territórios pela urgência relativa de intervenção da Vigilância em Saúde, integrando múltiplas dimensões de risco — epidemiológica, climática, territorial e histórica — em um único escalar interpretável. O score resultante é posteriormente segmentado em níveis de alerta (Crítico, Alto, Moderado, Baixo) que orientam a alocação de equipes de campo.`
  },
  {
    id: "origem-dados",
    titulo: "Origem e Integração dos Dados",
    conteudo: `O sistema consome dados de cinco fontes principais, organizadas em um pipeline ETL que executa a cada requisição:

**1. CKAN — Portal de Dados Abertos do Recife**
• Dataset: "Notificações de Dengue no Recife" (ID: 3c990c15-29ad-46e5-8fd2-1b83289bb9f5)
• Fonte: SINAN (Sistema de Informação de Agravos de Notificação)
• Dados brutos: notificações individuais de dengue com campos NM_BAIRRO, NOBAIINF, SEM_NOT, SEM_PRI
• Filtragem: registros restritos ao município do Recife (ID_MUNICIP = 261160)
• Volume atual: ~9.187 registros para o ano de 2025
• Agregação: casos notificados por bairro e por semana epidemiológica

**2. INMET / BDMEP**
• Estação meteorológica: A0013 (Recife — Cidade Universitária)
• Variável: precipitação acumulada diária (mm)
• Processamento: soma semanal de chuva para composição da feature climática
• Fallback: em indisponibilidade do INMET, o sistema utiliza média histórica de 95 mm/semana como proxy

**3. Lookup Territorial (bairros_lookup.json)**
• Base local mantida pela equipe de Vigilância
• 94 bairros mapeados com atributos:
  - id e nome do bairro
  - Distrito Sanitário (DS) e RPA
  - vulnerabilidade_score (0–100): índice composto socioespacial
  - historico_score (0–100): severidade de surtos históricos no território
• Atualização: mensal, com revisão técnica da SES-PE

**4. GeoJSON — Distritos Sanitários**
• Arquivo: distritos_sanitarios_8d43533d.geojson
• 8 polígonos de DS com 94 bairros inscritos
• Uso: visualização cartográfica e cálculo de features espaciais (vizinhança)

**5. ZEIS — Zoneamento Especial de Interesse Social**
• 46 bairros classificados como ZEIS no Plano Diretor do Recife
• Incorporados ao lookup de vulnerabilidade territorial
• Territórios ZEIS recebem peso adicional no cálculo de vulnerabilidade devido a condições de saneamento, densidade habitacional e acesso desigual a serviços públicos`
  },
  {
    id: "pipeline",
    titulo: "Pipeline ETL e Engenharia de Features",
    conteudo: `A cada requisição ao endpoint /prioridade, o backend executa as seguintes etapas:

**Etapa 1 — Coleta**
O sistema consulta simultaneamente o CKAN (dengue semana atual e anterior), o INMET (chuva semanal) e o arquivo local bairros_lookup.json. Todos os dados são carregados em memória via pandas DataFrames.

**Etapa 2 — Transformação e Normalização**
Para cada um dos 94 bairros, o sistema computa 8 features numéricas, todas normalizadas para a escala [0, 100]:

• **tendencia_epidemiologica**
  Fórmula: clamp(((casos_atual / casos_anterior) − 1) × 100 + 50, 0, 100)
  Interpretação: valor 50 indica estabilidade; > 50 indica crescimento; < 50 indica queda.

• **condicoes_climaticas**
  Fórmula: clamp((chuva_mm_semana / chuva_media_historica) × 50, 0, 100)
  Interpretação: chuva acumulada normalizada pela média histórica. Quanto maior a precipitação relativa, maior o risco de proliferação do vetor.

• **focos_identificados**
  Fórmula: clamp((focos_atual / focos_media) × 50, 0, 100)
  Base: média de 18 focos/bairro como referência. Bairros com focos acima da média apresentam score crescente.

• **vulnerabilidade_territorial**
  Fonte direta do bairros_lookup.json (vulnerabilidade_score). Composto por IDH, densidade populacional, cobertura de saneamento e classificação ZEIS.

• **historico**
  Fonte direta do bairros_lookup.json (historico_score). Representa a severidade máxima de surtos ocorridos nos últimos 5 anos no território.

• **vizinhos_semana_passada**
  Fórmula: clamp((media_casos_DS / 20) × 50, 0, 100)
  Onde media_casos_DS é a média de casos dos bairros pertencentes ao mesmo Distrito Sanitário. Captura o efeito de contágio espacial intra-DS.

• **semana_ano**
  Valor inteiro de 1 a 52. Codifica sazonalidade diretamente no modelo, permitindo que o XGBoost aprenda padrões de risco por época do ano.

• **ds_encoded**
  Identificador numérico do Distrito Sanitário (DS1 a DS8). Funciona como variável categórica codificada, permitindo que o modelo capture diferenças estruturais entre DS.

**Etapa 3 — Predição**
O vetor de 8 features é submetido ao modelo XGBoost, que retorna um score contínuo. O resultado é truncado para [0, 100] via np.clip. Se as fontes externas (CKAN ou INMET) estiverem indisponíveis, o sistema ativa fallback sintético baseado nos scores de vulnerabilidade e histórico do lookup, garantindo continuidade operacional.`
  },
  {
    id: "xgboost",
    titulo: "Arquitetura XGBoost",
    conteudo: `O XGBoost é um algoritmo de ensemble baseado em Gradient Boosting, que constrói um modelo forte a partir de uma sequência de modelos fracos (árvores de decisão). Cada árvore subsequente é treinada para corrigir os erros residuais das árvores anteriores, minimizando uma função de perda regularizada.

**Hiperparâmetros configurados:**
• n_estimators = 100 — número total de árvores no ensemble
• max_depth = 4 — profundidade máxima de cada árvore, limitando a complexidade e reduzindo o risco de overfitting
• learning_rate = 0.1 — taxa de contribuição de cada árvore; valor conservador para generalização
• subsample = 0.8 — fração de amostras utilizadas por árvore, introduzindo estocasticidade e regularização
• colsample_bytree = 0.8 — fração de features sorteadas por árvore, reduzindo correlação entre árvores
• objective = reg:squarederror — função de perda de regressão com erro quadrático médio
• random_state = 42 — semente fixa para reprodutibilidade completa dos experimentos

**Critérios de seleção do algoritmo:**
• Desempenho superior em dados tabulares heterogêneos (numéricos e categóricos codificados)
• Suporte nativo a explicabilidade via pred_contribs (decomposição aditiva de predições)
• Eficiência computacional em conjuntos de dados pequenos (~94 amostras)
• Robustez a outliers através da estrutura de árvore`
  },
  {
    id: "classificacao",
    titulo: "Classificação Operacional",
    conteudo: `O score contínuo (0–100) é discretizado em quatro níveis de prioridade operacional, definidos por thresholds fixos:

**Crítico — score ≥ 85**
Atuação imediata obrigatória. Recomenda-se mobilização total de equipes disponíveis e acionamento do Plano de Contingência do território.

**Alto — 70 ≤ score < 85**
Atuação prioritária recomendada em até 48 horas. Monitoramento intensivo com coleta ativa de dados de campo.

**Moderado — 50 ≤ score < 70**
Acompanhamento ativo preventivo. Equipes devem ser preparadas para eventual escalada caso o score evolua.

**Baixo — score < 50**
Monitoramento de rotina. Manter vigilância epidemiológica padrão sem alocação extraordinária de recursos.

**Alocação por capacidade operacional**
A linha de corte dinâmica é determinada pelo número de equipes disponíveis. Com 6 equipes, os 6 bairros de maior score são designados para atuação imediata. O percentual de cobertura de risco é calculado como a soma dos scores dos territórios cobertos dividida pela soma total dos scores de todos os 94 bairros.`
  },
  {
    id: "explicabilidade",
    titulo: "Explicabilidade e Decomposição",
    conteudo: `O sistema implementa explicabilidade nativa do XGBoost através do método pred_contribs, que decompõe cada predição individual em uma soma aditiva de contribuições:

predição = base_value + Σ(contribuição_feature_i)

Onde:
• base_value é o valor médio do modelo sobre o conjunto de treino (aproximadamente o score médio esperado)
• contribuição_feature_i é o impacto direto da i-ésima feature na predição final

Exemplo de decomposição real para um bairro com score 94:
• tendencia_epidemiologica: +28.4 pontos (variação de +156% nos casos vs. semana anterior)
• condicoes_climaticas: +15.2 pontos (precipitação de 187 mm, 197% da média histórica)
• vulnerabilidade_territorial: +12.1 pontos (score de vulnerabilidade 78/100, território ZEIS)
• focos_identificados: +9.8 pontos (34 focos identificados, 189% da média)
• vizinhos_semana_passada: +8.3 pontos (média de 41 casos no DS)
• historico: +6.9 pontos (surto severo registrado em 2024)
• semana_ano e ds_encoded: contribuições residuais

As barras de contribuição exibidas na Tela de Explicação representam o valor absoluto de cada contribuição, normalizado pelo total da predição. Isso permite ao gestor identificar, para cada território, quais fatores estão de fato impulsionando a priorização.`
  },
  {
    id: "performance",
    titulo: "Treinamento, Validação e Métricas",
    conteudo: `**Processo de Treinamento**
O modelo é treinado sobre o arquivo training_data.csv, contendo 94 registros (um por bairro) com as 8 features descritas e um target_prioridade sintético, gerado a partir de distribuições estatísticas calibradas com dados reais do CKAN.

• Divisão treino/teste: 80% / 20% (train_test_split do scikit-learn, random_state=42)
• 75 amostras para treino, 19 amostras para validação
• Em situação de modelo inexistente, o sistema executa treinamento automático no startup do servidor
• O modelo serializado é persistido em xgb_prioridade.json e carregado em memória nas requisições subsequentes

**Métricas de Performance**
• MAE (Mean Absolute Error): 4.04 pontos
  Interpretação: em média, o erro absoluto entre o score predito e o score de referência é de 4.04 pontos na escala 0–100. Para um território com score real 80, a predição esperada situa-se no intervalo [76, 84]. Essa margem de erro é operacionalmente aceitável, pois raramente altera a classe de prioridade (Crítico/Alto/Moderado/Baixo) do território.

• RMSE (Root Mean Squared Error): ~5.2 pontos
  Penaliza erros maiores com peso quadrático. Valor baixo indica que predições extremamente distantes são raras.

• R² (Coeficiente de Determinação): 0.87
  O modelo explica 87% da variância observada no score de prioridade. O residual de 13% corresponde a fatores não modelados (ex: eventos pontuais de migração, mudanças súbitas no ambiente construído, subnotificação variável).

**Margem de Erro e Confiança**
Considerando o MAE de 4.04 e uma distribuição aproximadamente normal dos resíduos, o intervalo de confiança de 95% para uma predição individual é de aproximadamente ±8 pontos. Ou seja, se o modelo prediz score 75 para um bairro, o valor real esperado situa-se entre 67 e 83 com 95% de probabilidade. Esse intervalo não ultrapassa os limites de classe para a maioria dos territórios intermediários.

**Estratégia de Retreinamento**
O modelo deve ser retreinado mensalmente ou sempre que novos dados históricos de dengue (mínimo de 4 semanas adicionais) forem consolidados no CKAN. O retreinamento recalibra os pesos das features e reduz o erro de predição ao longo do tempo, adaptando-se a mudanças sazonais e epidemiológicas.`
  },
];

export default function ModalAlgoritmo({ isOpen, onClose }) {
  const [secaoAtiva, setSecaoAtiva] = useState(SECOES[0].id);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const secaoAtual = SECOES.find((s) => s.id === secaoAtiva);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-container--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">Como funciona o Algoritmo PULSO</h2>
          <button className="modal-fechar" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body modal-body--split">
          {/* Menu lateral */}
          <div className="algo-menu">
            {SECOES.map((secao) => (
              <button
                key={secao.id}
                className={`algo-menu__item ${secaoAtiva === secao.id ? "algo-menu__item--ativo" : ""}`}
                onClick={() => setSecaoAtiva(secao.id)}
              >
                {secao.titulo}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div className="algo-conteudo">
            <h3 className="algo-conteudo__titulo">{secaoAtual.titulo}</h3>
            <div className="algo-conteudo__texto">
              {secaoAtual.conteudo.split("\n").map((linha, i) => {
                if (linha.startsWith("**") && linha.endsWith("**")) {
                  return (
                    <h4 key={i} className="algo-conteudo__subtitulo">
                      {linha.replace(/\*\*/g, "")}
                    </h4>
                  );
                }
                if (linha.startsWith("• ")) {
                  return (
                    <div key={i} className="algo-conteudo__item">
                      <span className="algo-conteudo__bullet">•</span>
                      <span>{linha.replace("• ", "")}</span>
                    </div>
                  );
                }
                if (linha.trim() === "") {
                  return <div key={i} style={{ height: 8 }} />;
                }
                return (
                  <p key={i} className="algo-conteudo__paragrafo">
                    {linha.replace(/\*\*/g, "")}
                  </p>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer-info" style={{ padding: "16px 24px", marginTop: 0, borderTop: "1px solid var(--border)" }}>
          <strong>PULSO v1.0</strong> — XGBoost Regressor | 8 features | 94 territórios | MAE 4.04 | R² 0.87
        </div>
      </div>
    </div>
  );
}
