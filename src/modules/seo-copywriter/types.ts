import { z } from "zod"

export type SeoCopywriterOptions = {
  apiKey: string
  model?: string
}

// Everything we know about a product, flattened so the prompt stays independent of Medusa's query shape
export type ProductSeoSource = {
  title: string
  subtitle?: string | null
  description?: string | null
  material?: string | null
  type?: string | null
  collection?: string | null
  categories: string[]
  tags: string[]
  options: { title: string; values: string[] }[]
  imageUrls: string[]
}

// No length constraints in the schema: structured outputs don't enforce them,
// so the limits live in the prompt and the admin reviews before applying.
export const productSeoContentSchema = z.object({
  title: z.string().describe("Nom du produit optimisé, 70 caractères maximum"),
  subtitle: z.string().describe("Accroche courte, 80 caractères maximum"),
  description: z.string().describe("Description produit en texte brut, paragraphes séparés par une ligne vide"),
  seo_title: z.string().describe("Balise title, 60 caractères maximum"),
  seo_description: z.string().describe("Meta description, entre 120 et 160 caractères"),
  seo_keywords: z.array(z.string()).describe("3 à 8 mots-clés de recherche"),
})

export type ProductSeoContent = z.infer<typeof productSeoContentSchema>
