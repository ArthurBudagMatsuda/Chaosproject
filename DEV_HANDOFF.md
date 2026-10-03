# Entrega técnica — CHAOS

## Ambiente

- Node.js 24 LTS e pnpm.
- Next.js App Router, TypeScript, Tailwind CSS, Framer Motion e Lucide.
- `pnpm install` instala as dependências do lockfile.
- `pnpm dev` abre o frontend em http://localhost:3000.
- Em outro terminal, execute `pnpm market:scan` para atualizar os dados reais.
- Opcionalmente copie `.env.example` para `.env.local` para alterar os parâmetros. Não versione credenciais.

## Estado da entrega

Homepage com identidade visual, narrativa, vórtice que cresce conforme o índice, carrossel do mecanismo e cursor padrão do navegador. A documentação possui `/docs` e oito páginas independentes. O modo de simulação mantém seu controle local; Live Mode lê o backend sem slider.

O backend consulta DEX Screener, acompanha uma amostra de tokens Solana, aplica filtros configuráveis e calcula um índice experimental com cinco componentes. Os endereços solicitados pelo projeto ficam em `src/server/market/seed-tokens.ts`; acompanhamento não garante elegibilidade.

Os endpoints `GET /api/chaos`, `GET /api/tokens` e `GET /api/events` leem os snapshots persistidos. Não iniciam consultas externas. Dados indisponíveis, em aquecimento ou antigos têm status explícito. Eventos de limiar são simulados.

Uma camada financeira separada monitora `CHAOS_TOKEN_CA` e `FEE_WALLET_CA` via Solana RPC. O threshold começa em 5 SOL e calcula apenas disponibilidade e valor informativo. O painel protegido em `/admin` registra transferências feitas manualmente depois de verificar o TXID, origem, destino e valor. Eventos financeiros confirmados usam `simulated: false` e permanecem separados dos eventos do índice.

## Arquivos principais

- `src/components/hero.tsx` e `attractor.tsx`: experiência principal e visualização.
- `src/lib/chaos-simulation.ts`: estado da simulação local.
- `src/lib/live-chaos-source.ts`: interface somente de leitura para o modo Live.
- `src/server/market/`: scanner, provedor, filtros, cálculo, persistência e APIs.
- `src/server/financial/`: configuração, RPC Solana, threshold, autenticação, verificação de TXID e persistência financeira.
- `src/lib/docs-content.ts`: conteúdo editorial substituível da documentação.
- `.env.example`: configuração disponível, sem segredos.
- `README.md`: fórmula, limites dos dados e detalhes de operação.

## Validação

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Implantação

O frontend e um worker contínuo devem compartilhar um diretório persistente definido por `CHAOS_DATA_DIR`. O armazenamento JSON e o lock atuais atendem a um único host. Uma implantação serverless isolada não executa o worker contínuo nem compartilha esse disco. Para múltiplos hosts, substitua a persistência por banco compartilhado e coordene o scanner com lock distribuído.

`node_modules`, `.next`, `.env.local`, `.chaos-data` e capturas locais não acompanham a entrega. O scanner recria seu estado e acumula histórico ao iniciar.

## Limite financeiro

Não existe smart contract próprio, conexão com carteira, compra, assinatura ou transferência automática. O administrador movimenta a fee wallet manualmente fora do site. O backend somente observa endereços públicos e registra uma distribuição após verificar sua transação na Solana. O índice continua sendo uma métrica experimental independente, não uma medida científica de caos, previsão de preço ou autoridade financeira.
