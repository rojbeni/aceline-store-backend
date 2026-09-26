import Anthropic from "@anthropic-ai/sdk"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { MedusaError } from "@medusajs/framework/utils"
import { buildProductSeoContent, SEO_SYSTEM_PROMPT } from "./prompt"
import { ProductSeoContent, productSeoContentSchema, ProductSeoSource, SeoCopywriterOptions } from "./types"

const DEFAULT_MODEL = "claude-opus-5"
const MAX_OUTPUT_TOKENS = 16000
// On a safety refusal the API re-runs the request on a fallback model it picks itself
const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01"

export default class SeoCopywriterModuleService {
  protected options_: SeoCopywriterOptions
  protected client_: Anthropic

  constructor(_container: unknown, options: SeoCopywriterOptions) {
    if (!options?.apiKey) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `SEO copywriter: option "apiKey" is required`)
    }
    this.options_ = options
    this.client_ = new Anthropic({ apiKey: options.apiKey })
  }

  async generateProductSeo(source: ProductSeoSource): Promise<ProductSeoContent> {
    const message = await this.requestProductSeo(source)

    if (message.stop_reason === "refusal") {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Claude a refusé de générer le contenu de ce produit.")
    }
    if (!message.parsed_output) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Réponse de Claude inexploitable (stop_reason : ${message.stop_reason})`
      )
    }
    return message.parsed_output
  }

  private async requestProductSeo(source: ProductSeoSource) {
    try {
      return await this.client_.beta.messages.parse({
        model: this.options_.model ?? DEFAULT_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        betas: [SERVER_SIDE_FALLBACK_BETA],
        fallbacks: "default",
        system: SEO_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildProductSeoContent(source) }],
        output_config: { format: betaZodOutputFormat(productSeoContentSchema) },
      })
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Erreur Claude API (${error.status ?? "réseau"}) : ${error.message}`
        )
      }
      throw error
    }
  }
}
