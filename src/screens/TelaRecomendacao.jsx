import { useState } from "react";
import { usePulso } from "../context/PulsoContext";
import BadgeClassificacao from "../components/BadgeClassificacao";

const ACOES_POR_TERRITORIO = {
  critico: [
    "Ativação de equipes de campo para eliminação de focos",
    "Notificação da Secretaria de Saúde para mobilização de recursos extras",
    "Realização de visitas domiciliares com foco nos bairros mais vulneráveis",
    "Reunião com agentes de saúde para reforço da estratégia de combate",
    "Ação integrada com demais secretarias para ampliação da cobertura",
    "Realização de bloquios químicos e eliminação de criadouros",
  ],
  alto: [
    "Ativação de equipes de campo para eliminação de focos",
    "Reunião com agentes de saúde para reforço da estratégia de combate",
    "Ação integrada com demais secretarias para ampliação da cobertura",
    "Monitoramento de áreas de risco e realização de bloquios",
  ],
  moderado: [
    "Monitoramento de áreas de risco e realização de bloquios",
    "Reunião com agentes de saúde para reforço da estratégia de combate",
  ],
  baixo: [
    "Monitoramento de áreas de risco e realização de bloquios",
  ],
};

const RECURSOS_POR_ACAO = {
  "Ativação de equipes de campo para eliminação de focos": [
    "1 coordenador", "2 agentes de campo", "3 técnicos de saúde", "4 jornais",
  ],
  "Notificação da Secretaria de Saúde para mobilização de recursos extras": [
    "Suporte logístico do PACS", "Veículos oficiais", "Materiais de campo",
  ],
  "Realização de visitas domiciliares com foco nos bairros mais vulneráveis": [
    "1 coordenador", "2 agentes de campo", "3 técnicos de saúde", "4 jornais",
  ],
  "Reunião com agentes de saúde para reforço da estratégia de combate": [
    "1 coordenador", "2 agentes de campo", "3 técnicos de saúde", "4 jornais",
  ],
  "Ação integrada com demais secretarias para ampliação da cobertura": [
    "Suporte logístico do PACS", "Veículos oficiais", "Materiais de campo",
  ],
  "Realização de bloquios químicos e eliminação de criadouros": [
    "1 coordenador", "2 agentes de campo", "3 técnicos de saúde", "4 jornais",
  ],
  "Monitoramento de áreas de risco e realização de bloquios": [
    "1 coordenador", "2 agentes de campo", "3 técnicos de saúde", "4 jornais",
  ],
};

const SETORES = [
  { nome: "Saúde", cor: "#1e40af", bg: "#dbeafe" },
  { nome: "Meio Ambiente", cor: "#166534", bg: "#dcfce7" },
  { nome: "Assistência Social", cor: "#9a3412", bg: "#ffedd5" },
  { nome: "Comunicação", cor: "#7c3aed", bg: "#ede9fe" },
];

export default function TelaRecomendacao() {
  const { territoriosOrdenados, territorioSelecionado, capacidadeEquipes, irPara } = usePulso();
  const territorio =
    territoriosOrdenados.find((t) => t.nome?.toUpperCase() === territorioSelecionado?.toUpperCase()) ??
    territoriosOrdenados[0];

  const [acoesSelecionadas, setAcoesSelecionadas] = useState(new Set());

  if (!territorio) return null;

  const acoesDisponiveis = ACOES_POR_TERRITORIO[territorio.classificacao?.chave || "baixo"];

  const toggleAcao = (acao) => {
    setAcoesSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(acao)) novo.delete(acao);
      else novo.add(acao);
      return novo;
    });
  };

  const totalRecursos = Array.from(acoesSelecionadas).reduce((sum, acao) => {
    const recursos = RECURSOS_POR_ACAO[acao] || [];
    return sum + recursos.length;
  }, 0);

  const recursosReaisDisponiveis = capacidadeEquipes * 2;
  const sobrecarga = totalRecursos > recursosReaisDisponiveis;
  const numSelecionadas = acoesSelecionadas.size;

  return (
    <div className="tela">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        Prioridades / {territorio.nome} / Recomendação de ação
      </div>

      {/* Card de destaque do território */}
      <div className={`card rec-hero rec-hero--${territorio.classificacao?.chave || "baixo"}`}>
        <div className="rec-hero__left">
          <div className="rec-hero__nome">{territorio.nome}</div>
          <div className="rec-hero__meta">
            <span className="rec-hero__ds">DS {territorio.ds}</span>
            <span className="rec-hero__score">Score {territorio.score}/100</span>
          </div>
        </div>
        <div className="rec-hero__right">
          <BadgeClassificacao classificacao={territorio.classificacao} />
        </div>
      </div>

      {/* Ações recomendadas */}
      <div className="card rec-acoes-card">
        <div className="rec-acoes-header">
          <div className="rec-acoes-titulo">
            Ações recomendadas
            <span className="rec-acoes-badge">{acoesDisponiveis.length}</span>
          </div>
          <div className="rec-acoes-sub">
            {numSelecionadas} de {acoesDisponiveis.length} selecionadas
          </div>
        </div>

        <div className="rec-acoes-lista">
          {acoesDisponiveis.map((acao) => {
            const selecionada = acoesSelecionadas.has(acao);
            return (
              <div
                key={acao}
                className={`rec-acao ${selecionada ? "rec-acao--selecionada" : ""}`}
                onClick={() => toggleAcao(acao)}
              >
                <div className={`rec-acao__check ${selecionada ? "rec-acao__check--checked" : ""}`}>
                  {selecionada && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="rec-acao__texto">{acao}</div>
                {selecionada && (
                  <span className="rec-acao__tag">Selecionada</span>
                )}
              </div>
            );
          })}
        </div>

        {sobrecarga && (
          <div className="rec-alert">
            <div className="rec-alert__icon">⚠</div>
            <div className="rec-alert__texto">
              <strong>Recursos insuficientes</strong> — {totalRecursos} recursos necessários,
              mas apenas {recursosReaisDisponiveis} disponíveis.
              Desmarque ações ou ajuste a capacidade operacional.
            </div>
          </div>
        )}
      </div>

      {/* Recursos e Setores */}
      <div className="rec-grid">
        {/* Recursos necessários */}
        <div className="card rec-recursos-card">
          <div className="rec-secao-titulo">
            <span className="rec-secao-titulo__icon">📦</span>
            Recursos necessários
          </div>

          {numSelecionadas === 0 ? (
            <div className="rec-vazio">
              <div className="rec-vazio__icon">📋</div>
              <div className="rec-vazio__titulo">Nenhuma ação selecionada</div>
              <div className="rec-vazio__texto">
                Clique nas ações acima para visualizar os recursos que serão mobilizados.
              </div>
            </div>
          ) : (
            <div className="rec-recursos-lista">
              {Array.from(acoesSelecionadas).map((acao) => (
                <div key={acao} className="rec-recurso-grupo">
                  <div className="rec-recurso-grupo__titulo">{acao}</div>
                  <div className="rec-recurso-tags">
                    {(RECURSOS_POR_ACAO[acao] || []).map((r) => (
                      <span key={r} className="rec-recurso-tag">{r}</span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rec-recurso-total">
                Total estimado: <strong>{totalRecursos} recursos</strong>
              </div>
            </div>
          )}
        </div>

        {/* Setores envolvidos */}
        <div className="card rec-setores-card">
          <div className="rec-secao-titulo">
            <span className="rec-secao-titulo__icon">🏛️</span>
            Setores envolvidos
          </div>

          <div className="rec-setores-lista">
            {SETORES.map((s) => (
              <div
                key={s.nome}
                className="rec-setor"
                style={{ borderColor: s.cor, background: s.bg }}
              >
                <span className="rec-setor__dot" style={{ background: s.cor }} />
                <span className="rec-setor__nome" style={{ color: s.cor }}>{s.nome}</span>
              </div>
            ))}
          </div>

          <button
            className="btn btn--primary btn--block"
            style={{ marginTop: 20 }}
            onClick={() => irPara("planejamento")}
          >
            Ajustar capacidade operacional
          </button>
        </div>
      </div>
    </div>
  );
}
