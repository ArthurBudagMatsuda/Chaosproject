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

## Arquivos principais

- `src/components/hero.tsx` e `attractor.tsx`: experiência principal e visualização.
- `src/lib/chaos-simulation.ts`: estado da simulação local.
- `src/lib/live-chaos-source.ts`: interface somente de leitura para o modo Live.
- `src/server/market/`: scanner, provedor, filtros, cálculo, persistência e APIs.
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

Não existe smart contract, conexão com carteira, compra, assinatura ou distribuição real. O índice é uma métrica experimental do projeto, não uma medida científica de caos ou previsão de preço. O futuro programa Solana deve ser responsável por gatilhos financeiros, aleatoriedade verificável, seleção, distribuição e ciclos; o site deve apenas ler e exibir esses estados.
