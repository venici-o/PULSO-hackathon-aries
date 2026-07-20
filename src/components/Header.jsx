import { usePulso } from "../context/PulsoContext";
import { ANO_DADOS } from "../config";

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
  return { id: `${ANO_DADOS}-W${nn}`, label: `Semana ${nn} · ${ANO_DADOS}` };
});

export default function Header() {
  const { telaAtiva, territorioSelecionado, semanaSelecionada, setSemanaSelecionada } =
    usePulso();
  const titulo = TITULOS[telaAtiva] ?? "PULSO";

  // Montar breadcrumb (o período agora é controlado pelo seletor de semana)
  let breadcrumb = "Distrito Sanitário: Todos · Vigilância epidemiológica de dengue";
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
          <span className="app-header__semana-label">Semana epidemiológica</span>
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
        <div className="app-header__avatar">RS</div>
      </div>
    </header>
  );
}
