import { usePulso } from "../context/PulsoContext";
import BadgeClassificacao from "../components/BadgeClassificacao";

export default function TelaVisaoGeral() {
  const { capacidadeEquipes, cobertura, territoriosOrdenados, irPara } = usePulso();

  return (
    <div className="tela">
      <div className="destaque-capacidade">
        <div className="destaque-capacidade__linha1">
          Capacidade operacional hoje: {capacidadeEquipes}{" "}
          {capacidadeEquipes === 1 ? "equipe disponível" : "equipes disponíveis"}
        </div>
        <div className="destaque-capacidade__linha2">
          Com a capacidade atual, o PULSO recomenda atuação prioritária em{" "}
          {capacidadeEquipes} {capacidadeEquipes === 1 ? "território" : "territórios"}.
        </div>
      </div>

      <div className="visao-geral__grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card metrica-cobertura">
            <div className="metrica-cobertura__valor">{cobertura.percentual}%</div>
            <div className="metrica-cobertura__rotulo">
              do risco crítico identificado com cobertura potencial
            </div>
          </div>

          <div className="card recomendacao-lista">
            {cobertura.cobertos.map((territorio, i) => (
              <div
                key={territorio.nome}
                className="recomendacao-lista__item"
                onClick={() => irPara("explicacao", territorio.nome)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="recomendacao-lista__posicao">{i + 1}</span>
                  <span className="recomendacao-lista__nome">{territorio.nome}</span>
                </div>
                <div className="recomendacao-lista__meta">
                  <span className="recomendacao-lista__score">
                    Prioridade operacional {territorio.score}/100
                  </span>
                  <BadgeClassificacao classificacao={territorio.classificacao} />
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn--primary" style={{ alignSelf: "flex-start" }} onClick={() => irPara("explicacao", territoriosOrdenados[0]?.nome)}>
            Entender esta priorização
          </button>
        </div>

        <div className="card grade-territorial">
          <div className="grade-territorial__titulo">Territórios monitorados</div>
          <div className="grade-territorial__grid">
            {territoriosOrdenados.map((territorio) => (
              <div
                key={territorio.nome}
                className="grade-territorial__celula"
                style={{
                  background: `var(--${territorio.classificacao.chave}-bg)`,
                  color: `var(--${territorio.classificacao.chave})`,
                  cursor: "pointer",
                }}
                onClick={() => irPara("explicacao", territorio.nome)}
              >
                {territorio.nome}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="tela__mensagem">
        Tenho {capacidadeEquipes} equipes. O PULSO está me dizendo onde colocá-las.
      </p>
    </div>
  );
}
