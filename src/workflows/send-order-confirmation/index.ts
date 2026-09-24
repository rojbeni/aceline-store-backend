import { createWorkflow, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { sendNotificationsStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { buildOrderConfirmationEmail } from "./build-email"

type SendOrderConfirmationInput = {
  orderId: string
}

export const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  ({ orderId }: SendOrderConfirmationInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["id", "email", "display_id", "shipping_address.first_name"],
      filters: { id: orderId },
      options: { throwIfKeyNotFound: true },
    })

    const notification = transform({ orders }, ({ orders: [order] }) => ({
      to: order.email ?? "",
      channel: "email",
      resource_id: order.id,
      resource_type: "order",
      content: buildOrderConfirmationEmail(order),
    }))

    // Orders created without an email (e.g. some draft orders) get no confirmation
    when({ notification }, ({ notification }) => !!notification.to).then(() => {
      sendNotificationsStep([notification])
    })

    return new WorkflowResponse(notification)
  }
)
