import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProductVariant, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"

type FacebookPublication = {
  postId?: string
  publishedAt?: string
}

const getFacebookPublication = (metadata: Record<string, unknown> | null | undefined): FacebookPublication => ({
  postId: typeof metadata?.facebook_post_id === "string" ? metadata.facebook_post_id : undefined,
  publishedAt: typeof metadata?.facebook_published_at === "string" ? metadata.facebook_published_at : undefined,
})

const formatPublishedAt = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const publishToFacebook = async (productId: string | null | undefined, variantId: string): Promise<void> => {
  if (!productId) {
    throw new Error("Produit introuvable pour cette variante")
  }

  const response = await fetch(`/admin/products/${productId}/variants/${variantId}/publish-facebook`, {
    method: "POST",
    credentials: "include",
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message ?? "Erreur lors de la publication")
  }
}

const FacebookStatus = ({ postId, publishedAt }: FacebookPublication) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <Heading level="h2">Facebook</Heading>
      {postId ? <Badge color="green">Publié</Badge> : <Badge color="grey">Non publié</Badge>}
    </div>
    <Text size="small" className="text-ui-fg-subtle">
      {postId && publishedAt
        ? `Dernière publication le ${formatPublishedAt(publishedAt)} (ID: ${postId})`
        : "Cette variante n'a pas encore été partagée sur votre page."}
    </Text>
  </div>
)

const ProductVariantFacebookPublisher = ({ data: variant }: DetailWidgetProps<AdminProductVariant>) => {
  const queryClient = useQueryClient()
  const publication = getFacebookPublication(variant.metadata)

  const publish = useMutation({
    mutationFn: () => publishToFacebook(variant.product_id, variant.id),
    onSuccess: () => {
      toast.success("Publication réussie", { description: "Cette variante est en ligne sur Facebook." })
      // Reloads the variant so the new post id and date are shown
      queryClient.invalidateQueries()
    },
    onError: (error: Error) => toast.error("Erreur", { description: error.message }),
  })

  return (
    <Container className="flex items-center justify-between px-6 py-4">
      <FacebookStatus {...publication} />
      <div className="flex items-center gap-2">
        {publication.postId && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => window.open(`https://facebook.com/${publication.postId}`, "_blank")}
          >
            Voir le post
          </Button>
        )}
        <Button
          variant={publication.postId ? "transparent" : "secondary"}
          size="small"
          isLoading={publish.isPending}
          onClick={() => publish.mutate()}
        >
          {publication.postId ? "Republier" : "Publier sur Facebook"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.after",
})

export default ProductVariantFacebookPublisher
