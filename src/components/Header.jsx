import { usePulso } from "../context/PulsoContext";

const TITULOS = {
  "visao-geral": "Central de Priorização Territorial",
  prioridades: "Fila Dinâmica de Prioridades",
  explicacao: "Explicabilidade da Recomendação",
  recomendacao: "Recomendação Operacional",
  planejamento: "Planejamento de Capacidade",
  "acoes-resultados": "Ações e Resultados",
};

export default function Header() {
  const { telaAtiva } = usePulso();
  return (
    <header className="app-header">
      <h1>{TITULOS[telaAtiva] ?? "PULSO"}</h1>
    </header>
  );
}
