import { PostPrice } from "../types"

const PRICE_LOCALE = "fr-FR"

// Price in the store's default currency, or the first price if there is none
export function selectPrice(prices: PostPrice[] | null | undefined, defaultCurrency?: string): PostPrice | undefined {
  return prices?.find((price) => price.currency_code === defaultCurrency) ?? prices?.[0]
}

export function formatPrice(price: PostPrice): string {
  return new Intl.NumberFormat(PRICE_LOCALE, {
    style: "currency",
    currency: price.currency_code.toUpperCase(),
  }).format(price.amount)
}
