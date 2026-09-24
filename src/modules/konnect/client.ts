import { MedusaError } from "@medusajs/framework/utils"
import {
  KonnectGetPaymentResponse,
  KonnectInitPaymentRequest,
  KonnectInitPaymentResponse,
  KonnectPayment,
} from "./types"

export class KonnectClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string
  ) {}

  async initPayment(body: KonnectInitPaymentRequest): Promise<KonnectInitPaymentResponse> {
    return this.request<KonnectInitPaymentResponse>("/payments/init-payment", {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async getPayment(paymentRef: string): Promise<KonnectPayment> {
    const response = await this.request<KonnectGetPaymentResponse>(`/payments/${paymentRef}`)
    return response.payment ?? {}
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...init.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Konnect ${path} failed (${response.status}): ${body}`
      )
    }

    return (await response.json()) as T
  }
}
