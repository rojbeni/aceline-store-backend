import { AdminProduct } from "@medusajs/framework/types"

export type ProductSeoContent = {
  title: string
  subtitle: string
  description: string
  seo_title: string
  seo_description: string
  seo_keywords: string[]
}

async function postAdmin<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const responseBody = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(responseBody.message ?? `Erreur de la requête (${response.status})`)
  }
  return responseBody as T
}

export async function generateProductSeo(productId: string): Promise<ProductSeoContent> {
  const { seo } = await postAdmin<{ seo: ProductSeoContent }>(`/admin/products/${productId}/generate-seo`)
  return seo
}

// Medusa replaces metadata as a whole, so existing keys are merged back in.
// Keywords are stored as a string because the admin metadata editor only handles primitives.
export async function applyProductSeo(product: AdminProduct, seo: ProductSeoContent): Promise<void> {
  await postAdmin(`/admin/products/${product.id}`, {
    title: seo.title,
    subtitle: seo.subtitle,
    description: seo.description,
    metadata: {
      ...product.metadata,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      seo_keywords: seo.seo_keywords.join(", "),
    },
  })
}
