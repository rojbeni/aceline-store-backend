// src/workflows/publish-facebook-post.ts
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, getTotalVariantAvailability, Modules } from "@medusajs/framework/utils"

type PublishInput = {
    productId: string
    variantId: string
}

type CompensationData = {
    variantId: string
    previousMetadata: Record<string, unknown>
}

export const publishToFacebookStep = createStep(
    "publish-to-facebook-step",
    async ({ productId, variantId }: PublishInput, { container }) => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const productModuleService = container.resolve(Modules.PRODUCT)

        const { data: [product] } = await query.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "description",
                "handle",
                "thumbnail",
                "images.url",
                "variants.id",
                "variants.title",
                "variants.sku",
                "variants.thumbnail",
                "variants.metadata",
                "variants.manage_inventory",
                "variants.allow_backorder",
                "variants.images.url",
                "variants.prices.amount",
                "variants.prices.currency_code",
                "variants.options.value",
                "variants.options.option.title",
            ],
            filters: { id: productId },
        })

        if (!product) {
            throw new Error(`Produit introuvable : ${productId}`)
        }

        const variant: any = product.variants?.find((v: any) => v.id === variantId)

        if (!variant) {
            throw new Error(`Variante introuvable : ${variantId}`)
        }

        // --- Disponibilité réelle du stock ---
        const availabilityMap = await getTotalVariantAvailability(query, {
            variant_ids: [variantId],
        })
        const availableQuantity = availabilityMap[variantId]?.availability ?? null
        const isAvailable =
            !variant.manage_inventory || variant.allow_backorder || (availableQuantity ?? 0) > 0

        // --- Prix dans la devise par défaut de la boutique ---
        const { data: [store] } = await query.graph({
            entity: "store",
            fields: ["supported_currencies.currency_code", "supported_currencies.is_default"],
        })
        const defaultCurrency =
            store?.supported_currencies?.find((c: any) => c.is_default)?.currency_code ??
            store?.supported_currencies?.[0]?.currency_code ??
            "usd"

        const price =
            variant.prices?.find((p: any) => p.currency_code === defaultCurrency) ??
            variant.prices?.[0] ??
            null

        const formattedPrice = price
            ? new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: price.currency_code.toUpperCase(),
            }).format(price.amount)
            : null

        // --- Images : celles de la variante, sinon celles du produit ---
        const variantImages = (variant.images ?? []).map((img: any) => img.url).filter(Boolean)
        const productImages = (product.images ?? []).map((img: any) => img.url).filter(Boolean)
        const fallbackThumbnail = variant.thumbnail || product.thumbnail

        const images =
            variantImages.length > 0
                ? variantImages
                : productImages.length > 0
                    ? productImages
                    : fallbackThumbnail
                        ? [fallbackThumbnail]
                        : []

        if (images.length === 0) {
            throw new Error("Aucune image disponible pour publier cette variante sur Facebook.")
        }

        // --- Légende ---
        const variantOptions = (variant.options ?? [])
            .map((o: any) => (o.option?.title ? `${o.option.title} : ${o.value}` : o.value))
            .filter(Boolean)
            .join(" / ")

        const productUrl = `${process.env.STOREFRONT_URL}/products/${product.handle}${variant.sku ? `?variant=${variant.id}` : ""
            }`

        const titleLine = variantOptions ? `${product.title} — ${variantOptions}` : product.title
        const infoLines = [
            formattedPrice ? `💰 Prix : ${formattedPrice}` : null,
            isAvailable ? "✅ En stock" : "❌ Rupture de stock",
            variant.sku ? `Réf. : ${variant.sku}` : null,
        ].filter(Boolean)

        const caption = [titleLine, product.description, infoLines.join("\n"), `Découvrir ici : ${productUrl}`]
            .filter(Boolean)
            .join("\n\n")

        // --- Publication Facebook (post multi-photos) ---
        // On utilise "me" plutôt que l'ID numérique de la page : pour les pages
        // migrées vers la "New Pages Experience", appeler /{page-id}/... directement
        // échoue avec l'erreur (#100) "The global id ... is not allowed for this call",
        // alors que le token de page résout déjà "me" vers la bonne page.
        const pageToken = process.env.FB_PAGE_ACCESS_TOKEN

        if (!pageToken) {
            throw new Error("Configuration Facebook manquante (FB_PAGE_ACCESS_TOKEN).")
        }

        const uploadedMediaIds: string[] = []
        for (const url of images) {
            const uploadRes = await fetch(`https://graph.facebook.com/v20.0/me/photos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, published: false, access_token: pageToken }),
            })
            const uploadJson = await uploadRes.json()

            if (!uploadRes.ok) {
                throw new Error(
                    `Erreur Facebook API (envoi image) : ${uploadJson.error?.message || "Échec de l'envoi"}`
                )
            }
            uploadedMediaIds.push(uploadJson.id)
        }

        const feedBody = {
            message: caption,
            access_token: pageToken,
            // Avec un corps JSON, attached_media est un vrai tableau JSON —
            // la notation attached_media[0]/[1] est une astuce propre au
            // form-encoding et n'est pas reconnue ici (silencieusement ignorée).
            attached_media: uploadedMediaIds.map((mediaId) => ({ media_fbid: mediaId })),
        }

        console.log("Publication sur Facebook :", { ...feedBody, access_token: undefined })
        const feedRes = await fetch(`https://graph.facebook.com/v20.0/me/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(feedBody),
        })

        const feedResult = await feedRes.json()

        if (!feedRes.ok) {
            throw new Error(`Erreur Facebook API : ${feedResult.error?.message || "Échec de publication"}`)
        }

        const fbPostId = feedResult.id || feedResult.post_id

        const previousMetadata = (variant.metadata as Record<string, unknown>) || {}

        await productModuleService.updateProductVariants(variantId, {
            metadata: {
                ...previousMetadata,
                facebook_post_id: fbPostId,
                facebook_published_at: new Date().toISOString(),
            },
        })

        return new StepResponse({ postId: fbPostId }, { variantId, previousMetadata })
    },
    // Fonction de compensation en cas d'échec ultérieur dans le workflow
    async (compensationData: CompensationData | undefined, { container }) => {
        if (!compensationData) return
        const productModuleService = container.resolve(Modules.PRODUCT)
        await productModuleService.updateProductVariants(compensationData.variantId, {
            metadata: compensationData.previousMetadata,
        })
    }
)

export const publishFacebookPostWorkflow = createWorkflow(
    "publish-facebook-post",
    (input: PublishInput) => {
        const res = publishToFacebookStep(input)
        return new WorkflowResponse(res)
    }
)
