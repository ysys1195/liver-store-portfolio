# AGENTS.md

## Project

This repository is an unofficial, non-commercial portfolio project for recruitment purposes.

It is a fictional Virtual Liver / VTuber merchandise EC store built to demonstrate:

- Next.js / React / TypeScript architecture
- BFF design
- Prisma / PostgreSQL data modeling
- inventory concurrency control
- idempotent order processing
- caching, stale data, retry, and error UX
- flash-sale concurrency simulation
- testing and maintainable team development

This project is not affiliated with ANYCOLOR Inc., NIJISANJI, or any official VTuber service.

Do not implement real payment, real ordering, or functionality that could make this project appear to be an official commercial service.

## Read First

Before making changes, read the relevant documents:

- `README.md`
- `docs/requirements.md`
- `docs/architecture.md`
- `docs/screen-flow.md`
- `docs/api-design.md`
- `docs/database-design.md`
- `docs/flash-sale-design.md`
- `docs/issue-plan.md`

Treat these documents as the source of truth unless the current GitHub Issue explicitly changes the specification.

Do not expand scope beyond the current Issue.

## Development Workflow

Development is Issue-driven.

For each Issue:

1. Read the Issue and relevant docs.
2. Make the smallest change that satisfies the acceptance criteria.
3. Add or update tests.
4. Run relevant checks.
5. Update docs when behavior or architecture changes.
6. Avoid unrelated refactors.

Prefer small, reviewable changes.

## Tech Stack

Use the following stack unless explicitly changed by an Issue:

- Next.js
- React
- TypeScript
- pnpm
- Tailwind CSS
- TanStack Query
- Zustand
- Zod
- Prisma
- PostgreSQL
- Docker Compose for local PostgreSQL
- Neon Postgres for production
- Vercel
- Vitest
- React Testing Library
- Playwright

Use `pnpm` only. Do not add npm or yarn lockfiles.

## Next.js Rules

Use Server Components by default.

Use Client Components only when browser-side interactivity or browser APIs are required.

Typical Client Component use cases:

- cart interaction
- quantity controls
- inventory refetch
- order mutations
- Flash Sale Simulation
- `localStorage`
- `sessionStorage`

Keep `"use client"` boundaries as small as practical.

Do not create internal HTTP APIs just so Server Components can call them. Server-side code may access server data functions directly.

## Server / BFF Rules

Assume all client input can be inspected and modified.

Never trust client-provided values for:

- price
- stock
- sale status
- purchase limits
- order totals

Authoritative values must be loaded or calculated on the server.

Never expose:

- database credentials
- secret tokens
- internal stack traces
- raw database errors
- private environment variables

Database access must remain server-side.

Client Components must never import Prisma or connect directly to Neon.

## State Management

### TanStack Query

Use for server-owned state that needs:

- caching
- retry
- stale-state handling
- invalidation
- refetching

Example query key:

```ts
['product', productId, 'inventory']
```

### Zustand

Use for local client-owned state.

Primary example:

- cart state persisted to `localStorage`

Do not duplicate the same state across TanStack Query and Zustand.

## Prisma / Database Rules

`schema.prisma` is the source of truth for the relational schema.

Use migrations for schema changes.

Development:

```bash
pnpm prisma migrate dev
```

Production:

```bash
pnpm prisma migrate deploy
```

Commit migration files.

The MVP must support multiple Livers. Do not design the schema around a single Liver.

Core models are documented in `docs/database-design.md`.

## Inventory and Order Safety

Inventory correctness is a core requirement.

Do not rely on this pattern for final stock validation:

```text
SELECT stock
-> check in JavaScript
-> UPDATE
```

Inventory reduction must use an atomic conditional database operation so concurrent requests cannot oversell stock.

Inventory decrement and order creation must happen in the same transaction.

Never allow stock to become negative.

### Idempotency

Disabling a button is not sufficient to prevent duplicate orders.

`POST /api/orders` must support an Idempotency Key and prevent duplicate order creation for the same logical request.

The server must calculate order prices from database values, not client-submitted totals.

See:

- `docs/api-design.md`
- `docs/flash-sale-design.md`

## Retry and stale Data

GET requests may use bounded automatic retry.

After retries fail, provide manual retry when useful.

Do not blindly retry order mutations with a new Idempotency Key.

The UI may temporarily display stale inventory. The server remains authoritative.

When an order fails because inventory changed:

1. return an appropriate conflict response,
2. invalidate the inventory query,
3. refetch current inventory,
4. update the UI.

## UI Rules

Use Tailwind CSS.

Prefer semantic HTML and reusable components.

Mutation buttons should be disabled while pending to prevent accidental repeated actions.

Handle meaningful UI states:

- loading
- empty
- success
- retryable error
- sold out
- coming soon
- sale ended

Support both mobile and desktop layouts.

## Access and Branding

The deployed portfolio must use Basic Authentication via Next.js Middleware.

Credentials must come from server-side environment variables and must never be committed.

The application must clearly state that it is an unofficial portfolio demo.

Also use:

- `noindex, nofollow`
- restrictive `robots.txt`
- a mandatory first-visit disclaimer
- persistent unofficial/demo labeling

Use only assets whose usage rights are known.

Do not copy official logos, artwork, voice assets, or merchandise designs without permission.

## Testing

Add tests for behavior introduced or changed by the Issue.

Prioritize:

- product status logic
- validation
- cart behavior
- loading / retry / error states
- inventory conflicts
- idempotency
- server-side price authority
- primary purchase flow
- Flash Sale Simulation

Do not consider a feature complete if its core acceptance criteria cannot be verified.

## Documentation

Update documentation in the same change when behavior or architecture changes.

Examples:

- API changes → `docs/api-design.md`
- DB changes → `docs/database-design.md`
- architecture changes → `docs/architecture.md`
- screen behavior changes → `docs/requirements.md` / `docs/screen-flow.md`
- Flash Sale behavior changes → `docs/flash-sale-design.md`

Do not allow docs and implementation to drift significantly.

## Scope Control

The MVP does not include:

- real payment processing
- shipping
- email delivery
- user accounts
- order history
- admin dashboard
- Shopify integration
- production-scale load testing
- full SKU / variant inventory management

Do not add these unless explicitly requested by an Issue.

## Definition of Done

Before completing an Issue, verify:

- acceptance criteria are satisfied
- TypeScript checks pass
- linting passes
- relevant tests pass
- no secrets are committed
- no unrelated changes were introduced
- loading and error states are handled
- relevant docs are current
- the application remains clearly marked as an unofficial demo
