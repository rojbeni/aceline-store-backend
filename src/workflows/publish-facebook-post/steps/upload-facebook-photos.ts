import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FACEBOOK_MODULE } from "../../../modules/facebook"
import FacebookModuleService from "../../../modules/facebook/service"
import { deleteFacebookObjects } from "../utils/delete-facebook-objects"

export const uploadFacebookPhotosStep = createStep(
  "upload-facebook-photos",
  async (imageUrls: string[], { container }) => {
    const facebook = container.resolve<FacebookModuleService>(FACEBOOK_MODULE)
    const mediaIds: string[] = []

    try {
      for (const imageUrl of imageUrls) {
        mediaIds.push(await facebook.uploadUnpublishedPhoto(imageUrl))
      }
    } catch (error) {
      // A failing step isn't compensated, so remove the photos uploaded so far
      await deleteFacebookObjects(container, mediaIds)
      throw error
    }

    return new StepResponse(mediaIds, mediaIds)
  },
  async (mediaIds, { container }) => {
    await deleteFacebookObjects(container, mediaIds ?? [])
  }
)
