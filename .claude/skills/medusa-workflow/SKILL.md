---
name: medusa-workflow
description: Create or refactor a Medusa v2 workflow and its steps in src/workflows/ with small single-purpose steps, compensation, and typed inputs/outputs. Use whenever adding business logic, a multi-step operation, or when a step/route has grown too large.
---

# Writing a clean Medusa workflow

## Structure

```
src/workflows/
  publish-facebook-post/
    index.ts                   # the workflow (composition only)
    steps/
      get-variant-for-post.ts  # one step per file
      upload-facebook-photos.ts
      create-facebook-post.ts
      save-facebook-post-id.ts
    utils/
      build-caption.ts         # pure functions, easy to unit test
    types.ts
```
For a workflow with 1–2 tiny steps, a single file is fine. Split once it passes ~150 lines.
Steps reused by several workflows go in `src/workflows/steps/`.

## Rules

1. **One step = one responsibility** — fetch, compute, call external API, or persist. Never all four.
2. **Pure logic goes in plain functions** (`utils/`), not inside steps. Steps orchestrate I/O; utils compute. Utils are unit-testable without a container.
3. **Every step that writes data has a compensation function** that undoes it. Return the data needed to undo as the second argument of `StepResponse`.
4. **The workflow constructor is declarative.** No `async`, no `if`, no loops, no direct variable manipulation — use `transform()` for data shaping and `when()` for conditions.
5. **Type everything**: step input type, step output, compensation data. No `any` — use types from `@medusajs/framework/types` or a local `types.ts`.
6. **Fetch with Query** (`ContainerRegistrationKeys.QUERY`) and ask only for the fields you use.
7. **Errors**: throw `MedusaError` (`NOT_FOUND`, `INVALID_DATA`, `UNEXPECTED_STATE`) with a French message if an admin will see it.
8. **External APIs**: config (tokens, URLs) comes from module options or is read once in a dedicated client — not `process.env` scattered in the step. Check `response.ok`; never log the token.
9. Use the container logger, not `console.log`.

## Template

```ts
// steps/save-facebook-post-id.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type SaveFacebookPostIdInput = {
  variantId: string
  postId: string
  previousMetadata: Record<string, unknown>
}

export const saveFacebookPostIdStep = createStep(
  "save-facebook-post-id",
  async (input: SaveFacebookPostIdInput, { container }) => {
    const productModule = container.resolve(Modules.PRODUCT)

    await productModule.updateProductVariants(input.variantId, {
      metadata: {
        ...input.previousMetadata,
        facebook_post_id: input.postId,
        facebook_published_at: new Date().toISOString(),
      },
    })

    return new StepResponse(undefined, {
      variantId: input.variantId,
      previousMetadata: input.previousMetadata,
    })
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }
    const productModule = container.resolve(Modules.PRODUCT)
    await productModule.updateProductVariants(compensation.variantId, {
      metadata: compensation.previousMetadata,
    })
  }
)
```

```ts
// index.ts
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

type PublishFacebookPostInput = { productId: string; variantId: string }

export const publishFacebookPostWorkflow = createWorkflow(
  "publish-facebook-post",
  (input: PublishFacebookPostInput) => {
    const variant = getVariantForPostStep(input)
    const caption = transform({ variant }, ({ variant }) => buildCaption(variant))
    const mediaIds = uploadFacebookPhotosStep({ imageUrls: variant.imageUrls })
    const post = createFacebookPostStep({ caption, mediaIds })
    saveFacebookPostIdStep({
      variantId: input.variantId,
      postId: post.id,
      previousMetadata: variant.metadata,
    })
    return new WorkflowResponse({ postId: post.id })
  }
)
```

## Checklist before finishing
- [ ] Each step file < ~80 lines and does one thing
- [ ] Mutating steps have compensation
- [ ] No logic/async/conditions in the workflow constructor outside `transform`/`when`
- [ ] No `any`, no `console.log`, no secrets logged
- [ ] Pure helpers extracted and named after what they return
