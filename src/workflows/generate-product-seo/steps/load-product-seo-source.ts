import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { ProductSeoSource } from "../../../modules/seo-copywriter/types"

const PRODUCT_FIELDS = [
  "title",
  "subtitle",
  "description",
  "material",
  "thumbnail",
  "images.url",
  "type.value",
  "collection.title",
  "categories.name",
  "tags.value",
  "options.title",
  "options.values.value",
]

// Claude downloads images itself, so only publicly reachable URLs are usable
const isPublicUrl = (url: string | null | undefined): url is string => !!url?.startsWith("https://")

type ProductOption = { title: string; values?: ({ value: string } | null)[] | null }

const toOptionSummary = (option: ProductOption): ProductSeoSource["options"][number] => ({
  title: option.title,
  values: (option.values ?? []).flatMap((optionValue) => (optionValue ? [optionValue.value] : [])),
})

export const loadProductSeoSourceStep = createStep(
  "load-product-seo-source",
  async (productId: string, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [product] } = await query.graph({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { id: productId },
    })
    if (!product) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Produit introuvable : ${productId}`)
    }

    const imageUrls = [product.thumbnail, ...(product.images ?? []).map((image) => image?.url)].filter(isPublicUrl)

    return new StepResponse<ProductSeoSource>({
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      material: product.material,
      type: product.type?.value,
      collection: product.collection?.title,
      categories: (product.categories ?? []).flatMap((category) => (category?.name ? [category.name] : [])),
      tags: (product.tags ?? []).flatMap((tag) => (tag?.value ? [tag.value] : [])),
      options: (product.options ?? []).flatMap((option) => (option ? [toOptionSummary(option)] : [])),
      imageUrls: [...new Set(imageUrls)],
    })
  }
)
