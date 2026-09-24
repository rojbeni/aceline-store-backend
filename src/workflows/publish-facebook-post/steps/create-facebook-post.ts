import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FACEBOOK_MODULE } from "../../../modules/facebook"
import FacebookModuleService from "../../../modules/facebook/service"
import { deleteFacebookObjects } from "../utils/delete-facebook-objects"

export type CreateFacebookPostInput = {
  caption: string
  mediaIds: string[]
}

export const createFacebookPostStep = createStep(
  "create-facebook-post",
  async ({ caption, mediaIds }: CreateFacebookPostInput, { container }) => {
    const facebook = container.resolve<FacebookModuleService>(FACEBOOK_MODULE)
    const postId = await facebook.createPost(caption, mediaIds)
    return new StepResponse(postId, postId)
  },
  async (postId, { container }) => {
    if (postId) {
      await deleteFacebookObjects(container, [postId])
    }
  }
)
