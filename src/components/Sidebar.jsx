import { usePulso } from "../context/PulsoContext";

const ITENS_NAV = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "prioridades", label: "Prioridades" },
  { id: "planejamento", label: "Planejamento" },
  { id: "acoes-resultados", label: "Ações e Resultados" },
];

const ITENS_FOOTER = [
  { id: "relatorios", label: "Relatórios" },
];

const GRUPO_PRIORIDADES = ["prioridades", "explicacao", "recomendacao"];

export default function Sidebar({ isOpen, onClose, onOpenFontes, onOpenAlgoritmo }) {
  const { telaAtiva, irPara } = usePulso();

  function handleClick(id) {
    irPara(id);
    if (onClose) onClose();
  }

  return (
    <>
      <aside className={`sidebar${isOpen ? " is-open" : ""}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">PULSO</div>
          <div className="sidebar__subtitle">
            Previsão Urbana de Localização e Sinais de Ocorrência
          </div>
        </div>
        <nav className="sidebar__nav">
          {ITENS_NAV.map((item) => {
            const ativo = GRUPO_PRIORIDADES.includes(telaAtiva)
              ? item.id === "prioridades"
              : telaAtiva === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar__item${ativo ? " sidebar__item--active" : ""}`}
                onClick={() => handleClick(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          {ITENS_FOOTER.map((item) => (
            <button
              key={item.id}
              className="sidebar__footer-item"
              onClick={() => handleClick(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button
            className="sidebar__footer-item"
            onClick={() => {
              onOpenFontes?.();
              if (onClose) onClose();
            }}
          >
            Fontes de dados
          </button>
          <button
            className="sidebar__footer-item"
            onClick={() => {
              onOpenAlgoritmo?.();
              if (onClose) onClose();
            }}
          >
            Algoritmo
          </button>
        </div>
      </aside>
    </>
  );
}
