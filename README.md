# lobby.

Gestão de pessoas para empresas brasileiras (SaaS B2B multi-tenant). Plano: [PROJECT_PLAN.md](PROJECT_PLAN.md).

## Rodar local

```bash
cp .env.example .env        # preencha JWT_ACCESS_SECRET (openssl rand -base64 48)
docker compose up -d        # postgres, redis, s3 (SeaweedFS)
pnpm install                # gera Prisma client e compila @lobby/types
pnpm --filter @lobby/api db:deploy
DATABASE_URL=postgresql://lobby:lobby@localhost:5432/lobby_test pnpm --filter @lobby/api db:deploy  # banco dos testes
pnpm dev                    # web :3000 (/register para criar a conta), api :3001 (Swagger em /api/docs)
pnpm dev:site               # site de apresentação :3002
```

## Checks

`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Estrutura

- `apps/web`: produto (Next.js 16, shadcn/ui, TanStack Query)
- `apps/api`: API (NestJS 12 + Fastify, Prisma 7, Pino)
- `apps/site`: landing
- `packages/types`: contrato da API (compilado para `dist`)
- `packages/eslint-config`, `packages/tsconfig`: configs compartilhadas
