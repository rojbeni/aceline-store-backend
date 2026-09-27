import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, OrderStatus, ProductStatus } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { BusinessSnapshot } from "../../../modules/metrics/business-metrics"

// A checkout counts as abandoned after an hour of inactivity; older than a week it's no longer actionable
const ABANDONED_AFTER_MS = 60 * 60 * 1000
const ABANDONED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

type CountedEntity = "order" | "product" | "customer" | "cart"

// Fetches a single row: only the total count from the pagination metadata is used.
// `skip` is required: with `take` alone, Query returns no count in the metadata.
async function countEntities(
  container: MedusaContainer,
  entity: CountedEntity,
  filters: Record<string, unknown>
): Promise<number> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { metadata } = await query.graph({ entity, fields: ["id"], filters, pagination: { skip: 0, take: 1 } })
  return metadata?.count ?? 0
}

async function countByStatus(container: MedusaContainer, entity: CountedEntity, statuses: string[]) {
  const counts = await Promise.all(statuses.map((status) => countEntities(container, entity, { status })))
  return Object.fromEntries(statuses.map((status, index) => [status, counts[index]]))
}

function countAbandonedCheckouts(container: MedusaContainer): Promise<number> {
  const now = Date.now()
  return countEntities(container, "cart", {
    completed_at: null,
    email: { $ne: null },
    updated_at: {
      $lt: new Date(now - ABANDONED_AFTER_MS),
      $gte: new Date(now - ABANDONED_WINDOW_MS),
    },
  })
}

export const countBusinessEntitiesStep = createStep("count-business-entities", async (_input: void, { container }) => {
  const [ordersByStatus, productsByStatus, registeredCustomers, abandonedCheckouts] = await Promise.all([
    countByStatus(container, "order", Object.values(OrderStatus)),
    countByStatus(container, "product", Object.values(ProductStatus)),
    countEntities(container, "customer", { has_account: true }),
    countAbandonedCheckouts(container),
  ])

  return new StepResponse<BusinessSnapshot>({
    ordersByStatus,
    productsByStatus,
    registeredCustomers,
    abandonedCheckouts,
  })
})
