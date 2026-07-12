import { usePulso } from "../context/PulsoContext";
import { PESOS_PRIORIZACAO } from "../data/priorizacao";
import BadgeClassificacao from "../components/BadgeClassificacao";

const SINAIS = [
  { chave: "tendenciaEpidemiologica", nome: "Tendência epidemiológica" },
  { chave: "condicoesClimaticas", nome: "Condições climáticas" },
  { chave: "focosIdentificados", nome: "Focos identificados" },
  { chave: "vulnerabilidadeTerritorial", nome: "Vulnerabilidade territorial" },
  { chave: "historico", nome: "Histórico de agravamento" },
];

export default function TelaExplicacao() {
  const { territoriosOrdenados, territorioSelecionado, irPara } = usePulso();
  const territorio =
    territoriosOrdenados.find((t) => t.nome === territorioSelecionado) ??
    territoriosOrdenados[0];

  if (!territorio) return null;

  return (
    <div className="tela">
      <p className="tela__mensagem">
        O PULSO recomenda, mas também explica por que está recomendando.
      </p>

      <div className="card explicacao__cabecalho">
        <div>
          <div className="explicacao__nome">{territorio.nome}</div>
          <div className="explicacao__score">
            Prioridade operacional {territorio.score}/100
          </div>
        </div>
        <div className="explicacao__badges">
          <BadgeClassificacao classificacao={territorio.classificacao} />
          <span className="badge-confianca">Confiança da análise: Alta</span>
        </div>
      </div>

      <div className="card contribuicoes">
        <div className="contribuicoes__titulo">Contribuição dos sinais nesta análise</div>
        {SINAIS.map((sinal) => {
          const contribuicao = territorio.contribuicoes[sinal.chave];
          const peso = PESOS_PRIORIZACAO[sinal.chave];
          const maximo = peso * 100;
          const largura = Math.round((contribuicao / maximo) * 100);
          return (
            <div className="contribuicao-barra" key={sinal.chave}>
              <div className="contribuicao-barra__topo">
                <span className="contribuicao-barra__nome">{sinal.nome}</span>
                <span className="contribuicao-barra__valor">
                  {contribuicao.toFixed(1)} de {maximo.toFixed(0)} pts (peso {Math.round(peso * 100)}%)
                </span>
              </div>
              <div className="contribuicao-barra__trilho">
                <div
                  className="contribuicao-barra__preenchimento"
                  style={{ width: `${largura}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="nota-metodologica">
        Valores demonstrativos. A metodologia de priorização deverá ser calibrada e
        validada em conjunto com os profissionais da Vigilância em Saúde.
      </div>

      <button
        className="btn btn--primary"
        style={{ alignSelf: "flex-start" }}
        onClick={() => irPara("recomendacao", territorio.nome)}
      >
        Ver recomendação
      </button>
    </div>
  );
}
