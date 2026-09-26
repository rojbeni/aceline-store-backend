import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { generateProductSeoContentStep } from "./steps/generate-product-seo-content"
import { loadProductSeoSourceStep } from "./steps/load-product-seo-source"

type GenerateProductSeoInput = {
  productId: string
}

// Only proposes content: the admin reviews it and saves it through the regular product update
export const generateProductSeoWorkflow = createWorkflow(
  "generate-product-seo",
  (input: GenerateProductSeoInput) => {
    const source = loadProductSeoSourceStep(input.productId)
    const content = generateProductSeoContentStep(source)

    return new WorkflowResponse(content)
  }
)
