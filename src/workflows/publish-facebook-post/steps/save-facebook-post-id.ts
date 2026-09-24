import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type SaveFacebookPostIdInput = {
  variantId: string
  postId: string
  previousMetadata: Record<string, unknown>
}

export const saveFacebookPostIdStep = createStep(
  "save-facebook-post-id",
  async ({ variantId, postId, previousMetadata }: SaveFacebookPostIdInput, { container }) => {
    const productModule = container.resolve(Modules.PRODUCT)

    await productModule.updateProductVariants(variantId, {
      metadata: {
        ...previousMetadata,
        facebook_post_id: postId,
        facebook_published_at: new Date().toISOString(),
      },
    })

    return new StepResponse(undefined, { variantId, previousMetadata })
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
