import { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<any>) {
    const notificationModule = container.resolve(Modules.NOTIFICATION)
    const orderService = container.resolve(Modules.ORDER)

    // Fetch full order data if necessary
    const order = await orderService.retrieveOrder(data.id, {
        relations: ["shipping_address", "items"],
    })

    // Trigger the email notification
    await notificationModule.createNotifications({
        to: order.email!,
        channel: "email",
        content: {
            subject: `Order confirmation: #${order.id}`,
            html: `<h1>Thank you for your order!</h1>
                <p>Hello ${order.shipping_address?.first_name!},</p>
                <p>We are currently preparing your items.</p>`,
            text: `Thank you for your order ${order.shipping_address?.first_name || ""}! Tracking number: ${order.id}`,
        },
    })
}

export const config: SubscriberConfig = {
    event: "order.placed",
}