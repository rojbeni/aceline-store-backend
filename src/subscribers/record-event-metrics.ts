import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { METRICS_MODULE } from "../modules/metrics"
import { TRACKED_EVENTS } from "../modules/metrics/constants"
import MetricsModuleService from "../modules/metrics/service"

// Only increments an in-memory counter, so no workflow is needed
export default async function recordEventMetricsHandler({
  event: { name },
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  container.resolve<MetricsModuleService>(METRICS_MODULE).recordEvent(name)
}

export const config: SubscriberConfig = {
  event: TRACKED_EVENTS,
  context: { subscriberId: "record-event-metrics" },
}
