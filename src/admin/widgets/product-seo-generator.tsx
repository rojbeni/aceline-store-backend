import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { applyProductSeo, generateProductSeo, ProductSeoContent } from "../lib/product-seo"

const SEO_TITLE_MAX_LENGTH = 60
const SEO_DESCRIPTION_MAX_LENGTH = 160

type PreviewField = {
  label: string
  value: string
  maxLength?: number
}

const toPreviewFields = (seo: ProductSeoContent): PreviewField[] => [
  { label: "Titre", value: seo.title },
  { label: "Sous-titre", value: seo.subtitle },
  { label: "Balise title", value: seo.seo_title, maxLength: SEO_TITLE_MAX_LENGTH },
  { label: "Meta description", value: seo.seo_description, maxLength: SEO_DESCRIPTION_MAX_LENGTH },
  { label: "Mots-clés", value: seo.seo_keywords.join(", ") },
  { label: "Description", value: seo.description },
]

const SeoPreviewField = ({ label, value, maxLength }: PreviewField) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Text size="small" weight="plus">{label}</Text>
      {maxLength && (
        <Text size="xsmall" className={value.length > maxLength ? "text-ui-fg-error" : "text-ui-fg-muted"}>
          {value.length}/{maxLength}
        </Text>
      )}
    </div>
    <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">{value}</Text>
  </div>
)

const ProductSeoGenerator = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()

  const generate = useMutation({
    mutationFn: () => generateProductSeo(product.id),
    onError: (error: Error) => toast.error("Erreur de génération", { description: error.message }),
  })

  const apply = useMutation({
    mutationFn: (seo: ProductSeoContent) => applyProductSeo(product, seo),
    onSuccess: () => {
      toast.success("Contenu SEO appliqué")
      generate.reset()
      queryClient.invalidateQueries()
    },
    onError: (error: Error) => toast.error("Erreur", { description: error.message }),
  })

  const proposal = generate.data

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">SEO</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Générez un titre, une description et des balises SEO avec Claude.
          </Text>
        </div>
        <Button variant="secondary" size="small" isLoading={generate.isPending} onClick={() => generate.mutate()}>
          {proposal ? "Régénérer" : "Générer avec l'IA"}
        </Button>
      </div>
      {proposal && (
        <div className="space-y-4 px-6 py-4">
          {toPreviewFields(proposal).map((field) => (
            <SeoPreviewField key={field.label} {...field} />
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="transparent" size="small" onClick={() => generate.reset()}>
              Annuler
            </Button>
            <Button size="small" isLoading={apply.isPending} onClick={() => apply.mutate(proposal)}>
              Appliquer
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSeoGenerator
