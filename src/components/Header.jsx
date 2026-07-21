import { usePulso } from "../context/PulsoContext";
import { ANO_DADOS, HORIZONTES, formatSemana } from "../config";

const TITULOS = {
  "visao-geral": "Central de Priorização Territorial",
  prioridades: "Prioridades de Intervenção",
  explicacao: "Explicação da Prioridade",
  recomendacao: "Ação Recomendada",
  planejamento: "Planejamento de Capacidade Operacional",
  "acoes-resultados": "Ações e Resultados",
};

// Semanas epidemiológicas disponíveis no ano de dados (SINAN 1..52).
const SEMANAS = Array.from({ length: 52 }, (_, i) => {
  const n = i + 1;
  const nn = String(n).padStart(2, "0");
  return { id: `${ANO_DADOS}-W${nn}`, label: `${nn} · ${ANO_DADOS}` };
});

export default function Header() {
  const {
    telaAtiva, territorioSelecionado,
    semanaSelecionada, setSemanaSelecionada,
    horizonteSelecionado, setHorizonteSelecionado,
    contextoPrevisao,
  } = usePulso();
  const titulo = TITULOS[telaAtiva] ?? "PULSO";

  // Breadcrumb: nas telas de dados, mostra explicitamente O QUE está sendo
  // previsto (semana-alvo) e A PARTIR DE QUAL dado (semana de referência).
  const { referenciaCod, alvoCod } = contextoPrevisao;
  let breadcrumb = referenciaCod
    ? `Prevendo a ${formatSemana(alvoCod)} · a partir dos dados até a ${formatSemana(referenciaCod)}`
    : "Vigilância epidemiológica de dengue";
  if (telaAtiva === "explicacao" && territorioSelecionado) {
    breadcrumb = `Prioridades / ${territorioSelecionado}`;
  } else if (telaAtiva === "recomendacao" && territorioSelecionado) {
    breadcrumb = `Prioridades / ${territorioSelecionado} / Recomendação`;
  }

  return (
    <header className="app-header">
      <div className="app-header__left">
        <h1>{titulo}</h1>
        <div className="app-header__breadcrumb">{breadcrumb}</div>
      </div>
      <div className="app-header__right">
        <label className="app-header__semana">
          <span className="app-header__semana-label">Dados até a semana</span>
          <select
            className="app-header__semana-select"
            value={semanaSelecionada}
            onChange={(e) => setSemanaSelecionada(e.target.value)}
          >
            {SEMANAS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="app-header__semana">
          <span className="app-header__semana-label">Prever à frente</span>
          <select
            className="app-header__semana-select"
            value={horizonteSelecionado}
            onChange={(e) => setHorizonteSelecionado(Number(e.target.value))}
          >
            {HORIZONTES.map((h) => (
              <option key={h.valor} value={h.valor}>
                {h.label} · skill {Math.round(h.skill * 100)}%
              </option>
            ))}
          </select>
        </label>
        <div className="app-header__avatar">RS</div>
      </div>
    </header>
  );
}
