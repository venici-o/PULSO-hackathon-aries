// Refatorado: carrega bairros do backend em vez de hardcoded.
// Fallback para os 6 territórios originais se a API estiver indisponível.
import { fetchBairros } from "../services/api";

let cachedBairros = null;

export async function getBairros() {
  if (cachedBairros) return cachedBairros;
  try {
    const data = await fetchBairros();
    cachedBairros = data.bairros.map((b) => ({
      id: b.id,
      nome: b.nome,
      ds: b.ds,
      rpa: b.rpa,
      vulnerabilidade: b.vulnerabilidade_score >= 70 ? "Alto" : b.vulnerabilidade_score >= 40 ? "Médio" : "Baixo",
      historicoAgravamento: b.historico_score >= 75,
      setoresPrioritarios: ["Setor 01"], // Placeholder — SEVS fornece depois
    }));
    return cachedBairros;
  } catch (e) {
    console.warn("[bairros] API indisponível, usando fallback local.", e);
    // Fallback: territórios originais (6) para não quebrar o frontend
    return [
      { nome: "Ibura", ds: "DS III", rpa: "RPA 2", vulnerabilidade: "Alto", historicoAgravamento: true, setoresPrioritarios: ["Setor 04", "Setor 01", "Setor 07"] },
      { nome: "Cohab", ds: "DS III", rpa: "RPA 2", vulnerabilidade: "Alto", historicoAgravamento: true, setoresPrioritarios: ["Setor 02", "Setor 05"] },
      { nome: "Água Fria", ds: "DS III", rpa: "RPA 2", vulnerabilidade: "Médio", historicoAgravamento: true, setoresPrioritarios: ["Setor 03"] },
      { nome: "Várzea", ds: "DS IV", rpa: "RPA 3", vulnerabilidade: "Médio", historicoAgravamento: false, setoresPrioritarios: ["Setor 01"] },
      { nome: "Dois Unidos", ds: "DS V", rpa: "RPA 4", vulnerabilidade: "Médio", historicoAgravamento: false, setoresPrioritarios: ["Setor 06"] },
      { nome: "Afogados", ds: "DS VI", rpa: "RPA 5", vulnerabilidade: "Baixo", historicoAgravamento: false, setoresPrioritarios: ["Setor 02"] },
    ];
  }
}

// Mantém compatibilidade com import antigo
export const territorios = [];
