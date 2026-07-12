import { usePulso } from "../context/PulsoContext";
import BadgeClassificacao from "../components/BadgeClassificacao";
import MapaRecife from "../components/MapaRecife";

function classificacaoParaClasseCSS(classificacao) {
  const map = {
    critico: { bg: "#fce9e7", cor: "#c1352b" },
    alto: { bg: "#fdeee4", cor: "#e0722a" },
    moderado: { bg: "#fef6e3", cor: "#e0a825" },
    baixo: { bg: "#e5f6ec", cor: "#1f8a5c" },
  };
  return map[classificacao?.chave] || map.baixo;
}

export default function TelaVisaoGeral() {
  const { capacidadeEquipes, cobertura, territoriosOrdenados, irPara } = usePulso();

  const top3 = territoriosOrdenados.slice(0, 3);
  const comSinaisAtencao = territoriosOrdenados.filter(
    (t) => t.classificacao?.chave !== "baixo"
  ).length;
  const criticos = territoriosOrdenados.filter(
    (t) => t.classificacao?.chave === "critico"
  ).length;

  // Sinais simulados para exibição
  const sinais = [
    "Chuva acumulada acima da média em 4 territórios.",
    "Crescimento de notificações em 3 áreas prioritárias.",
    "2 territórios apresentam aumento simultâneo de focos e vulnerabilidade.",
    "Nova atualização climática recebida.",
  ];

  return (
    <div className="tela">
      <p className="tela__mensagem">
        Visão integrada dos sinais de risco e das prioridades de atuação da Vigilância em Saúde.
      </p>

      {/* Métricas topo */}
      <div className="metricas-row">
        <div className="card metrica-card">
          <div className="metrica-card__valor">{comSinaisAtencao}</div>
          <div className="metrica-card__rotulo">
            Territórios com sinais de atenção
          </div>
        </div>
        <div className="card metrica-card">
          <div className="metrica-card__valor">{criticos}</div>
          <div className="metrica-card__rotulo">Prioridades críticas</div>
        </div>
        <div className="card metrica-card">
          <div className="metrica-card__valor">{capacidadeEquipes}</div>
          <div className="metrica-card__rotulo">Equipes disponíveis hoje</div>
        </div>
        <div className="card metrica-card">
          <div className="metrica-card__valor">{cobertura.percentual}%</div>
          <div className="metrica-card__rotulo">
            Risco crítico com cobertura potencial
          </div>
        </div>
      </div>

      {/* Card azul de recomendação */}
      <div className="recomendacao-destaque">
        <div className="recomendacao-destaque__titulo">
          Recomendação operacional de hoje
        </div>
        <div className="recomendacao-destaque__header">
          <div className="recomendacao-destaque__texto">
            Com a capacidade operacional atual, recomendamos atuação prioritária
            em {Math.min(capacidadeEquipes, top3.length)} territórios.
          </div>
          <button
            className="btn btn--secondary"
            style={{ background: "#fff", color: "var(--primary-blue)" }}
            onClick={() => irPara("prioridades")}
          >
            Ver prioridades
          </button>
        </div>
        <div className="recomendacao-destaque__acao">
          {top3.map((t) => (
            <div
              key={t.nome}
              className="recomendacao-destaque__item"
              onClick={() => irPara("explicacao", t.nome)}
            >
              <span className="recomendacao-destaque__nome">{t.nome}</span>
              <span className="recomendacao-destaque__score">
                Prioridade {t.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grade territorial + Sinais */}
      <div className="territorio-sinais-grid">
        <div className="card grade-territorial">
          <div className="grade-territorial__titulo">Mapa territorial de risco</div>
          <div className="grade-territorial__grid">
            {territoriosOrdenados.map((territorio) => {
              const estilo = classificacaoParaClasseCSS(territorio.classificacao);
              return (
                <div
                  key={territorio.nome}
                  className="grade-territorial__celula"
                  style={{
                    background: estilo.bg,
                    color: estilo.cor,
                  }}
                  onClick={() => irPara("explicacao", territorio.nome)}
                >
                  {territorio.nome}
                </div>
              );
            })}
          </div>
          <div className="grade-territorial__legenda">
            <div className="grade-territorial__legenda-item">
              <span
                className="grade-territorial__legenda-cor"
                style={{ background: "var(--critico)" }}
              />
              <span>Crítico</span>
            </div>
            <div className="grade-territorial__legenda-item">
              <span
                className="grade-territorial__legenda-cor"
                style={{ background: "var(--alto)" }}
              />
              <span>Alto</span>
            </div>
            <div className="grade-territorial__legenda-item">
              <span
                className="grade-territorial__legenda-cor"
                style={{ background: "var(--moderado)" }}
              />
              <span>Moderado</span>
            </div>
            <div className="grade-territorial__legenda-item">
              <span
                className="grade-territorial__legenda-cor"
                style={{ background: "var(--baixo)" }}
              />
              <span>Baixo</span>
            </div>
          </div>
        </div>

        <div className="card sinais-card">
          <div className="sinais-card__titulo">Sinais que exigem atenção</div>
          <div className="sinais-lista">
            {sinais.map((s, i) => (
              <div key={i} className="sinais-item">
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mapa interativo (ML) */}
      <div className="card mapa-card">
        <div className="mapa-card__titulo">Mapa interativo de prioridades (ML)</div>
        <div className="mapa-wrapper">
          <MapaRecife onBairroClick={(nome) => irPara("explicacao", nome)} />
        </div>
      </div>

      {/* Top 8 */}
      <div className="card top8-section">
        <div className="top8-header">
          <div className="top8-titulo">
            <span className="top8-titulo__icon">Top 8</span>
            <span className="top8-titulo__sub">Bairros mais prioritários</span>
          </div>
          <span className="top8-titulo__badge">{territoriosOrdenados.length} territórios</span>
        </div>
        <div className="top8-lista">
          {territoriosOrdenados.slice(0, 8).map((territorio, i) => {
            const cls = territorio.classificacao?.chave || "baixo";
            const isTop3 = i < 3;
            return (
              <div
                key={territorio.nome}
                className={`top8-item top8-item--${cls} ${isTop3 ? "top8-item--top3" : ""}`}
                onClick={() => irPara("explicacao", territorio.nome)}
              >
                <div className={`top8-rank ${isTop3 ? `top8-rank--${i + 1}` : ""}`}>
                  {i + 1}
                </div>
                <div className="top8-info">
                  <div className="top8-nome">{territorio.nome}</div>
                  <div className="top8-meta">
                    <span className="top8-ds">DS {territorio.ds}</span>
                    <span className="top8-score">{territorio.score}/100</span>
                  </div>
                  <div className="top8-barra-track">
                    <div
                      className={`top8-barra-fill top8-barra-fill--${cls}`}
                      style={{ width: `${territorio.score}%` }}
                    />
                  </div>
                </div>
                <BadgeClassificacao classificacao={territorio.classificacao} />
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="btn btn--primary"
        style={{ alignSelf: "flex-start" }}
        onClick={() => irPara("explicacao", territoriosOrdenados[0]?.nome)}
      >
        Entender esta priorização
      </button>
    </div>
  );
}
