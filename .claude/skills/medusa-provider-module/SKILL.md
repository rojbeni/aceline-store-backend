---
name: medusa-provider-module
description: Create or refactor a Medusa v2 custom module or provider (payment, notification, file, fulfillment) in src/modules/ — typed options, startup validation, an isolated API client, and safe logging. Use when integrating a third-party service like Konnect, SMTP, or Facebook.
---

# Writing a clean module / provider

## Structure

```
src/modules/konnect/
  index.ts        # ModuleProvider(Modules.PAYMENT, { services: [...] })
  service.ts      # the provider: maps Medusa's interface <-> client calls
  client.ts       # thin typed HTTP client for the external API (fetch, auth, errors)
  types.ts        # options + external API request/response types
  constants.ts    # base URLs, status values, unit conversions
```

The **service** translates between Medusa and the external API. The **client** only knows HTTP. Neither reads `process.env`.

## Rules

1. **Typed options**: declare `type XxxOptions`, never `options: any`. Options come from `medusa-config.ts`.
2. **Validate options at boot** with `static validateOptions(options)` and throw `MedusaError(INVALID_DATA, ...)` for missing required values.
3. **Constructor**: `constructor(container: InjectedDependencies, options: XxxOptions)` calling `super(container, options)`. Avoid `@ts-ignore super(...arguments)`.
4. **Inject the logger** via the container (`{ logger }: { logger: Logger }`) — no `console.log`.
5. **Never log secrets** (API keys, tokens, passwords, full auth headers).
6. **One HTTP helper** in the client that sets auth headers, checks `response.ok`, parses JSON into a declared type, and throws a `MedusaError` with the upstream message. No copy-pasted `fetch` blocks.
7. **Map external statuses in one place** (a function or lookup object), not scattered `if (status === "completed")` checks.
8. **Unit conversions and magic values are named constants** (`TND_TO_MILLIMES`, `PAYMENT_LINK_LIFESPAN_MINUTES`).
9. No-op methods required by the interface are fine — add a one-line comment saying *why* it's a no-op.

## Client template

```ts
// client.ts
import { MedusaError } from "@medusajs/framework/utils"

export class KonnectClient {
  constructor(private readonly apiKey: string, private readonly baseUrl: string) {}

  async getPayment(paymentRef: string): Promise<KonnectPaymentResponse> {
    return this.request<KonnectPaymentResponse>(`/payments/${paymentRef}`)
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-api-key": this.apiKey, ...init.headers },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Konnect ${path} failed (${response.status}): ${body}`)
    }

    return (await response.json()) as T
  }
}
```

## Options validation template

```ts
static validateOptions(options: Record<string, unknown>) {
  for (const key of ["apiKey", "receiverWalletId", "webhookUrl"]) {
    if (!options[key]) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Konnect: option "${key}" is required`)
    }
  }
}
```

## Checklist
- [ ] Options typed and validated at boot
- [ ] HTTP isolated in a client with one `request` helper
- [ ] `response.ok` checked everywhere
- [ ] No secrets in logs, no `console.log`, no `any`
- [ ] New env vars added to `medusa-config.ts` and `.env.template`
