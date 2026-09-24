type Image = { url?: string | null }

export type PostPrice = {
  amount: number
  currency_code: string
}

export type PostVariant = {
  id: string
  sku?: string | null
  thumbnail?: string | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  metadata?: Record<string, unknown> | null
  images?: Image[] | null
  prices?: PostPrice[] | null
  options?: { value: string; option?: { title?: string | null } | null }[] | null
}

export type PostProduct = {
  title: string
  description?: string | null
  handle: string
  thumbnail?: string | null
  images?: Image[] | null
}

export type FacebookPostContent = {
  caption: string
  imageUrls: string[]
  previousMetadata: Record<string, unknown>
}
