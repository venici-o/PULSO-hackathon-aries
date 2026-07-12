import { createContext, useContext, useMemo, useState } from "react";
import { territorios as territoriosBase } from "../data/territorios";
import { calcularPrioridade } from "../data/priorizacao";

const PulsoContext = createContext(null);

const DECISAO_SEED = {
  id: "seed-ibura",
  territorio: "Ibura",
  prioridadeNoMomento: 94,
  prioridadeAtual: 61,
  decisao: "Aprovar recomendação",
  observacao: "Inspeção e tratamento de focos realizados nos setores prioritários.",
  timestamp: new Date("2026-06-18T09:12:00").toISOString(),
  resolvida: true,
};

export function PulsoProvider({ children }) {
  const [capacidadeEquipes, setCapacidadeEquipes] = useState(3);
  const [territorioSelecionado, setTerritorioSelecionado] = useState(null);
  const [decisoes, setDecisoes] = useState([DECISAO_SEED]);
  const [telaAtiva, setTelaAtiva] = useState("visao-geral");

  // Sinais brutos são estáticos: o cálculo em si não depende da capacidade.
  // A capacidade só desloca a linha de corte sobre a fila já ordenada.
  const territoriosOrdenados = useMemo(() => {
    return territoriosBase
      .map((territorio) => ({
        ...territorio,
        ...calcularPrioridade(territorio),
      }))
      .sort((a, b) => b.score - a.score);
  }, []);

  const cobertura = useMemo(() => {
    const somaTotal = territoriosOrdenados.reduce((acc, t) => acc + t.score, 0);
    const cobertos = territoriosOrdenados.slice(0, capacidadeEquipes);
    const restante = territoriosOrdenados.slice(capacidadeEquipes);
    const somaCoberta = cobertos.reduce((acc, t) => acc + t.score, 0);
    const percentual = somaTotal > 0 ? Math.round((somaCoberta / somaTotal) * 100) : 0;
    return { cobertos, restante, percentual, somaTotal };
  }, [territoriosOrdenados, capacidadeEquipes]);

  function registrarDecisao({ territorio, prioridadeNoMomento, decisao, observacao }) {
    setDecisoes((prev) => [
      {
        id: `${territorio}-${Date.now()}`,
        territorio,
        prioridadeNoMomento,
        decisao,
        observacao,
        timestamp: new Date().toISOString(),
        resolvida: false,
      },
      ...prev,
    ]);
  }

  function irPara(tela, territorio) {
    if (territorio !== undefined) setTerritorioSelecionado(territorio);
    setTelaAtiva(tela);
  }

  const value = {
    territoriosOrdenados,
    capacidadeEquipes,
    setCapacidadeEquipes,
    territorioSelecionado,
    setTerritorioSelecionado,
    decisoes,
    registrarDecisao,
    telaAtiva,
    setTelaAtiva,
    irPara,
    cobertura,
  };

  return <PulsoContext.Provider value={value}>{children}</PulsoContext.Provider>;
}

export function usePulso() {
  const ctx = useContext(PulsoContext);
  if (!ctx) throw new Error("usePulso deve ser usado dentro de PulsoProvider");
  return ctx;
}
