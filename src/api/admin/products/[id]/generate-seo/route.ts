import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { generateProductSeoWorkflow } from "../../../../../workflows/generate-product-seo"

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { result } = await generateProductSeoWorkflow(req.scope).run({
    input: { productId: req.params.id },
  })

  res.json({ seo: result })
}
