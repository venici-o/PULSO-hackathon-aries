import { useState } from "react";
import { usePulso } from "../context/PulsoContext";

const OPCOES = [
  "Aprovar recomendação",
  "Aprovar com ajustes",
  "Manter em monitoramento",
  "Não executar",
];

export default function ModalDecisao({ territorio, onFechar }) {
  const { registrarDecisao } = usePulso();
  const [opcaoSelecionada, setOpcaoSelecionada] = useState(OPCOES[0]);
  const [observacao, setObservacao] = useState("");

  function confirmar() {
    registrarDecisao({
      territorio: territorio.nome,
      prioridadeNoMomento: territorio.score,
      decisao: opcaoSelecionada,
      observacao,
    });
    onFechar();
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__titulo">Registrar decisão — {territorio.nome}</div>

        <div className="modal__opcoes">
          {OPCOES.map((opcao) => (
            <label
              key={opcao}
              className={`modal__opcao${
                opcaoSelecionada === opcao ? " modal__opcao--selecionada" : ""
              }`}
            >
              <input
                type="radio"
                name="opcao-decisao"
                checked={opcaoSelecionada === opcao}
                onChange={() => setOpcaoSelecionada(opcao)}
              />
              {opcao}
            </label>
          ))}
        </div>

        <textarea
          className="modal__textarea"
          placeholder="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
          O sistema recomenda. O profissional decide.
        </p>

        <div className="modal__acoes">
          <button className="btn btn--secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={confirmar}>
            Confirmar decisão
          </button>
        </div>
      </div>
    </div>
  );
}
