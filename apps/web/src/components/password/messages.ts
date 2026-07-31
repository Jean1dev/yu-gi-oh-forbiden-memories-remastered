export const PASSWORD_MESSAGES = {
  catalogUnavailable: "Não foi possível carregar as cartas. Tente novamente.",
  walletUnavailable:
    "Não foi possível carregar seu saldo. O preço é exibido, mas a liberação fica indisponível.",
  sessionMissing: "Faça login para ver seu saldo de estrelas.",
  cacheNotice: "Saldo carregado do cache; sincronizando…",
  notFound: "Senha inválida. Verifique o código.",
  malformed: "Senha inválida. Use apenas os números do código.",
  releaseUnavailable: "A liberação está indisponível.",
  insufficientStars: (price: number, balance: number) => `Estrelas insuficientes: esta carta custa ${price.toLocaleString("pt-BR")}⭐, você tem ${balance.toLocaleString("pt-BR")}⭐.`,
  releaseFailed: "Não foi possível concluir a liberação. Seu saldo não foi alterado. Tente novamente.",
  sessionExpired: "Faça login novamente para liberar cartas.",
  queuedOffline: "Liberação pendente: será concluída quando você voltar a ficar online.",
} as const;
