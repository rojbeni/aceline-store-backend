import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createFacebookPostStep } from "./steps/create-facebook-post"
import { prepareFacebookPostStep } from "./steps/prepare-facebook-post"
import { saveFacebookPostIdStep } from "./steps/save-facebook-post-id"
import { uploadFacebookPhotosStep } from "./steps/upload-facebook-photos"

type PublishFacebookPostInput = {
  productId: string
  variantId: string
}

export const publishFacebookPostWorkflow = createWorkflow(
  "publish-facebook-post",
  (input: PublishFacebookPostInput) => {
    const content = prepareFacebookPostStep(input)
    const mediaIds = uploadFacebookPhotosStep(content.imageUrls)
    const postId = createFacebookPostStep({ caption: content.caption, mediaIds })

    saveFacebookPostIdStep({
      variantId: input.variantId,
      postId,
      previousMetadata: content.previousMetadata,
    })

    return new WorkflowResponse({ postId })
  }
)
