import { useState } from "react";
import { PulsoProvider, usePulso } from "./context/PulsoContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ModalFontesDados from "./components/ModalFontesDados";
import ModalAlgoritmo from "./components/ModalAlgoritmo";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalFontesOpen, setModalFontesOpen] = useState(false);
  const [modalAlgoritmoOpen, setModalAlgoritmoOpen] = useState(false);

  return (
    <PulsoProvider>
      <div className="app-shell">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <div
          className={`sidebar-overlay${sidebarOpen ? " is-visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenFontes={() => setModalFontesOpen(true)}
          onOpenAlgoritmo={() => setModalAlgoritmoOpen(true)}
        />
        <div className="app-main">
          <Header />
          <Conteudo />
        </div>
        <ModalFontesDados
          isOpen={modalFontesOpen}
          onClose={() => setModalFontesOpen(false)}
        />
        <ModalAlgoritmo
          isOpen={modalAlgoritmoOpen}
          onClose={() => setModalAlgoritmoOpen(false)}
        />
      </div>
    </PulsoProvider>
  );
}

export default App;
