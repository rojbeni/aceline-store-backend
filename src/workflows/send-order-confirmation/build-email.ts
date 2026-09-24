import { NotificationContent } from "@medusajs/framework/types"

export type OrderForConfirmation = {
  id: string
  display_id?: number | string | null
  shipping_address?: { first_name?: string | null } | null
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])

export function buildOrderConfirmationEmail(order: OrderForConfirmation): NotificationContent {
  const firstName = order.shipping_address?.first_name ?? ""
  const orderNumber = order.display_id ?? order.id
  const greeting = firstName ? `Hello ${escapeHtml(firstName)},` : "Hello,"

  return {
    subject: `Order confirmation: #${orderNumber}`,
    html: `<h1>Thank you for your order!</h1>
      <p>${greeting}</p>
      <p>We are currently preparing your items.</p>`,
    text: `Thank you for your order ${firstName}! Order number: #${orderNumber}`,
  }
}
