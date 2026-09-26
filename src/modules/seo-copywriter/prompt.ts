import Anthropic from "@anthropic-ai/sdk"
import { ProductSeoSource } from "./types"

const MAX_PROMPT_IMAGES = 3

export const SEO_SYSTEM_PROMPT = `Tu es rédacteur e-commerce SEO pour Aceline, une boutique en ligne en Tunisie de vente des chaussures et accessoires tennis d'occasion (prix en TND).
Tu rédiges les fiches produits en français, pour des clients tunisiens.

Règles SEO :
- title : nom clair du produit avec uniquement sa marque et son modèle, 30 caractères maximum, sans majuscules abusives.
- subtitle : une accroche qui met en avant le bénéfice principal, 80 caractères maximum.
- seo_title : 60 caractères maximum, mot-clé principal au début, peut se terminer par " | Aceline" si la place le permet.
- seo_description : entre 120 et 160 caractères, incitative, contient le mot-clé principal et un appel à l'action.
- description : 20 à 30 mots en texte brut (pas de Markdown ni HTML), paragraphes séparés par une ligne vide. Commence par le bénéfice principal, puis matière, usages, entretien ou tailles si l'information existe.
- seo_keywords : 3 à 8 expressions que des clients tunisiens taperaient réellement dans Google.

N'invente jamais de caractéristique (matière, dimensions, origine, garantie, livraison) absente des informations ou des images fournies.
Évite le bourrage de mots-clés : le texte doit rester naturel.`

function describeProduct(source: ProductSeoSource): string {
  const lines = [
    `Titre actuel : ${source.title}`,
    source.subtitle && `Sous-titre actuel : ${source.subtitle}`,
    source.description && `Description actuelle : ${source.description}`,
    source.material && `Matière : ${source.material}`,
    source.type && `Type : ${source.type}`,
    source.collection && `Collection : ${source.collection}`,
    source.categories.length > 0 && `Catégories : ${source.categories.join(", ")}`,
    source.tags.length > 0 && `Tags : ${source.tags.join(", ")}`,
    ...source.options.map((option) => `Option ${option.title} : ${option.values.join(", ")}`),
  ]
  return lines.filter(Boolean).join("\n")
}

export function buildProductSeoContent(source: ProductSeoSource): Anthropic.Beta.BetaContentBlockParam[] {
  const images: Anthropic.Beta.BetaContentBlockParam[] = source.imageUrls
    .slice(0, MAX_PROMPT_IMAGES)
    .map((url) => ({ type: "image", source: { type: "url", url } }))

  return [
    ...images,
    { type: "text", text: `Rédige la fiche produit SEO à partir de ces informations :\n\n${describeProduct(source)}` },
  ]
}
