// Valores demonstrativos definidos pela equipe. A metodologia de priorização
// deverá ser calibrada e validada em conjunto com profissionais da Vigilância em Saúde.
export const PESOS_PRIORIZACAO = {
  tendenciaEpidemiologica: 0.35,
  condicoesClimaticas: 0.25,
  focosIdentificados: 0.2,
  vulnerabilidadeTerritorial: 0.15,
  historico: 0.05,
};

const VULNERABILIDADE_SCORE = { Alto: 90, Médio: 60, Baixo: 30 };

const clamp = (valor, min, max) => Math.min(max, Math.max(min, valor));

export function classificarPrioridade(score) {
  if (score >= 85) return { rotulo: "Crítico", chave: "critico" };
  if (score >= 70) return { rotulo: "Alto", chave: "alto" };
  if (score >= 50) return { rotulo: "Moderado", chave: "moderado" };
  return { rotulo: "Baixo", chave: "baixo" };
}

export function calcularPrioridade(territorio) {
  const tendenciaEpidemiologica = clamp(
    ((territorio.casosSemanaAtual / territorio.casosSemanaAnterior) - 1) * 100 + 50,
    0,
    100,
  );
  const condicoesClimaticas = clamp(
    (territorio.chuvaAcumuladaMm / territorio.chuvaMediaHistoricaMm) * 50,
    0,
    100,
  );
  const focosIdentificados = clamp(
    (territorio.focosAtuais / territorio.focosMediaArea) * 50,
    0,
    100,
  );
  const vulnerabilidadeTerritorial = VULNERABILIDADE_SCORE[territorio.vulnerabilidade] ?? 0;
  const historico = territorio.historicoAgravamento === true ? 100 : 50;

  const componentes = {
    tendenciaEpidemiologica,
    condicoesClimaticas,
    focosIdentificados,
    vulnerabilidadeTerritorial,
    historico,
  };

  const scoreExato =
    componentes.tendenciaEpidemiologica * PESOS_PRIORIZACAO.tendenciaEpidemiologica +
    componentes.condicoesClimaticas * PESOS_PRIORIZACAO.condicoesClimaticas +
    componentes.focosIdentificados * PESOS_PRIORIZACAO.focosIdentificados +
    componentes.vulnerabilidadeTerritorial * PESOS_PRIORIZACAO.vulnerabilidadeTerritorial +
    componentes.historico * PESOS_PRIORIZACAO.historico;

  const score = Math.round(scoreExato);

  const contribuicoes = {
    tendenciaEpidemiologica: componentes.tendenciaEpidemiologica * PESOS_PRIORIZACAO.tendenciaEpidemiologica,
    condicoesClimaticas: componentes.condicoesClimaticas * PESOS_PRIORIZACAO.condicoesClimaticas,
    focosIdentificados: componentes.focosIdentificados * PESOS_PRIORIZACAO.focosIdentificados,
    vulnerabilidadeTerritorial: componentes.vulnerabilidadeTerritorial * PESOS_PRIORIZACAO.vulnerabilidadeTerritorial,
    historico: componentes.historico * PESOS_PRIORIZACAO.historico,
  };

  return {
    score,
    classificacao: classificarPrioridade(score),
    componentes,
    contribuicoes,
  };
}
