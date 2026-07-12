import { usePulso } from "../context/PulsoContext";
import BadgeClassificacao from "../components/BadgeClassificacao";

function getTendenciaTexto(tendencia) {
  if (tendencia >= 70) return { texto: "Subindo", classe: "fila-tabela__tendencia--subindo" };
  if (tendencia <= 30) return { texto: "Recuando", classe: "fila-tabela__tendencia--estavel" };
  return { texto: "Estável", classe: "fila-tabela__tendencia--estavel" };
}

export default function TelaPrioridades() {
  const { territoriosOrdenados, capacidadeEquipes, setCapacidadeEquipes, irPara } = usePulso();

  const top3 = territoriosOrdenados.slice(0, 3);
  const restante = territoriosOrdenados.slice(3);

  return (
    <div className="tela">
      <p className="tela__mensagem">
        Territórios ordenados pela necessidade de atuação, considerando risco e
        capacidade operacional.
      </p>

      {/* Header capacidade */}
      <div className="capacidade-header">
        <div className="capacidade-header__info">
          <div className="capacidade-header__label">
            Capacidade operacional de hoje
          </div>
          <div className="capacidade-header__valor">
            {capacidadeEquipes} {capacidadeEquipes === 1 ? "equipe" : "equipes"} disponíveis
          </div>
        </div>
        <button
          className="btn btn--secondary"
          onClick={() => irPara("planejamento")}
        >
          Ajustar capacidade
        </button>
      </div>

      {/* Top 3 cards */}
      <div className="top3-grid">
        {top3.map((territorio, i) => {
          const cls = territorio.classificacao?.chave || "baixo";
          const sinais = [
            `Tendência epidemiológica: ${territorio.tendenciaEpidemiologica?.toFixed(0)}/100`,
            `Condições climáticas: ${territorio.condicoesClimaticas?.toFixed(0)}/100`,
            `Focos identificados: ${territorio.focosIdentificados?.toFixed(0)}/100`,
          ];
          return (
            <div key={territorio.nome} className={`card top3-card top3-card--${cls}`}>
              <div className="top3-card__header">
                <div className="top3-card__rank">{i + 1}</div>
                <div className="top3-card__nome">{territorio.nome}</div>
                <BadgeClassificacao classificacao={territorio.classificacao} />
              </div>
              <div className="top3-card__score">
                Índice: {territorio.score}/100
              </div>
              <div className="top3-card__sinais">
                <div className="top3-card__sinais-titulo">Principais sinais</div>
                {sinais.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="top3-card__sinal">
                    {s}
                  </div>
                ))}
              </div>
              <button
                className="btn btn--primary btn--block"
                onClick={() => irPara("recomendacao", territorio.nome)}
              >
                Ver recomendação
              </button>
            </div>
          );
        })}
      </div>

      {/* Tabela de acompanhamento */}
      <div>
        <h2 className="tela__titulo" style={{ marginBottom: 16, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
          Fila de acompanhamento
        </h2>
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table className="fila-tabela">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Território</th>
                <th>Índice</th>
                <th>Nível</th>
                <th>Tendência</th>
              </tr>
            </thead>
            <tbody>
              {restante.map((territorio, i) => {
                const posicao = i + 4;
                const tendencia = getTendenciaTexto(territorio.tendenciaEpidemiologica);
                return (
                  <tr
                    key={territorio.nome}
                    onClick={() => irPara("explicacao", territorio.nome)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="fila-tabela__posicao">{posicao}</td>
                    <td className="fila-tabela__nome">{territorio.nome}</td>
                    <td className="fila-tabela__score">{territorio.score}</td>
                    <td>
                      <BadgeClassificacao classificacao={territorio.classificacao} />
                    </td>
                    <td className={tendencia.classe}>{tendencia.texto}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="tela__mensagem" style={{ color: "var(--primary-blue)", fontWeight: 600 }}>
        {Math.min(capacidadeEquipes, 3)} de {territoriosOrdenados.length} territórios priorizados para atuação imediata com a capacidade atual.
      </p>
    </div>
  );
}
