import { usePulso } from "../context/PulsoContext";

const TITULOS = {
  "visao-geral": "Central de Priorização Territorial",
  prioridades: "Prioridades de Intervenção",
  explicacao: "Explicação da Prioridade",
  recomendacao: "Ação Recomendada",
  planejamento: "Planejamento de Capacidade Operacional",
  "acoes-resultados": "Ações e Resultados",
};

export default function Header() {
  const { telaAtiva, territorioSelecionado } = usePulso();
  const titulo = TITULOS[telaAtiva] ?? "PULSO";

  // Montar breadcrumb
  let breadcrumb = "Distrito Sanitário: Todos · Período: últimos 7 dias · Atualizado às 08:30";
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
        <div className="app-header__avatar">RS</div>
      </div>
    </header>
  );
}
