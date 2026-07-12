import { usePulso } from "../context/PulsoContext";

function formatarTimestamp(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const KPIS = [
  { valor: "4h", rotulo: "Tempo entre sinal e decisão", destaque: false },
  { valor: "17h", rotulo: "Tempo entre decisão e intervenção", destaque: false },
  { valor: "21h", rotulo: "Tempo total entre sinal de risco e intervenção", destaque: true },
];

export default function TelaAcoesResultados() {
  const { decisoes } = usePulso();

  return (
    <div className="tela">
      <div className="kpis">
        {KPIS.map((kpi) => (
          <div
            key={kpi.rotulo}
            className={`card kpi-card${kpi.destaque ? " kpi-card--destaque" : ""}`}
          >
            <div className="kpi-card__valor">{kpi.valor}</div>
            <div className="kpi-card__rotulo">{kpi.rotulo}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="tela__titulo" style={{ marginBottom: 12 }}>
          Decisões registradas
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {decisoes.map((d) => (
            <div className="card decisao-item" key={d.id}>
              <div className="decisao-item__topo">
                <span className="decisao-item__nome">{d.territorio}</span>
                <span className="decisao-item__timestamp">{formatarTimestamp(d.timestamp)}</span>
              </div>
              <span className="decisao-item__decisao">{d.decisao}</span>
              {d.resolvida ? (
                <div className="decisao-item__evolucao">
                  Após a intervenção e o período de acompanhamento, a prioridade
                  territorial evoluiu de {d.prioridadeNoMomento} para {d.prioridadeAtual}.
                </div>
              ) : (
                <div className="decisao-item__evolucao">
                  Prioridade operacional no momento da decisão: {d.prioridadeNoMomento}/100.
                </div>
              )}
              {d.observacao && (
                <div className="decisao-item__observacao">{d.observacao}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
