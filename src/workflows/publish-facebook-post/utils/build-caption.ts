import { PostProduct, PostVariant } from "../types"

type CaptionInput = {
  product: PostProduct
  variant: PostVariant
  formattedPrice?: string
  isInStock: boolean
  productUrl: string
}

const isPresent = (line: string | null | undefined): line is string => !!line

export function buildCaption({ product, variant, formattedPrice, isInStock, productUrl }: CaptionInput): string {
  const size = variant.options?.find((opt) => opt.option?.title?.toLowerCase() === "size")?.value;
  const title = `${product.title} - Pointure ${size}`
  const infoLines = [
    formattedPrice ? `💰 Prix : ${formattedPrice}` : null,
    isInStock ? "✅ En stock" : "❌ Rupture de stock",
  ].filter(isPresent)

  return ['🔥🤩🤩🌹🌹🔥💯💯🏅🎾🎾♣️', title, product.description, infoLines.join("\n"), '☎️ 21 614 007 ', `Découvrir ici : ${productUrl}`, '🚛✅➡️ livraison disponible']
    .filter(isPresent)
    .join("\n\n")
}
