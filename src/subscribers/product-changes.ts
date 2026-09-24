import type { MedusaContainer, SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { STOREFRONT_MODULE } from "../modules/storefront"
import StorefrontModuleService from "../modules/storefront/service"

const PRODUCT_EVENTS = ["product.created", "product.updated", "product.deleted"]
const VARIANT_EVENTS = ["product-variant.updated"]
// The payload id of these events is a price / price set / price list id, so
// we can't target one product page and refresh the product list instead.
const PRICE_EVENTS = ["price-set.updated", "price-list.updated", "price.updated"]

const ALL_PRODUCTS_TAG = "products"

async function getVariantProductId(container: MedusaContainer, variantId: string): Promise<string | undefined> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [variant] } = await query.graph({
    entity: "product_variant",
    fields: ["product_id"],
    filters: { id: variantId },
  })
  return variant?.product_id ?? undefined
}

async function getChangedProductId(container: MedusaContainer, eventName: string, id: string) {
  if (PRODUCT_EVENTS.includes(eventName)) {
    return id
  }
  if (VARIANT_EVENTS.includes(eventName)) {
    return getVariantProductId(container, id)
  }
  return undefined
}

export default async function productChangeHandler({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = await getChangedProductId(container, name, data.id)
  const tags = productId ? [ALL_PRODUCTS_TAG, `product-${productId}`] : [ALL_PRODUCTS_TAG]

  const storefront = container.resolve<StorefrontModuleService>(STOREFRONT_MODULE)
  await storefront.revalidateTags(tags)
}

export const config: SubscriberConfig = {
  event: [...PRODUCT_EVENTS, ...VARIANT_EVENTS, ...PRICE_EVENTS],
}
