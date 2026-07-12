import { PulsoProvider, usePulso } from "./context/PulsoContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TelaVisaoGeral from "./screens/TelaVisaoGeral";
import TelaPrioridades from "./screens/TelaPrioridades";
import TelaExplicacao from "./screens/TelaExplicacao";
import TelaRecomendacao from "./screens/TelaRecomendacao";
import TelaPlanejamento from "./screens/TelaPlanejamento";
import TelaAcoesResultados from "./screens/TelaAcoesResultados";
import "./App.css";
import "./screens/Telas.css";

const TELAS = {
  "visao-geral": TelaVisaoGeral,
  prioridades: TelaPrioridades,
  explicacao: TelaExplicacao,
  recomendacao: TelaRecomendacao,
  planejamento: TelaPlanejamento,
  "acoes-resultados": TelaAcoesResultados,
};

function Conteudo() {
  const { telaAtiva } = usePulso();
  const TelaComponente = TELAS[telaAtiva] ?? TelaVisaoGeral;
  return (
    <main className="app-content">
      <TelaComponente />
    </main>
  );
}

function App() {
  return (
    <PulsoProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Header />
          <Conteudo />
        </div>
      </div>
    </PulsoProvider>
  );
}

export default App;
