// Configuração de dados do app.
// Ano com dados reais do SINAN em cache. A semana epidemiológica default é
// uma semana em plena temporada (dados robustos) para a visão inicial.
export const ANO_DADOS = 2025;
export const SEMANA_PADRAO = `${ANO_DADOS}-W20`;

// Horizontes de previsão (semanas à frente) e skill medido no backtest
// (precisão@10 vs baseline de persistência). Serve para a UI mostrar
// honestamente até onde confiar em cada horizonte.
// Formata um código de semana epidemiológica YYYYWW -> "semana NN/YYYY".
export function formatSemana(cod) {
  if (!cod) return "—";
  const ano = Math.floor(cod / 100);
  const semana = String(cod % 100).padStart(2, "0");
  return `semana ${semana}/${ano}`;
}

export const HORIZONTE_PADRAO = 1;
export const HORIZONTES = [
  { valor: 1, label: "próxima semana", skill: 0.63 },
  { valor: 2, label: "2 semanas", skill: 0.62 },
  { valor: 3, label: "3 semanas", skill: 0.59 },
  { valor: 4, label: "4 semanas", skill: 0.58 },
];
