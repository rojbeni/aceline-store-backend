// src/api/admin/products/[id]/variants/[variant_id]/publish-facebook/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { publishFacebookPostWorkflow } from "../../../../../../../workflows/publish-facebook-post"

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    const { id, variant_id } = req.params

    const { result } = await publishFacebookPostWorkflow(req.scope).run({
        input: { productId: id, variantId: variant_id },
    })

    res.status(200).json({ success: true, result })
}
