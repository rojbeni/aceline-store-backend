import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, getTotalVariantAvailability, MedusaError } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { STOREFRONT_MODULE } from "../../../modules/storefront"
import StorefrontModuleService from "../../../modules/storefront/service"
import { FacebookPostContent, PostVariant } from "../types"
import { buildCaption } from "../utils/build-caption"
import { formatPrice, selectPrice } from "../utils/format-price"
import { selectPostImages } from "../utils/select-images"

export type PrepareFacebookPostInput = {
  productId: string
  variantId: string
}

const PRODUCT_FIELDS = [
  "title",
  "description",
  "handle",
  "thumbnail",
  "images.url",
  "variants.id",
  "variants.sku",
  "variants.thumbnail",
  "variants.metadata",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.images.url",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "variants.options.value",
  "variants.options.option.title",
]

async function getDefaultCurrency(container: MedusaContainer): Promise<string | undefined> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [store] } = await query.graph({
    entity: "store",
    fields: ["supported_currencies.currency_code", "supported_currencies.is_default"],
  })
  const currencies = store?.supported_currencies ?? []
  return (currencies.find((currency) => currency?.is_default) ?? currencies[0])?.currency_code
}

async function isVariantInStock(container: MedusaContainer, variant: PostVariant): Promise<boolean> {
  if (!variant.manage_inventory || variant.allow_backorder) {
    return true
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const availability = await getTotalVariantAvailability(query, { variant_ids: [variant.id] })
  return (availability[variant.id]?.availability ?? 0) > 0
}

export const prepareFacebookPostStep = createStep(
  "prepare-facebook-post",
  async ({ productId, variantId }: PrepareFacebookPostInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [product] } = await query.graph({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { id: productId },
    })
    if (!product) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Produit introuvable : ${productId}`)
    }

    const variant = (product.variants as PostVariant[] | undefined)?.find((candidate) => candidate.id === variantId)
    if (!variant) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Variante introuvable : ${variantId}`)
    }

    const imageUrls = selectPostImages(product, variant)
    if (imageUrls.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Aucune image disponible pour publier cette variante sur Facebook."
      )
    }

    const price = selectPrice(variant.prices, await getDefaultCurrency(container))
    const storefront = container.resolve<StorefrontModuleService>(STOREFRONT_MODULE)

    const caption = buildCaption({
      product,
      variant,
      formattedPrice: price ? formatPrice(price) : undefined,
      isInStock: await isVariantInStock(container, variant),
      productUrl: storefront.getProductUrl(product.handle, variant.sku ? variant.id : undefined),
    })

    return new StepResponse<FacebookPostContent>({
      caption,
      imageUrls,
      previousMetadata: variant.metadata ?? {},
    })
  }
)
