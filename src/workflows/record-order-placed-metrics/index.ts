import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MathBN } from "@medusajs/framework/utils"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { METRICS_MODULE } from "../../modules/metrics"
import { PlacedOrderSample } from "../../modules/metrics/business-metrics"
import MetricsModuleService from "../../modules/metrics/service"

type RecordOrderPlacedMetricsInput = {
  orderId: string
}

// Only increments in-memory counters, so there is nothing to compensate
const recordOrderPlacedStep = createStep(
  "record-order-placed",
  async (order: PlacedOrderSample, { container }) => {
    container.resolve<MetricsModuleService>(METRICS_MODULE).recordOrderPlaced(order)
    return new StepResponse(undefined)
  }
)

export const recordOrderPlacedMetricsWorkflow = createWorkflow(
  "record-order-placed-metrics",
  ({ orderId }: RecordOrderPlacedMetricsInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["currency_code", "total"],
      filters: { id: orderId },
      options: { throwIfKeyNotFound: true },
    })

    const sample = transform({ orders }, ({ orders: [order] }): PlacedOrderSample => ({
      currencyCode: order.currency_code,
      total: MathBN.convert(order.total).toNumber(),
    }))

    recordOrderPlacedStep(sample)

    return new WorkflowResponse(sample)
  }
)
