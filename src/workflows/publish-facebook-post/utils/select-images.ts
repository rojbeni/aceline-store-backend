import { PostProduct, PostVariant } from "../types"

const toUrls = (images: PostVariant["images"]): string[] =>
  (images ?? []).map((image) => image.url).filter((url): url is string => !!url)

// Variant images first, then product images, then a thumbnail
export function selectPostImages(product: PostProduct, variant: PostVariant): string[] {
  const variantImages = toUrls(variant.images)
  if (variantImages.length > 0) {
    return variantImages
  }

  const productImages = toUrls(product.images)
  if (productImages.length > 0) {
    return productImages
  }

  const thumbnail = variant.thumbnail || product.thumbnail
  return thumbnail ? [thumbnail] : []
}
