import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SEO_COPYWRITER_MODULE } from "../../../modules/seo-copywriter"
import SeoCopywriterModuleService from "../../../modules/seo-copywriter/service"
import { ProductSeoSource } from "../../../modules/seo-copywriter/types"

// Read-only (nothing is saved), so there is nothing to compensate
export const generateProductSeoContentStep = createStep(
  "generate-product-seo-content",
  async (source: ProductSeoSource, { container }) => {
    const copywriter = container.resolve<SeoCopywriterModuleService>(SEO_COPYWRITER_MODULE)
    return new StepResponse(await copywriter.generateProductSeo(source))
  }
)
