# lobby.

Gestão de pessoas para empresas brasileiras. SaaS B2B multi-tenant: cada empresa tem seus colaboradores, sua estrutura e seus acessos, isolados das demais.

## O que já funciona

- **Conta da empresa**: cadastro, login e sessão com renovação automática.
- **Estrutura**: departamentos (com responsável), cargos e filiais.
- **Colaboradores**: cadastro, edição, gestor direto, busca, filtros, paginação, desligamento e exclusão com histórico preservado.
- **Acessos**: convite por link com papel (administrador, RH, gestor, colaborador), troca de papel e remoção de acesso.
- **Permissões por papel**: o RH vê todos; o gestor vê a si e à equipe direta; o colaborador vê só o próprio perfil. Dados sensíveis (CPF, telefone, nascimento) só para o RH e para a própria pessoa.
- **Documentos**: contratos, atestados e outros arquivos por colaborador, enviados direto para o S3 (até 20 MB, PDF, imagem ou DOCX), com vencimento opcional e download por link temporário. O RH vê todos; cada pessoa vê só os seus.
- **LinkedIn**: link do perfil no cadastro, importação do PDF do perfil (cargo, experiências, formação e competências, com prévia antes de salvar) e "Entrar com LinkedIn" para quem conectou a conta.
- **Auditoria**: login, cadastros e alterações ficam registrados, sem dados pessoais no registro.

Em seguida: férias, benefícios, onboarding, ponto e relatórios.

## Stack

| Camada | Tecnologia                                                                 |
| ------ | -------------------------------------------------------------------------- |
| Web    | Next.js 16, React 19, Tailwind 4, shadcn/ui (Base UI), TanStack Query, RHF |
| API    | NestJS 12 com Fastify, Prisma 7, Zod 4, Pino, Swagger                      |
| Dados  | PostgreSQL 16, Redis 7, S3 (SeaweedFS no ambiente local)                   |
| Testes | Vitest e Supertest, contra Postgres e Redis reais                          |
| Infra  | Docker Compose, GitHub Actions                                             |

## Rodar localmente

Requisitos: Node 22 (`.nvmrc`), pnpm 11 e Docker.

```bash
cp .env.example .env
# preencha JWT_ACCESS_SECRET com: openssl rand -base64 48

docker compose up -d                 # postgres, redis e s3
pnpm install                         # também gera o Prisma Client e compila @lobby/types
pnpm --filter @lobby/api db:deploy   # aplica as migrations
pnpm dev                             # web em :3000, api em :3001
```

Abra http://localhost:3000/register para criar a primeira empresa. A documentação da API fica em http://localhost:3001/api/docs.

Para os testes da API, aplique as migrations também no banco de testes:

```bash
DATABASE_URL=postgresql://lobby:lobby@localhost:5432/lobby_test pnpm --filter @lobby/api db:deploy
```

## Scripts

| Comando                               | O que faz                             |
| ------------------------------------- | ------------------------------------- |
| `pnpm dev`                            | Web, API e tipos em modo watch        |
| `pnpm dev:site`                       | Site de apresentação em :3002         |
| `pnpm test`                           | Testes de todos os pacotes            |
| `pnpm lint` / `pnpm typecheck`        | ESLint e TypeScript                   |
| `pnpm format`                         | Prettier                              |
| `pnpm build`                          | Build de produção                     |
| `pnpm --filter @lobby/api db:migrate` | Cria uma migration a partir do schema |

Antes de abrir um PR, o mesmo que o CI roda:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Estrutura

```
apps/
  web/     produto (Next.js): src/app para rotas, src/features por domínio, src/components/common
  api/     API (NestJS): src/modules por domínio, prisma/ com schema e migrations, test/ e2e
  site/    landing page
packages/
  types/          contrato entre web e API: schemas Zod, tipos, papéis e permissões
  eslint-config/  e tsconfig/: configurações compartilhadas
docker/           init do Postgres e config do S3 local
```

## Como funciona

- **Mesma origem**: o Next encaminha `/api/v1/*` para a API, então o cookie de sessão é do próprio site e o CORS fica restrito.
- **Sessão**: access token JWT de 15 minutos, mantido só em memória no navegador; refresh token opaco em cookie `httpOnly`, trocado a cada uso. Se um token já usado aparecer de novo, a sessão inteira é revogada.
- **Isolamento entre empresas**: a empresa vem sempre da sessão, nunca do corpo da requisição. Registro de outra empresa responde 404. Uma suíte de testes dedicada tenta acessar dados de outra empresa em cada recurso.
- **Permissões**: mapa único de papel para permissões em `packages/types`, checado por guards globais na API e usado pelo web para esconder ações.
- **Validação**: os mesmos schemas Zod validam o formulário no web e a entrada na API.
- **Segurança**: senhas com Argon2id, rate limit em Redis no login e no cadastro, CSP com nonce no web, headers de segurança na API e logs sem tokens nem dados pessoais.

## Variáveis de ambiente

Todas estão em `.env.example`, com valores que funcionam com o `docker compose`. A API valida as variáveis ao subir e não inicia se faltar alguma. As que pedem atenção:

| Variável            | Para quê                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET` | Assina os access tokens. Mínimo de 32 caracteres                             |
| `APP_URL`           | Endereço público do web, usado nos links de convite                          |
| `CORS_ORIGINS`      | Origens aceitas pela API (separadas por vírgula)                             |
| `TRUST_PROXY`       | Quem pode informar o IP real do cliente. Em produção, a faixa do balanceador |
| `SENTRY_DSN`        | Opcional. Ativa o Sentry na API                                              |
