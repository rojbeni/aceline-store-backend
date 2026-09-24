---
name: medusa-admin-widget
description: Create or refactor a Medusa v2 admin dashboard widget or UI route in src/admin/ using @medusajs/ui, react-query for data, and small presentational components with French UI text. Use when touching any .tsx file under src/admin.
---

# Writing a clean admin widget

## Rules

1. **Data fetching goes through `@tanstack/react-query`** (`useQuery` / `useMutation`) — no manual `loading` state with `useState` + `try/finally`.
2. **Refresh data by invalidating queries**, not `navigate(0)` (full page reload).
3. **Put API calls in a small hook or `lib/` function** (`usePublishToFacebook(variantId)`), so the component only renders.
4. **Split the component** once JSX passes ~60 lines: e.g. `FacebookStatus` (badge + text) and `FacebookActions` (buttons).
5. **Use `@medusajs/ui` components** (`Container`, `Heading`, `Text`, `Badge`, `Button`, `toast`) and Medusa's tailwind tokens (`text-ui-fg-subtle`) — no custom colors or raw HTML where a UI component exists.
6. **UI text in French**, identifiers in English.
7. **Typed props**: `DetailWidgetProps<AdminProductVariant>`; metadata reads are narrowed once into a typed helper (`getFacebookMetadata(data.metadata)`), not cast inline in JSX.
8. **Formatting helpers** (dates, prices) are pure functions outside the component.
9. `fetch` to `/admin/*` must send `credentials: "include"`.

## Template

```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProductVariant, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const publishToFacebook = async (productId: string | null | undefined, variantId: string) => {
  if (!productId) {
    throw new Error("Produit introuvable pour cette variante")
  }

  const response = await fetch(`/admin/products/${productId}/variants/${variantId}/publish-facebook`, {
    method: "POST",
    credentials: "include",
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.message ?? "Erreur lors de la publication")
  }
  return body
}

const ProductVariantFacebookWidget = ({ data: variant }: DetailWidgetProps<AdminProductVariant>) => {
  const queryClient = useQueryClient()
  const publish = useMutation({
    mutationFn: () => publishToFacebook(variant.product_id, variant.id),
    onSuccess: () => {
      toast.success("Publication réussie")
      queryClient.invalidateQueries()
    },
    onError: (error: Error) => toast.error("Erreur", { description: error.message }),
  })

  return (
    <Container className="flex items-center justify-between px-6 py-4">
      <Heading level="h2">Facebook</Heading>
      <Button size="small" variant="secondary" isLoading={publish.isPending} onClick={() => publish.mutate()}>
        Publier sur Facebook
      </Button>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product_variant.details.after" })

export default ProductVariantFacebookWidget
```

## Checklist
- [ ] react-query for requests, no manual loading state, no `navigate(0)`
- [ ] Components < ~60 lines of JSX, helpers outside the component
- [ ] Only `@medusajs/ui` components and `ui-*` tailwind tokens
- [ ] No `any` (`catch (err: any)` included)
