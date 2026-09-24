export const KONNECT_SANDBOX_URL = "https://api.sandbox.konnect.network/api/v2"

// Konnect amounts are in millimes (1 TND = 1000 millimes)
export const TND_TO_MILLIMES = 1000

export const PAYMENT_LINK_LIFESPAN_MINUTES = 10

export const ACCEPTED_PAYMENT_METHODS = ["wallet", "bank_card", "e-DINAR"]

// Konnect requires a name and phone number even when the customer has none
export const FALLBACK_FIRST_NAME = "Customer"
export const FALLBACK_PHONE_NUMBER = "00000000"
