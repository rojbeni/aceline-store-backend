// src/admin/widgets/product-variant-facebook-publisher.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProductVariant } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, toast } from "@medusajs/ui"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const ProductVariantFacebookPublisher = ({ data }: DetailWidgetProps<AdminProductVariant>) => {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const fbPostId = data.metadata?.facebook_post_id as string | undefined
    const fbPublishedAt = data.metadata?.facebook_published_at as string | undefined

    const handlePublish = async () => {
        setLoading(true)
        try {
            const response = await fetch(
                `/admin/products/${data.product_id}/variants/${data.id}/publish-facebook`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }
            )

            const json = await response.json()

            if (!response.ok) {
                throw new Error(json.message || "Erreur lors de la publication")
            }

            toast.success("Publication réussie", {
                description: "Cette variante est en ligne sur Facebook.",
            })

            // Rafraîchit les données de la variante dans l'interface
            navigate(0)
        } catch (err: any) {
            toast.error("Erreur", {
                description: err.message,
            })
        } finally {
            setLoading(false)
        }
    }

    const formattedDate = fbPublishedAt
        ? new Date(fbPublishedAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : null

    return (
        <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Heading level="h2">Facebook</Heading>
                        {fbPostId ? (
                            <Badge color="green">Publié</Badge>
                        ) : (
                            <Badge color="grey">Non publié</Badge>
                        )}
                    </div>
                    <p className="text-ui-fg-subtle text-small">
                        {fbPostId && formattedDate
                            ? `Dernière publication le ${formattedDate} (ID: ${fbPostId})`
                            : "Cette variante n'a pas encore été partagée sur votre page."}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {fbPostId && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => window.open(`https://facebook.com/${fbPostId}`, "_blank")}
                        >
                            Voir le post
                        </Button>
                    )}
                    <Button
                        variant={fbPostId ? "transparent" : "secondary"}
                        size="small"
                        isLoading={loading}
                        onClick={handlePublish}
                    >
                        {fbPostId ? "Republier" : "Publier sur Facebook"}
                    </Button>
                </div>
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "product_variant.details.after",
})

export default ProductVariantFacebookPublisher
