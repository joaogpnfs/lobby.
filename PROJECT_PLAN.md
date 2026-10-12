# Lobby — Project Plan

> Nome do produto: **Lobby** (logo "lobby."), antes chamado PeopleOS. A pasta do repositório continua `peopleos`.

## 1. Product overview

Lobby é um SaaS B2B multi-tenant de gestão de pessoas, original (inspirado em conceitos de HR Tech, sem copiar código, marca ou visual do Buk).
Escopo do MVP, conforme a spec: organizações, usuários/permissões, colaboradores, departamentos, cargos, filiais, documentos, férias, benefícios, onboarding, desligamentos, ponto, notificações, dashboard, auditoria e configurações da organização.
Fluxo-alvo: admin cria a organização → convida o RH → departamentos, cargos e filiais → colaboradores → documentos → pedido de férias → aprovação → benefícios → onboarding → dashboard.
Fora do escopo: folha de pagamento, cobrança/planos (ver Open questions).

**Escopo ampliado depois do MVP** (decidido pelo usuário em 2026-10-11, a partir de uma análise das funcionalidades do Buk e de ideias próprias). Detalhes e ordem na seção 11:

- Plataforma: portal do colaborador completo, workflows de aprovação, relatórios ampliados.
- Gestão: assinatura eletrônica de documentos, gestão de ativos, canal de denúncia, atendimento ao colaborador.
- Desenvolvimento: desempenho, comunicação interna e reconhecimento, recrutamento e seleção, treinamento.
- Equipe: chat interno por time (estilo Slack), construído do zero.
- Indicadores: KPIs definidos pela empresa e automações configuráveis.
- No radar: IA e pesquisas de clima/NR-1. Clube de descontos fora por enquanto.

## 2. Architecture

```
Browser ── Next.js (apps/web) ──rewrite /api/v1/*──► NestJS API (apps/api) ──► PostgreSQL
                                                         │  └─► S3 (presigned URLs; browser envia e baixa direto)
                                                         └─► Redis ◄── BullMQ worker (mesmo código, entrypoint worker.ts)
```

- **Mesma origem**: o Next faz rewrite de `/api/v1/*` para a API. O cookie de refresh fica first-party e o CORS só é necessário em casos excepcionais (mesmo assim é configurado com allowlist).
- **API em camadas simples**: módulo Nest por domínio (`employees`, `vacations`…), com controller fino (valida e delega), service com a regra de negócio e Prisma direto no service. Sem camada de repository genérica: o Prisma já é o repositório.
- **Worker**: mesmo app Nest com outro entrypoint (`src/worker.ts`), que só registra os processors BullMQ. Fazem deploy separado, mas compartilham o código.
- **Request context**: `nestjs-cls` (AsyncLocalStorage) guarda `{ userId, organizationId, membershipId, role, employeeId }`, preenchido pelo guard de auth.

Decisões (ADR curto, depois copiadas para `docs/architecture.md`):

| Decisão                | Escolha                                                                                                                  | Motivo                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Validação              | Schemas Zod em `packages/types`, validados na API pelo suporte nativo do Nest 12 a Standard Schema (`@Body({ schema })`) | Um contrato só, validado no front (UX) e no back (segurança). O `@nestjs/swagger` 12 gera o OpenAPI direto do Zod 4, sem `nestjs-zod`   |
| HTTP                   | NestJS 12 com adapter **Fastify**                                                                                        | Mais throughput que Express, e Pino é o logger nativo. Nada do plano depende de middleware só de Express (uploads vão direto para o S3) |
| ORM                    | Prisma 7 com `@prisma/adapter-pg`                                                                                        | Tipos gerados do schema e migrations versionadas; o adapter de driver é o padrão do Prisma 7                                            |
| Config                 | `env.ts` com Zod, sem `@nestjs/config`                                                                                   | Validação no boot e objeto tipado; o `ConfigModule` não acrescentaria nada                                                              |
| Monorepo               | pnpm workspaces, scripts `pnpm -r`                                                                                       | Turborepo só se o build ficar lento                                                                                                     |
| Hash de senha          | Argon2id (`@node-rs/argon2`)                                                                                             | Binário pré-compilado, sem node-gyp no Windows                                                                                          |
| Test runner            | Vitest em web e api (`unplugin-swc` para os decorators do Nest)                                                          | Um runner só                                                                                                                            |
| Tenant scoping         | Explícito: todo query recebe `organizationId` do contexto                                                                | Legível, sem mágica; testado por suíte cross-tenant. RLS no Postgres fica como defesa extra futura                                      |
| Remoção de colaborador | Soft delete (`deletedAt`)                                                                                                | Preserva o histórico de auditoria; a política LGPD de anonimização fica em aberto                                                       |
| S3 local               | MinIO no docker-compose                                                                                                  | Desenvolver sem credenciais AWS; endpoint configurável por `S3_ENDPOINT`                                                                |

## 3. Tech stack

- **Web**: Next.js 16 (App Router), React, TS strict, Tailwind, shadcn/ui, TanStack Query, React Hook Form, Zod.
- **API**: Node 22 LTS, NestJS 12 (Fastify), Prisma 7, PostgreSQL 16, Redis 7 (`ioredis`), BullMQ, `@nestjs/swagger`, `nestjs-pino`, `@nestjs/throttler` (storage em Redis), `@fastify/helmet`, `@aws-sdk/client-s3` + `s3-request-presigner`, `@sentry/nestjs` (ativado só se `SENTRY_DSN` estiver definido).
- **Testes**: Vitest, Supertest, Playwright.
- **Infra**: Docker, docker-compose, GitHub Actions. Alvo de deploy: AWS (seção 14).
- **Qualidade**: ESLint (flat config compartilhado), Prettier, `tsc --noEmit`.
- Versões: a última estável no início da Phase 1, fixadas no lockfile, com `packageManager` e `.nvmrc` (22).

## 4. Folder structure

```
peopleos/
├── apps/
│   ├── web/src/
│   │   ├── app/(auth)/login, register
│   │   ├── app/(app)/dashboard, employees, departments, positions, branches, documents,
│   │   │            vacations, benefits, onboarding, time, reports, settings
│   │   ├── components/ui/        # shadcn (gerado)
│   │   ├── components/common/    # DataTable, PageHeader, EmptyState, StatsCard…
│   │   ├── features/<domínio>/   # api.ts, queries.ts, mutations.ts, components/
│   │   └── lib/                  # api-client.ts, auth.ts, query-client.ts
│   └── api/
│       ├── prisma/schema.prisma, migrations/, seed.ts
│       ├── src/main.ts, worker.ts, app.module.ts
│       ├── src/common/           # errors, guards, decorators, context, pagination
│       ├── src/modules/<domínio>/ # *.module.ts, *.controller.ts, *.service.ts, *.spec.ts
│       └── test/                 # e2e Supertest (inclui tenant-isolation.e2e.ts)
├── packages/
│   ├── types/        # schemas Zod do contrato da API, enums, permissões
│   ├── eslint-config/
│   └── tsconfig/
├── e2e/              # Playwright
├── docker/           # Dockerfile.api, Dockerfile.web
├── docs/             # architecture.md, database.md, api.md, development.md
├── .github/workflows/ci.yml
├── docker-compose.yml   # postgres, redis, minio
├── .env.example, package.json, pnpm-workspace.yaml, README.md, PROJECT_PLAN.md
```

Regra para `packages/types`: só entra contrato (schemas de request/response, enums, lista de permissões). Nada de lógica de negócio.

## 5. Database model

Todos os ids são `uuid`, com `createdAt`/`updatedAt`. Toda entidade de tenant tem `organizationId` com FK.

**Plataforma**

- `User`: id, email (unique), passwordHash, name, status (ACTIVE|INVITED|DISABLED), isSuperAdmin.
- `Organization`: id, name, legalName, document, email, phone, logo, timezone.
- `OrganizationMembership`: id, userId, organizationId, role (ORG_ADMIN|HR_MANAGER|MANAGER|EMPLOYEE), status. Unique em (userId, organizationId).
- `RefreshToken`: id, userId, membershipId, tokenHash, familyId, expiresAt, revokedAt, replacedById.

**Pessoas**

- `Employee`: campos da spec + `userId?` (vínculo com a conta; unique em (organizationId, userId)) + `terminationReason?` + `deletedAt?`. Self-relation `managerId`.
- `Department` (com managerId → Employee), `Position` (level), `Branch`.

**Domínios**

- `Document`: campos da spec + `expiresAt?` (exigido pelos casos "Documents expiring" do dashboard e das notificações). status: PENDING_UPLOAD|AVAILABLE|DELETED.
- `VacationRequest`: employeeId, startDate, endDate (date), days, reason, status, requestedById, approverId?, decidedAt?, decisionComment?.
  - **Constraint no banco** contra sobreposição: `EXCLUDE USING gist (employee_id WITH =, daterange(start_date,end_date,'[]') WITH &&) WHERE status IN ('PENDING','APPROVED')`, via migration SQL com `btree_gist`. A validação em código serve para UX; o banco é a garantia.
- `Benefit`: name, type, defaultValue Decimal(12,2), currency (BRL), active. `EmployeeBenefit`: employeeId, benefitId, value, startDate, endDate?, status (ACTIVE|CANCELLED), cancelledAt?.
- `OnboardingTemplate` → `OnboardingTemplateTask` (title, description, order, assigneeRole). `OnboardingProcess` (employeeId, templateId, status) → `OnboardingTask` (title, assigneeId?, dueDate?, status PENDING|IN_PROGRESS|COMPLETED, completedAt?).
- `TimeEntry`: employeeId, timestamp (definido pelo servidor), type (CLOCK_IN|BREAK_START|BREAK_END|CLOCK_OUT), source (WEB|MOBILE|MANUAL).
- `Notification` (in-app): userId, organizationId, type, title, body, link?, readAt?, `idempotencyKey` (unique).
- `AuditLog`: campos da spec. É append-only.

**Índices** (só os que correspondem a consultas reais): `(organizationId)` em todas as tabelas de tenant; Employee `(organizationId,email)` unique, `(organizationId,status)`, `(organizationId,departmentId)`, `(organizationId,createdAt)`, `(managerId)`; VacationRequest `(organizationId,status)`, `(employeeId,startDate)`; Document `(organizationId,employeeId)`, `(organizationId,expiresAt)`; TimeEntry `(employeeId,timestamp)`; AuditLog `(organizationId,createdAt)`; Notification `(userId,readAt)`.
Mudanças de schema sempre por `prisma migrate dev` / `migrate deploy`; `db push` nunca.

## 6. Authentication strategy

- `POST /auth/register`: cria User + Organization + Membership(ORG_ADMIN) numa transação.
- `POST /auth/login`: argon2 verify. Resposta: `accessToken` no body (JWT de 15 min, payload `{sub, mid (membershipId), org, role}`) + refresh token em cookie `httpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` (opaco, 30 dias, guardado como SHA-256).
- `POST /auth/refresh`: **rotação** a cada uso. Se um token já rotacionado for reutilizado, a família inteira é revogada (detecção de roubo).
- `POST /auth/logout`: revoga a família e limpa o cookie.
- Web: access token só em memória (nunca em localStorage). O `api-client` faz refresh automático no 401, com uma única promise em voo.
- CSRF: refresh/logout usam cookie SameSite=Strict + checagem de `Origin` contra a allowlist. Os demais endpoints usam Bearer e não ficam expostos a CSRF.
- Guard global `JwtAuthGuard` (endpoints públicos marcados com `@Public()`): valida o JWT, carrega a membership ativa (1 query indexada) e preenche o contexto. Membership desativada perde o acesso na hora.
- Multi-organização: o modelo já suporta. Login entra na membership mais recente; `POST /auth/switch-organization` fica para quando houver UI.
- Rate limit: login/register/refresh com 5 req/min por IP + email; global com 100 req/min por usuário.

## 7. Multi-tenancy strategy

- `organizationId` **sempre** vem do contexto autenticado. Os schemas Zod de entrada não aceitam esse campo (`.strict()` rejeita chaves extras).
- Os services leem `ctx.organizationId` (via `ClsService`) e o incluem em todo `where`. Busca por id usa `findFirst({ where: { id, organizationId } })`, nunca `findUnique({ id })` sozinho.
- Toda FK recebida (departmentId, managerId, benefitId…) é validada como pertencente à mesma organização antes da escrita.
- Recurso de outro tenant retorna **404** (não 403), para não vazar a existência.
- Chaves S3 prefixadas `org/{orgId}/…`, verificadas antes de assinar URL.
- Teste obrigatório `tenant-isolation.e2e.ts`: duas organizações; para cada recurso, A tenta GET/PATCH/DELETE/approve em IDs de B → 404, e listagens de A nunca trazem dados de B.

## 8. RBAC strategy

- Permissões como union de strings em `packages/types/permissions.ts` (`employees:read`, `vacations:approve`…).
- Mapa estático `ROLE_PERMISSIONS: Record<Role, Permission[]>` em um único arquivo. Sem tabelas de papel no banco por enquanto; papéis customizáveis viram tabela se surgir a necessidade.
- Uso: `@RequirePermissions('employees:create')` no handler, checado pelo `PermissionsGuard` global. Nenhum `if (role === …)` espalhado.
- Escopo de dados: helper central `employeeVisibility(ctx)` → `all` (ORG_ADMIN, HR_MANAGER) | `team` (MANAGER: subordinados diretos) | `self` (EMPLOYEE). Os services de listagem usam esse helper.
- Regras: ninguém aprova as próprias férias; MANAGER aprova apenas a equipe direta; HR_MANAGER e ORG_ADMIN aprovam qualquer pedido.
- SUPER_ADMIN é papel de plataforma (`User.isSuperAdmin`), não de membership. Fica sem console próprio no MVP (Open questions).
- O web recebe as permissões em `GET /auth/me` e esconde as ações correspondentes. A API continua sendo a autoridade.

## 9. API structure

- Prefixo `/api/v1`. Swagger em `/api/docs` (desligado em produção, a não ser que a flag esteja ativa).
- Sucesso: `{ success: true, data, meta? }`, com `meta = { page, pageSize, total }` nas listas.
- Erro: `{ success: false, error: { code, message, details? } }`, via `AppException(code, status)` + filtro global. Erro de validação Zod → `VALIDATION_ERROR` com os detalhes dos campos. Erro inesperado → `INTERNAL_ERROR` sem stack, logado com requestId.
- Paginação `?page&pageSize` (máx. 100), busca `?q`, filtros explícitos por recurso.
- Endpoints: os da seção 25 da spec, mais os necessários para fechar os fluxos:
  - `GET /auth/me`, `GET|PATCH /organizations/me`
  - `PATCH|DELETE` em departments, positions; CRUD de `/branches`
  - `POST /employees/:id/terminate` (desligamento)
  - `POST /documents/:id/confirm`, `GET /documents/:id/download-url`, `DELETE /documents/:id`
  - `POST /vacations/:id/cancel`
  - `POST /benefits/:id/assign`, `POST /employee-benefits/:id/cancel`
  - `/onboarding/templates`, `PATCH /onboarding/tasks/:id`
  - `GET /time/entries?employeeId&from&to`
  - `GET /dashboard/summary`, `GET /notifications`, `POST /notifications/:id/read`
  - `GET /reports/:type.csv`

## 10. Frontend structure

- Layout `(app)`: sidebar com os itens da seção 21 da spec, topbar com org/usuário/notificações. Desktop first, com sidebar em drawer no mobile.
- Identidade própria: primária azul (`blue-600`), neutros `zinc`, bastante espaço em branco, tema por tokens CSS do shadcn. Dark mode só se custar zero.
- Componentes comuns (um de cada): DataTable (TanStack Table), PageHeader, SearchInput, FilterBar, StatusBadge, ConfirmDialog, FormField, EmptyState, LoadingState, ErrorState, Pagination, Modal, Drawer, StatsCard.
- Dados: `lib/api-client.ts` (único lugar com `fetch`) → `features/x/api.ts` → `queries.ts` (`useEmployees`…) / `mutations.ts` (`useCreateEmployee`… com invalidação) → UI.
- Formulários: RHF + `zodResolver` com os mesmos schemas de `packages/types`.
- Estado de URL (filtros, página) em query string, para que links sejam compartilháveis.
- Proteção de rotas: o layout `(app)` tenta o refresh no load; sem sessão, redireciona para `/login`.

## 11. Development phases

Seguem a seção 38 da spec, cada uma com Definition of Done (seção 42). Os commits são feitos pelo usuário; o agente só altera arquivos e sugere a mensagem. 0. **Discovery**: este documento.

1. **Foundation** ✅ (2026-10-11; S3 local = SeaweedFS, MinIO saiu do Docker Hub): git init, monorepo, web/api vazios rodando, Prisma + compose (postgres, redis, minio), ESLint/Prettier, config de env validada por Zod (falha no boot se faltar variável), envelope de erro, Pino com redaction, Swagger, healthcheck `/api/v1/health`, CI.
2. **Auth**: User/Org/Membership/RefreshToken, register/login/refresh/logout/me, RBAC guards, contexto CLS, telas de login/registro, testes.
3. **Employees**: departments, positions, branches, employees (gestor, filtros, paginação, busca), desligamento, frontend completo, teste de tenant isolation.
4. **Documents**: S3/MinIO, presign → upload direto → confirm (HeadObject confere tamanho e mime) → download por URL assinada de 5 min; allowlist de mime; limite de 20 MB; job que limpa PENDING_UPLOAD com mais de 24 h.
5. **Vacations**: request/approve/reject/cancel, constraint de sobreposição, job diário PENDING→… e APPROVED→COMPLETED, cards no dashboard, notificações (aqui nasce a infraestrutura BullMQ: fila `notifications`, `jobId` = chave de idempotência).
6. **Benefits**: catálogo, atribuição, cancelamento.
7. **Onboarding**: templates, processo criado em transação junto com o colaborador (opcional), tarefas, progresso, notificação de tarefa atribuída.
8. **Time tracking**: 4 endpoints com máquina de estados validada (não existe BREAK_START sem CLOCK_IN aberto), histórico diário, minutos trabalhados calculados na leitura.
9. **Audit + reports**: tela de auditoria filtrável, relatórios CSV (stream), melhorias no dashboard. Obs.: o `AuditService.log()` é chamado desde a Phase 2 dentro das transações; aqui entra a UI.
10. **Quality**: revisão de segurança, EXPLAIN nas queries principais, N+1, acessibilidade (axe no Playwright), estados de loading/empty/error.

Fora da sequência: **site de apresentação** (`apps/site`), landing em formato de quadro colaborativo, já feita em 2026-10-11.

### Depois do MVP (escopo ampliado)

Mesma regra: uma fase de cada vez, com Definition of Done. A ordem vai do mais barato e útil ao mais caro e pode mudar. Cada fase reaproveita o que já existe (RBAC, tenant scoping, auditoria, notificações e documentos).

11. **Portal do colaborador + workflows**: área "meus dados" (o colaborador atualiza dados pessoais, e a mudança passa por aprovação do RH), pedidos centralizados. Workflow de aprovação em várias etapas, configurável por tipo de pedido. Regra: só se extrai um motor genérico de workflow quando houver 2 ou mais usos reais (férias + dados pessoais); antes disso, a aprovação continua simples como na Fase 5. Inclui relatórios ampliados.
12. **Assinatura eletrônica via provedor** (decidido em 2026-10-11): o Lobby envia o documento ao provedor, acompanha o status por webhook e guarda o PDF assinado e a trilha de auditoria no S3. Provedor (Clicksign, ZapSign, D4Sign…) a escolher no início da fase por preço, API e suporte a ICP-Brasil. Uma interface `SignatureProvider` só é criada se um segundo provedor for de fato necessário.
13. **Gestão de ativos**: catálogo de equipamentos (notebook, celular, crachá), entrega e devolução por colaborador com termo de responsabilidade (usa a assinatura da Fase 12), e devolução vinculada ao desligamento.
14. **Canal de denúncia**: envio anônimo ou identificado, protocolo para acompanhar, e acesso restrito a um comitê (papel novo). Conteúdo nunca aparece em logs nem na auditoria geral. Atende a exigência de canal contra assédio para empresas com CIPA (Lei 14.457/2022).
15. **Atendimento ao colaborador**: chamados para o RH (dúvida, solicitação, segunda via), com status, responsável e prazo.
16. **Comunicação interna e reconhecimento**: comunicados com público-alvo (empresa, departamento, filial) e confirmação de leitura, mais um mural de reconhecimento entre colegas.
17. **Chat interno, construído do zero** (decidido em 2026-10-11): canais por time ou departamento e mensagens diretas, isolados por organização como todo o resto. Exige tempo real: gateway WebSocket no Nest com adaptador Redis, que entra na stack nesta fase. Mensagens no Postgres, com paginação por cursor. Primeira versão: texto, menções, anexos via S3 e não lidas. Ficam para depois: busca full-text, threads, reações e chamadas.
18. **Desempenho**: ciclos de avaliação (autoavaliação, gestor, 360 opcional), metas e feedback contínuo.
19. **Recrutamento e seleção**: vagas, candidatos, pipeline em etapas e página pública de vagas. Quando alguém é contratado, a pessoa vira colaborador e entra no onboarding.
20. **Treinamento**: registro de treinamentos e certificados por colaborador, trilhas obrigatórias e controle de conclusão. Plataforma de cursos própria (vídeo, prova) só se for confirmada como necessária.
21. **KPIs e automações** (decidido em 2026-10-11): cada empresa define os próprios indicadores e regras.
    - **KPIs calculados** a partir dos dados do Lobby: headcount, turnover, absenteísmo (ponto), tempo de contratação (recrutamento), onboarding concluído no prazo, férias vencendo. Também KPIs **manuais** (a empresa lança o valor) para o que vem de fora.
    - **Metas** por empresa, departamento, time ou pessoa, ligadas a Desempenho (Fase 18).
    - **Automações** no formato "quando acontecer X, se Y, faça Z", configuradas pela própria empresa. Exemplos: "turnover do mês passou de 3%, então avisar RH e diretoria"; "colaborador fez 1 ano, então criar tarefa de avaliação"; "documento vence em 30 dias, então avisar o colaborador". Gatilhos vêm dos eventos que a auditoria já registra; as ações reutilizam notificações, tarefas e chat. Execução em fila BullMQ, idempotente, com histórico de execuções.
    - Começa com um catálogo fechado de gatilhos e ações; um editor livre de fórmulas só se houver demanda.

No radar, sem fase definida: pesquisas de clima / NR-1 (riscos psicossociais) e IA. Clube de descontos fora por enquanto (2026-10-11). Ver Open questions.

## 12. Testing strategy

- **Unit (Vitest)**: regras puras, como cálculo de dias de férias, máquina de estados do ponto, `ROLE_PERMISSIONS`, visibilidade.
- **API e2e (Vitest + Supertest)**: Postgres real (database `peopleos_test`), `migrate deploy` antes da suíte, truncate entre testes, factories simples. Cobrem tudo da seção 31 da spec: auth (válido, senha errada, token inválido, refresh e reuse), **tenant isolation**, RBAC (403 por papel), CRUD e filtros de employees, vacations (request, approve, reject, sobreposição → 409), documents (metadata, acesso, URL assinada).
- **E2E (Playwright)**: o fluxo da seção 32 da spec (register → … → dashboard) contra o stack rodando.
- Sem meta de cobertura; os testes focam em comportamento.

## 13. Security strategy

Argon2id; JWT com segredos separados para access e refresh; rotação de refresh com detecção de reuse; RBAC e tenant scoping (seções 7 e 8); Zod em toda entrada (`.strict()`); helmet (headers + CSP no Next); CORS com allowlist via env; throttler em Redis; cookies Secure/HttpOnly/SameSite=Strict; Prisma parametrizado (raw SQL só com `$queryRaw` tagged); React escapa por padrão e `dangerouslySetInnerHTML` é proibido por lint; S3 privado com Block Public Access e URLs assinadas curtas; redaction no Pino (`authorization`, `cookie`, `password*`, `*token*`, `document`); audit metadata sem segredos; `.env` no `.gitignore` e só `.env.example` versionado; `pnpm audit` no CI.
LGPD: armazenar só o necessário, CPF mascarado na listagem e auditoria de acesso a documentos.

## 14. Deployment strategy

- Imagens Docker multi-stage: `api` (também usada pelo worker, com outro comando) e `web` (Next `output: 'standalone'`).
- CI (GitHub Actions): install → lint → typecheck → test (com services postgres e redis) → build. **Sem deploy automático** por enquanto.
- Alvo proposto (implementado só com configuração definida): AWS ECS Fargate (web, api, worker) + RDS Postgres + ElastiCache Redis + S3 + ALB com TLS. O ALB cumpre o papel de load balancer; Nginx só se surgir necessidade específica. Migrations rodam como task one-off `prisma migrate deploy` antes do rollout. Segredos no AWS Secrets Manager. Sentry habilitado por DSN.

## 15. Open questions

1. ~~**Localização do projeto**~~: resolvido, movido para `C:\dev\peopleos` em 2026-10-11.
2. **Idioma da UI**: pt-BR ou inglês? A spec usa exemplos em inglês, mas o público parece brasileiro. Padrão adotado até a resposta: UI em pt-BR e código em inglês, sem framework de i18n.
3. **Folha de pagamento**: fora do escopo, confirmado em 2026-10-11 (inclui eSocial e FGTS Digital). É o maior módulo possível e mudaria a arquitetura.
4. **Cobrança/planos do SaaS**: não está na spec. Fica fora.
5. **Provedor de e-mail** (SES, Resend…): no dev, o e-mail só é logado (ou vai para Mailpit). Definir para produção.
6. **Regras de férias**: dias corridos (padrão adotado) ou úteis? É preciso controlar saldo/período aquisitivo CLT? Por ora não há saldo; só validação de datas e sobreposição.
7. **Desligamento**: só status + data + motivo (padrão adotado), ou checklist de offboarding (cancelar benefícios, revogar acesso)? Por padrão, a conta vinculada é desativada.
8. **SUPER_ADMIN**: é necessário um console de plataforma no MVP?
9. **LGPD**: política de retenção/anonimização ao excluir colaborador.
10. **Convite de usuários**: o "Adds HR users" pressupõe convite por e-mail com link. Confirmar se o MVP usa convite (padrão) ou senha definida pelo admin.

Escopo ampliado (seção 11, depois do MVP):

11. ~~**Assinatura eletrônica**~~: decidido, via **provedor** (Fase 12). Motivo: maior aceitação jurídica e opção de ICP-Brasil. Falta escolher qual.
12. ~~**Chat interno**~~: decidido, **construído do zero** (Fase 17).
13. ~~**Gestão de KPIs**~~: decidido, KPIs definidos pela empresa e **automações configuráveis** (Fase 21). Falta fechar o catálogo inicial de KPIs, gatilhos e ações no início da fase.
14. ~~**Clube de descontos**~~: fora por enquanto; difícil de viabilizar agora.
15. **IA**: a spec deixa fora do MVP. Candidatos para depois: resumo de documentos, rascunho de descrição de cargos, assistente de RH com respostas sobre as políticas da empresa e análise de feedback. Definir caso de uso, provedor e política de dados (LGPD: dados de colaboradores não podem treinar modelos de terceiros).
16. **Pesquisas de clima / NR-1**: no radar. A NR-1 passou a exigir gestão de riscos psicossociais. Tem valor comercial, mas exige metodologia (questionário validado, anonimato, relatório para o PGR). Rever depois da Fase 18.
