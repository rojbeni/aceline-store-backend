import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { recordOrderPlacedMetricsWorkflow } from "../workflows/record-order-placed-metrics"

export default async function recordOrderPlacedMetricsHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await recordOrderPlacedMetricsWorkflow(container).run({ input: { orderId: data.id } })
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: { subscriberId: "record-order-placed-metrics" },
}
