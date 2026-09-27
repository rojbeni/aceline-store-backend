import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { METRICS_MODULE } from "../../modules/metrics"
import MetricsModuleService from "../../modules/metrics/service"
import { refreshBusinessMetricsWorkflow } from "../../workflows/refresh-business-metrics"

// Prometheus scrape endpoint
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  // A failed refresh must not hide the technical metrics: serve the last known business values instead
  const { errors } = await refreshBusinessMetricsWorkflow(req.scope).run({ throwOnError: false })
  if (errors.length > 0) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.warn(`Business metrics refresh failed: ${errors.map(({ error }) => error.message).join("; ")}`)
  }

  const metrics = req.scope.resolve<MetricsModuleService>(METRICS_MODULE)
  res.setHeader("Content-Type", metrics.contentType)
  res.send(await metrics.render())
}
