import { usePulso } from "../context/PulsoContext";
import BadgeClassificacao from "../components/BadgeClassificacao";

export default function TelaPrioridades() {
  const { territoriosOrdenados, capacidadeEquipes, irPara } = usePulso();

  return (
    <div className="tela">
      <p className="tela__mensagem">
        O PULSO não apenas identifica risco. Ele organiza a ordem operacional de
        atuação.
      </p>

      <div className="fila-lista">
        {territoriosOrdenados.map((territorio, i) => {
          const posicao = i + 1;
          const coberto = posicao <= capacidadeEquipes;
          return (
            <div className="fila-grupo" key={territorio.nome}>
              <div
                className="card fila-item"
                onClick={() => irPara("explicacao", territorio.nome)}
              >
                <span className="fila-item__posicao">{posicao}</span>
                <div className="fila-item__corpo">
                  <span className="fila-item__nome">{territorio.nome}</span>
                  <span className="fila-item__score">
                    Prioridade operacional {territorio.score}/100
                  </span>
                </div>
                <div className="fila-item__direita">
                  <BadgeClassificacao classificacao={territorio.classificacao} />
                  <span
                    className={`badge-status badge-status--${
                      coberto ? "coberto" : "acompanhamento"
                    }`}
                  >
                    {coberto ? "COBERTO" : "ACOMPANHAMENTO"}
                  </span>
                </div>
              </div>

              {posicao === capacidadeEquipes && (
                <div className="linha-corte">
                  LIMITE DA CAPACIDADE ATUAL — {capacidadeEquipes}{" "}
                  {capacidadeEquipes === 1 ? "EQUIPE" : "EQUIPES"}
                  <div className="linha-corte__nota">
                    Territórios abaixo da linha permanecem em acompanhamento com a
                    capacidade operacional atual.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
