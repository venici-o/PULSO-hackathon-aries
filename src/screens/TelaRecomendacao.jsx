import { useState } from "react";
import { usePulso } from "../context/PulsoContext";
import ModalDecisao from "../components/ModalDecisao";

function montarJustificativa(territorio) {
  const partes = [];
  const crescimentoCasos = territorio.casosSemanaAtual - territorio.casosSemanaAnterior;

  const sinaisOrdenados = [
    {
      chave: "tendenciaEpidemiologica",
      texto: `os casos na semana atual (${territorio.casosSemanaAtual}) ${
        crescimentoCasos >= 0 ? "subiram frente aos" : "recuaram frente aos"
      } ${territorio.casosSemanaAnterior} da semana anterior`,
    },
    {
      chave: "condicoesClimaticas",
      texto: `o acumulado de chuva (${territorio.chuvaAcumuladaMm}mm) está acima da média histórica da área (${territorio.chuvaMediaHistoricaMm}mm)`,
    },
    {
      chave: "focosIdentificados",
      texto: `foram identificados ${territorio.focosAtuais} focos, frente a uma média de ${territorio.focosMediaArea} para a área`,
    },
  ].sort((a, b) => territorio.contribuicoes[b.chave] - territorio.contribuicoes[a.chave]);

  sinaisOrdenados.forEach((s) => partes.push(s.texto));

  return `A recomendação para ${territorio.nome} considera principalmente que ${partes[0]}. Também pesam nesta análise: ${partes[1]} e ${partes[2]}. A vulnerabilidade territorial (${territorio.vulnerabilidade.toLowerCase()}) e o histórico de agravamento reforçam a prioridade operacional atribuída.`;
}

export default function TelaRecomendacao() {
  const { territoriosOrdenados, territorioSelecionado } = usePulso();
  const [modalAberto, setModalAberto] = useState(false);

  const territorio =
    territoriosOrdenados.find((t) => t.nome === territorioSelecionado) ??
    territoriosOrdenados[0];

  if (!territorio) return null;

  const setores = territorio.setoresPrioritarios;
  const localTexto =
    setores.length > 1
      ? `Setores ${setores.slice(0, -1).map((s) => s.replace("Setor ", "")).join(", ")} e ${setores[setores.length - 1].replace("Setor ", "")} do ${territorio.nome}`
      : `${setores[0]} do ${territorio.nome}`;

  return (
    <div className="tela">
      <div className="card recomendacao-card">
        <div className="recomendacao-campo">
          <span className="recomendacao-campo__rotulo">Ação</span>
          <span className="recomendacao-campo__valor">Inspeção e tratamento de focos</span>
        </div>
        <div className="recomendacao-campo">
          <span className="recomendacao-campo__rotulo">Local</span>
          <span className="recomendacao-campo__valor">{localTexto}</span>
        </div>
        <div className="recomendacao-campo">
          <span className="recomendacao-campo__rotulo">Urgência</span>
          <span className="recomendacao-campo__valor">Iniciar nas próximas 24 horas</span>
        </div>
        <div className="recomendacao-campo">
          <span className="recomendacao-campo__rotulo">Recursos</span>
          <span className="recomendacao-campo__valor">
            1 equipe · 6 agentes · 1 veículo · 1 dia estimado
          </span>
        </div>
      </div>

      <div className="card justificativa">
        <div className="justificativa__titulo">Recomendação contextualizada</div>
        {montarJustificativa(territorio)}
      </div>

      <div className="rodape-decisao">
        <span className="rodape-decisao__nota">O sistema recomenda. O profissional decide.</span>
        <button className="btn btn--primary" onClick={() => setModalAberto(true)}>
          Registrar decisão
        </button>
      </div>

      {modalAberto && (
        <ModalDecisao territorio={territorio} onFechar={() => setModalAberto(false)} />
      )}
    </div>
  );
}
