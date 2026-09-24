export type KonnectOptions = {
  apiKey: string // format: "<walletId>:<apiKey>" from the Konnect dashboard
  receiverWalletId: string
  baseUrl?: string // defaults to sandbox; override for production
  webhookUrl: string // publicly reachable URL to this backend's webhook route
  successUrl?: string
  failUrl?: string
}

export type KonnectPaymentStatus = "completed" | "pending" | "failed"

export type KonnectInitPaymentRequest = {
  receiverWalletId: string
  token: string
  amount: number
  type: "immediate"
  description: string
  acceptedPaymentMethods: string[]
  lifespan: number
  checkoutForm: boolean
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string
  orderId?: string
  webhook: string
  successUrl?: string
  failUrl?: string
}

export type KonnectInitPaymentResponse = {
  payUrl: string
  paymentRef: string
}

export type KonnectPayment = {
  status?: string
  orderId?: string
  amount?: number
}

export type KonnectGetPaymentResponse = {
  payment?: KonnectPayment
}
