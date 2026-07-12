import { usePulso } from "../context/PulsoContext";

const ITENS = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "prioridades", label: "Prioridades" },
  { id: "planejamento", label: "Planejamento" },
  { id: "acoes-resultados", label: "Ações e Resultados" },
];

// Telas 3 e 4 são "detalhe" de Prioridades: mantém o item destacado.
const GRUPO_PRIORIDADES = ["prioridades", "explicacao", "recomendacao"];

export default function Sidebar() {
  const { telaAtiva, irPara } = usePulso();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">PULSO</div>
        <div className="sidebar__subtitle">
          Previsão Urbana de Localização e Sinais de Ocorrência
        </div>
      </div>
      <nav className="sidebar__nav">
        {ITENS.map((item) => {
          const ativo = GRUPO_PRIORIDADES.includes(telaAtiva)
            ? item.id === "prioridades"
            : telaAtiva === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar__item${ativo ? " sidebar__item--active" : ""}`}
              onClick={() => irPara(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
