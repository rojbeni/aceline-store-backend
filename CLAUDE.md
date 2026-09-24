# Aceline Store Backend

Medusa v2 (2.15.x) e-commerce backend for the Aceline store (Tunisia, TND currency).
Package manager: **pnpm**. Language: **TypeScript**. Node >= 20.

## Commands

- `pnpm dev` — run the backend + admin in watch mode
- `pnpm build` — production build (also the fastest full type check of admin + server)
- `pnpm exec tsc --noEmit` — type check the server code
- `pnpm test:unit` / `pnpm test:integration:http` / `pnpm test:integration:modules`

## Project layout (Medusa conventions)

| Folder | Put here | Skill |
|---|---|---|
| `src/api/` | HTTP routes (`route.ts`) + `middlewares.ts` for validation | `medusa-api-route` |
| `src/workflows/` | Business logic as workflows; steps in `src/workflows/steps/` | `medusa-workflow` |
| `src/modules/` | Custom modules and providers (payment, notification, …) | `medusa-provider-module` |
| `src/subscribers/` | Event handlers — thin, they call a workflow | see below |
| `src/admin/widgets/`, `src/admin/routes/` | Admin dashboard UI extensions | `medusa-admin-widget` |
| `src/jobs/` | Scheduled jobs — thin, they call a workflow | |
| `src/links/` | Module links | |

Before finishing any change, run the `clean-code-review` skill on your diff.

## Clean code rules

These apply everywhere. They are ordered by importance.

### 1. Put logic where Medusa expects it
- **Routes, subscribers and jobs are thin**: read input → run a workflow → return/respond. No business logic, no direct third-party API calls.
- **Business logic lives in workflows**, split into small steps with one responsibility each. A step that mutates data has a compensation function.
- **Talking to an external API** (Konnect, Facebook, SMTP…) belongs in a module/provider service or a dedicated client file, not inline in a step or route.

### 2. Small, well-named units
- A function does one thing. If you need a `// --- section ---` comment to separate parts, those parts are functions.
- Aim for functions under ~40 lines and files under ~200 lines. Split before exceeding.
- Names say *what* and *why*, not *how*: `buildFacebookCaption`, `resolveDefaultCurrency`, `isVariantInStock`. Booleans start with `is/has/should/can`.
- No abbreviations except well-known ones (`id`, `url`, `sku`). No `data2`, `tmp`, `res2`.
- Prefer early returns over nested `if`/ternaries. Never nest ternaries more than one level.

### 3. Types, not `any`
- No `any`. Use Medusa types from `@medusajs/framework/types`, generated query types, or declare a local `type`. If truly unknown, use `unknown` and narrow.
- Type external API responses with an explicit `type` at the fetch boundary.
- No `@ts-ignore`; if unavoidable, use `@ts-expect-error` with a reason.
- No non-null assertions (`!`) on values that can really be missing (e.g. `order.email!`) — handle the missing case.

### 4. Configuration and secrets
- Read `process.env` **only in `medusa-config.ts`** and pass values in as module/provider options. Business code receives config through options or the container.
- Validate required options at startup (`static validateOptions`) so misconfiguration fails fast, not at the first request.
- **Never log secrets, tokens, API keys, or full request bodies containing them.**
- Keep `.env.template` in sync when adding a variable.

### 5. Errors and logging
- Throw `MedusaError` with the right `MedusaError.Types.*` (`NOT_FOUND`, `INVALID_DATA`, `UNEXPECTED_STATE`, …) so the HTTP layer returns the correct status.
- Always check `response.ok` on `fetch` before parsing/using the body, and include the upstream error message.
- Use the container logger (`container.resolve(ContainerRegistrationKeys.LOGGER)` or the injected `logger`), never `console.log` in committed code.
- Don't catch an error just to log and rethrow it unless you add context.

### 6. Constants and magic values
- Extract magic numbers/strings to named `const`s at the top of the file (`FACEBOOK_GRAPH_URL`, `TND_TO_MILLIMES`, `PAYMENT_LINK_LIFESPAN_MINUTES`).
- Event names, metadata keys and API versions used in more than one place live in one shared constants file.

### 7. Comments
- Comment **why**, never **what**. Keep non-obvious business/API quirks (e.g. why Facebook calls use `me` instead of the page id) — those are valuable.
- Delete commented-out code and file-path header comments (`// src/...`) — the path is already the filename.

### 8. Imports
- Import Medusa APIs from `@medusajs/framework/*` (`/utils`, `/types`, `/http`, `/workflows-sdk`).
- Group imports: external packages first, then Medusa, then local files. Remove unused imports.
- Colocate related files (a workflow's steps, types and helpers sit next to it) to keep relative imports short.

## Style

- 2-space indentation, double quotes, no semicolons (match existing files).
- `camelCase` variables/functions, `PascalCase` types/classes/components, `SCREAMING_SNAKE_CASE` module constants, `kebab-case` file names.
- Identifiers and code are in **English**. Text shown to admins or customers (admin UI, emails, error messages surfaced in the dashboard) is in **French**. Comments: English in new files; match the existing language when editing a file.
- Money: Medusa v2 stores amounts in the main currency unit (e.g. `12.5` TND); convert only at provider boundaries (Konnect uses millimes).

## Subscribers

```ts
export default async function orderPlacedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await sendOrderConfirmationWorkflow(container).run({ input: { orderId: data.id } })
}

export const config: SubscriberConfig = { event: "order.placed" }
```
Type the event payload (`SubscriberArgs<{ id: string }>`), never `SubscriberArgs<any>`.

## Don'ts

- Don't edit `.medusa/` (generated) or commit `.env`.
- Don't add a dependency when Medusa or the platform already provides it.
- Don't refactor unrelated code while doing a task — note it instead.
