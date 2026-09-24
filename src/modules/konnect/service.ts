import { AbstractPaymentProvider, MathBN, MedusaError } from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  BigNumberInput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { KonnectClient } from "./client"
import {
  ACCEPTED_PAYMENT_METHODS,
  FALLBACK_FIRST_NAME,
  FALLBACK_PHONE_NUMBER,
  KONNECT_SANDBOX_URL,
  PAYMENT_LINK_LIFESPAN_MINUTES,
  TND_TO_MILLIMES,
} from "./constants"
import { KonnectOptions, KonnectPaymentStatus } from "./types"

type InjectedDependencies = {
  logger: Logger
}

const REQUIRED_OPTIONS = ["apiKey", "receiverWalletId", "webhookUrl"] as const

const SESSION_STATUS_BY_KONNECT_STATUS: Record<KonnectPaymentStatus, PaymentSessionStatus> = {
  completed: "captured",
  pending: "pending",
  failed: "error",
}

const toMillimes = (amount: BigNumberInput): number =>
  Math.round(MathBN.convert(amount).toNumber() * TND_TO_MILLIMES)

const fromMillimes = (millimes: number): number => millimes / TND_TO_MILLIMES

const toKonnectStatus = (status: string | undefined): KonnectPaymentStatus => {
  if (status === "completed" || status === "pending") {
    return status
  }
  return "failed"
}

const getPaymentRef = (data: Record<string, unknown> | undefined): string => {
  const paymentRef = data?.payment_ref
  if (typeof paymentRef !== "string") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Konnect payment_ref is missing")
  }
  return paymentRef
}

const getWebhookPaymentRef = ({ data, rawData }: ProviderWebhookPayload["payload"]): string | null => {
  if (typeof data?.payment_ref === "string") {
    return data.payment_ref
  }
  return rawData ? new URLSearchParams(rawData.toString()).get("payment_ref") : null
}

class KonnectPaymentProviderService extends AbstractPaymentProvider<KonnectOptions> {
  static identifier = "konnect"

  protected logger_: Logger
  protected options_: KonnectOptions
  protected client_: KonnectClient

  static validateOptions(options: Record<string, unknown>) {
    for (const key of REQUIRED_OPTIONS) {
      if (!options[key]) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Konnect: option "${key}" is required`)
      }
    }
  }

  constructor(container: InjectedDependencies, options: KonnectOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.client_ = new KonnectClient(options.apiKey, options.baseUrl || KONNECT_SANDBOX_URL)
  }

  // Called when a payment session is first created at checkout
  async initiatePayment({ amount, currency_code, data, context }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const customer = context?.customer

    const payment = await this.client_.initPayment({
      receiverWalletId: this.options_.receiverWalletId,
      token: currency_code.toUpperCase(),
      amount: toMillimes(amount),
      type: "immediate",
      description: "Order payment",
      acceptedPaymentMethods: ACCEPTED_PAYMENT_METHODS,
      lifespan: PAYMENT_LINK_LIFESPAN_MINUTES,
      checkoutForm: true,
      firstName: customer?.first_name || FALLBACK_FIRST_NAME,
      lastName: customer?.last_name || "",
      phoneNumber: customer?.phone || FALLBACK_PHONE_NUMBER,
      email: customer?.email,
      // Konnect echoes orderId back when we fetch the payment, which is how
      // the webhook finds the Medusa payment session it belongs to.
      orderId: typeof data?.session_id === "string" ? data.session_id : undefined,
      webhook: this.options_.webhookUrl,
      successUrl: this.options_.successUrl,
      failUrl: this.options_.failUrl,
    })

    return {
      id: payment.paymentRef,
      data: {
        payment_ref: payment.paymentRef,
        pay_url: payment.payUrl,
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const paymentRef = getPaymentRef(input.data)
    const status = await this.fetchPaymentStatus(paymentRef)

    if (status === "failed") {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Konnect payment ${paymentRef} status: ${status}`
      )
    }

    return { data: input.data, status: status === "completed" ? "authorized" : "pending" }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const status = await this.fetchPaymentStatus(getPaymentRef(input.data))
    return { status: SESSION_STATUS_BY_KONNECT_STATUS[status] }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Konnect's "immediate" payment type auto-captures on completion
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    // Konnect has no refund API: refunds are done by hand in the merchant dashboard
    this.logger_.warn(`Manual refund required in Konnect dashboard for payment_ref: ${input.data?.payment_ref}`)
    return { data: input.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // Konnect can't change the amount of an initiated payment —
    // the storefront should void and re-initiate if the cart total changes.
    return { data: input.data }
  }

  // Handles the webhook Konnect calls after a payment completes
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const paymentRef = getWebhookPaymentRef(payload)
    if (!paymentRef) {
      return { action: "not_supported" }
    }

    const payment = await this.client_.getPayment(paymentRef)
    const sessionId = payment.orderId
    if (!sessionId) {
      this.logger_.warn(`Konnect webhook: payment ${paymentRef} has no orderId, cannot match a payment session`)
      return { action: "not_supported" }
    }

    const data = { session_id: sessionId, amount: fromMillimes(payment.amount ?? 0) }

    switch (toKonnectStatus(payment.status)) {
      case "completed":
        return { action: "authorized", data }
      case "failed":
        return { action: "failed", data }
      default:
        return { action: "not_supported" }
    }
  }

  private async fetchPaymentStatus(paymentRef: string): Promise<KonnectPaymentStatus> {
    const payment = await this.client_.getPayment(paymentRef)
    return toKonnectStatus(payment.status)
  }
}

export default KonnectPaymentProviderService
