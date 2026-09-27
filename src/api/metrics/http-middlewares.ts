import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { METRICS_MODULE } from "../../modules/metrics"
import { UNMATCHED_ROUTE } from "../../modules/metrics/constants"
import MetricsModuleService from "../../modules/metrics/service"

const NANOSECONDS_PER_SECOND = 1e9

// Labels use the route pattern (/admin/products/:id), never the raw URL, to keep series count bounded
function resolveRoutePattern(req: MedusaRequest): string {
  const routePath: unknown = req.route?.path
  return typeof routePath === "string" ? `${req.baseUrl}${routePath}` : UNMATCHED_ROUTE
}

export function recordHttpMetrics(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void {
  const startedAt = process.hrtime.bigint()

  res.on("finish", () => {
    const metrics = req.scope.resolve<MetricsModuleService>(METRICS_MODULE)
    metrics.recordHttpRequest({
      method: req.method,
      route: resolveRoutePattern(req),
      statusCode: res.statusCode,
      durationSeconds: Number(process.hrtime.bigint() - startedAt) / NANOSECONDS_PER_SECOND,
    })
  })

  next()
}
