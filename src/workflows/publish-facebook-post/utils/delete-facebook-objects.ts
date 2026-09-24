import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FACEBOOK_MODULE } from "../../../modules/facebook"
import FacebookModuleService from "../../../modules/facebook/service"

// Best-effort cleanup used when rolling back: a failed delete is logged,
// not thrown, so the error that caused the rollback is the one reported.
export async function deleteFacebookObjects(container: MedusaContainer, objectIds: string[]): Promise<void> {
  const facebook = container.resolve<FacebookModuleService>(FACEBOOK_MODULE)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  for (const objectId of objectIds) {
    try {
      await facebook.deleteObject(objectId)
    } catch (error) {
      logger.warn(`Facebook cleanup: could not delete ${objectId}: ${(error as Error).message}`)
    }
  }
}
