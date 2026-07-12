import { useEffect, useRef, useState } from "react";
import { usePulso } from "../context/PulsoContext";
import BadgeClassificacao from "../components/BadgeClassificacao";

const MIN_EQUIPES = 1;
const MAX_EQUIPES = 6;

export default function TelaPlanejamento() {
  const { capacidadeEquipes, setCapacidadeEquipes, cobertura, territoriosOrdenados } =
    usePulso();

  const anteriorRef = useRef({ capacidade: capacidadeEquipes, percentual: cobertura.percentual });
  const [comparativo, setComparativo] = useState(null);

  useEffect(() => {
    const anterior = anteriorRef.current;
    if (anterior.capacidade !== capacidadeEquipes) {
      setComparativo({
        deltaEquipes: capacidadeEquipes - anterior.capacidade,
        percentualAnterior: anterior.percentual,
        percentualNovo: cobertura.percentual,
        deltaPercentual: cobertura.percentual - anterior.percentual,
      });
      anteriorRef.current = { capacidade: capacidadeEquipes, percentual: cobertura.percentual };
    }
  }, [capacidadeEquipes, cobertura.percentual]);

  return (
    <div className="tela">
      <p className="tela__mensagem">
        Quando a capacidade muda, o PULSO recalcula a cobertura e a linha de corte
        operacional.
      </p>

      <div className="card stepper-card">
        <div className="stepper">
          <button
            className="stepper__botao"
            onClick={() => setCapacidadeEquipes((c) => Math.max(MIN_EQUIPES, c - 1))}
            disabled={capacidadeEquipes <= MIN_EQUIPES}
            aria-label="Diminuir capacidade"
          >
            −
          </button>
          <div className="stepper__valor" key={capacidadeEquipes}>
            {capacidadeEquipes}
          </div>
          <button
            className="stepper__botao"
            onClick={() => setCapacidadeEquipes((c) => Math.min(MAX_EQUIPES, c + 1))}
            disabled={capacidadeEquipes >= MAX_EQUIPES}
            aria-label="Aumentar capacidade"
          >
            +
          </button>
        </div>
        <div className="stepper__legenda">
          Equipes disponíveis para atuação hoje (mín. {MIN_EQUIPES}, máx. {MAX_EQUIPES})
        </div>
      </div>

      {comparativo && comparativo.deltaEquipes !== 0 && (
        <div className="card comparativo" key={`${capacidadeEquipes}-${cobertura.percentual}`}>
          <div className="comparativo__delta">
            {comparativo.deltaEquipes > 0 ? "+" : ""}
            {comparativo.deltaEquipes} {Math.abs(comparativo.deltaEquipes) === 1 ? "equipe" : "equipes"}{" "}
            → {comparativo.deltaPercentual > 0 ? "+" : ""}
            {comparativo.deltaPercentual} p.p. de cobertura potencial
          </div>
          <div className="comparativo__texto">
            A mobilização de {Math.abs(comparativo.deltaEquipes)}{" "}
            {Math.abs(comparativo.deltaEquipes) === 1 ? "equipe adicional" : "equipes adicionais"}{" "}
            {comparativo.deltaEquipes >= 0 ? "ampliaria" : "reduziria"} a cobertura potencial
            das prioridades de {comparativo.percentualAnterior}% para {comparativo.percentualNovo}%.
          </div>
        </div>
      )}

      <div className="planejamento__grid">
        <div className="card mini-fila">
          <div className="mini-fila__titulo">
            Cobertos com a capacidade atual ({cobertura.cobertos.length})
          </div>
          {cobertura.cobertos.map((territorio) => (
            <div className="mini-fila__item" key={territorio.nome}>
              <span>{territorio.nome}</span>
              <BadgeClassificacao classificacao={territorio.classificacao} />
            </div>
          ))}
        </div>

        <div className="card mini-fila">
          <div className="mini-fila__titulo">
            Em acompanhamento ({cobertura.restante.length})
          </div>
          {cobertura.restante.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Todos os territórios estão cobertos pela capacidade atual.
            </div>
          ) : (
            cobertura.restante.map((territorio) => (
              <div className="mini-fila__item" key={territorio.nome}>
                <span>{territorio.nome}</span>
                <BadgeClassificacao classificacao={territorio.classificacao} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "16px 20px", fontSize: 13, color: "var(--text-secondary)" }}>
        Linha de corte operacional: posição {cobertura.cobertos.length} de{" "}
        {territoriosOrdenados.length} territórios na fila dinâmica de prioridades.
      </div>
    </div>
  );
}
