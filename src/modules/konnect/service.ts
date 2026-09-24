import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  Logger,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"

type KonnectOptions = {
  apiKey: string // format: "<walletId>:<apiKey>" from your Konnect dashboard
  receiverWalletId: string
  baseUrl?: string // defaults to sandbox; override for production
  webhookUrl: string // publicly reachable URL to this backend's webhook route
  successUrl?: string
  failUrl?: string
}

type InjectedDependencies = {
  logger: Logger
}

// Konnect amounts are in millimes (1 TND = 1000 millimes)
const TND_TO_MILLIMES = 1000

class KonnectPaymentProviderService extends AbstractPaymentProvider<KonnectOptions> {
  static identifier = "konnect"

  protected logger_: Logger
  protected options_: KonnectOptions

  constructor(container: InjectedDependencies, options: KonnectOptions) {
    // @ts-ignore - required by AbstractPaymentProvider constructor signature
    super(...arguments)
    this.logger_ = container.logger
    this.options_ = options
  }

  private get baseUrl() {
    return this.options_.baseUrl || "https://api.sandbox.konnect.network/api/v2"
  }

  private toMillimes(amount: number): number {
    return Math.round(amount * TND_TO_MILLIMES)
  }

  // Called when a payment session is first created at checkout
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data, context } = input
    const customer = context?.customer
    console.log("Konnect initiatePayment input:",
      this.options_.apiKey)
    try {
      const response = await fetch(`${this.baseUrl}/payments/init-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.options_.apiKey,
        },
        body: JSON.stringify({
          receiverWalletId: this.options_.receiverWalletId,
          token: currency_code.toUpperCase(), // "TND"
          amount: this.toMillimes(amount as number),
          type: "immediate",
          description: `Order payment`,
          acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
          lifespan: 10, // minutes before the payment link expires
          checkoutForm: true,
          firstName: customer?.first_name || "Customer",
          lastName: customer?.last_name || "",
          phoneNumber: customer?.phone || "00000000",
          email: customer?.email,
          orderId: (data?.resource_id as string) || undefined,
          webhook: this.options_.webhookUrl,
          successUrl: this.options_.successUrl,
          failUrl: this.options_.failUrl,
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Failed to initiate Konnect payment: ${errBody}`
        )
      }

      const result = await response.json() as {
        payUrl: string
        paymentRef: string
      }

      return {
        id: result.paymentRef,
        data: {
          payment_ref: result.paymentRef,
          pay_url: result.payUrl,
        },
      }
    } catch (e: any) {
      this.logger_.error(`Konnect initiatePayment error: ${e.message}`)
      throw e
    }
  }

  // Called to check/confirm the payment has actually gone through
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const paymentRef = input.data?.payment_ref as string
    const status = await this.fetchPaymentStatus(paymentRef)

    if (status === "completed") {
      return { data: input.data, status: "authorized" }
    }
    if (status === "pending") {
      return { data: input.data, status: "pending" }
    }
    throw new MedusaError(
      MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      `Konnect payment ${paymentRef} status: ${status}`
    )
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const paymentRef = input.data?.payment_ref as string
    const status = await this.fetchPaymentStatus(paymentRef)

    switch (status) {
      case "completed":
        return { status: "captured" }
      case "pending":
        return { status: "pending" }
      case "failed":
        return { status: "error" }
      default:
        return { status: "pending" }
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Konnect's "immediate" payment type auto-captures on completion —
    // nothing additional to do here, just echo the data back.
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    // Konnect does not support automated refunds via API at time of writing —
    // refunds must be processed manually from the Konnect merchant dashboard.
    this.logger_.warn(
      `Manual refund required in Konnect dashboard for payment_ref: ${input.data?.payment_ref}`
    )
    return { data: input.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // Konnect doesn't support amount updates on an initiated payment —
    // the storefront should void and re-initiate if the cart total changes.
    return { data: input.data }
  }

  // Handles the webhook Konnect calls after a payment completes
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const paymentRef = (payload.data as any)?.payment_ref
      || new URLSearchParams(payload.rawData as any).get("payment_ref")

    if (!paymentRef) {
      return { action: "not_supported" }
    }

    const status = await this.fetchPaymentStatus(paymentRef)

    if (status === "completed") {
      return {
        action: "authorized",
        data: {
          session_id: paymentRef,
          amount: 0, // Medusa fills this from the stored session; see docs note below
        },
      }
    }

    if (status === "failed") {
      return { action: "failed", data: { session_id: paymentRef, amount: 0 } }
    }

    return { action: "not_supported" }
  }

  private async fetchPaymentStatus(
    paymentRef: string
  ): Promise<"completed" | "pending" | "failed"> {
    const response = await fetch(
      `${this.baseUrl}/payments/${paymentRef}`,
      { headers: { "x-api-key": this.options_.apiKey } }
    )
    const json = await response.json() as { payment?: { status?: string } }
    const status = json.payment?.status

    if (status === "completed") return "completed"
    if (status === "pending") return "pending"
    return "failed"
  }
}

export default KonnectPaymentProviderService
