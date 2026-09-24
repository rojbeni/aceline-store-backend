import { MedusaError } from "@medusajs/framework/utils"

export type StorefrontOptions = {
  url: string
}

export default class StorefrontModuleService {
  protected options_: StorefrontOptions

  constructor(_container: unknown, options: StorefrontOptions) {
    if (!options?.url) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Storefront: option "url" is required`)
    }
    this.options_ = options
  }

  getProductUrl(handle: string, variantId?: string): string {
    const url = `${this.options_.url}/products/${handle}`
    return variantId ? `${url}?${new URLSearchParams({ variant: variantId })}` : url
  }

  // Tells the Next.js storefront to drop its cached pages for these tags
  async revalidateTags(tags: string[]): Promise<void> {
    const params = new URLSearchParams(tags.map((tag) => ["tags", tag]))
    const response = await fetch(`${this.options_.url}/api/revalidate?${params}`)
    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Storefront revalidation failed (${response.status}) for tags: ${tags.join(", ")}`
      )
    }
  }
}
