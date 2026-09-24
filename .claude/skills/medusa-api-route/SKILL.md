---
name: medusa-api-route
description: Create or refactor a Medusa v2 HTTP API route in src/api/ (admin or store) with zod validation in middlewares.ts, a thin handler that runs a workflow, and consistent responses. Use when adding or changing any route.ts.
---

# Writing a clean Medusa API route

## Rules

1. **Handlers are thin**: read validated input → run a workflow (or Query for simple reads) → respond. No business logic, no third-party `fetch` in a route.
2. **Validate every body/query** with a zod schema registered in `src/api/middlewares.ts`. Never trust `req.body` directly.
3. **Type the request**: `MedusaRequest<BodyType>` and read `req.validatedBody` / `req.validatedQuery`.
4. **Errors**: let workflow errors bubble — Medusa's error handler maps `MedusaError` types to HTTP statuses. Don't wrap in try/catch just to send 500.
5. **Responses**: return the resource under a named key (`{ post: {...} }`, `{ products: [...], count }`) — not a generic `{ success: true, result }`.
6. `/admin/*` routes are authenticated automatically; `/store/*` routes are public — never expose admin data there.
7. Keep schemas next to the route (`validators.ts`) and export the inferred type.

## Files

```
src/api/admin/products/[id]/variants/[variant_id]/publish-facebook/
  route.ts
  validators.ts     # only if the route takes a body/query
src/api/middlewares.ts
```

## Template

```ts
// validators.ts
import { z } from "zod"

export const PublishFacebookPostSchema = z.object({
  message: z.string().max(2000).optional(),
})
export type PublishFacebookPostBody = z.infer<typeof PublishFacebookPostSchema>
```

```ts
// middlewares.ts
import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { PublishFacebookPostSchema } from "./admin/products/[id]/variants/[variant_id]/publish-facebook/validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:id/variants/:variant_id/publish-facebook",
      method: "POST",
      middlewares: [validateAndTransformBody(PublishFacebookPostSchema)],
    },
  ],
})
```

```ts
// route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { publishFacebookPostWorkflow } from "../../../../../../../workflows/publish-facebook-post"
import { PublishFacebookPostBody } from "./validators"

export async function POST(req: MedusaRequest<PublishFacebookPostBody>, res: MedusaResponse) {
  const { id, variant_id } = req.params

  const { result } = await publishFacebookPostWorkflow(req.scope).run({
    input: { productId: id, variantId: variant_id, message: req.validatedBody.message },
  })

  res.status(201).json({ post: result })
}
```

## Checklist
- [ ] Handler under ~20 lines, delegates to a workflow
- [ ] Body/query validated in `middlewares.ts`
- [ ] Correct status code (200 read/update, 201 create, 204 no content)
- [ ] Response uses a named resource key
- [ ] No `any`, no `console.log`
