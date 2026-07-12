export default function BadgeClassificacao({ classificacao }) {
  return (
    <span className={`badge badge--${classificacao.chave}`}>
      {classificacao.rotulo}
    </span>
  );
}
