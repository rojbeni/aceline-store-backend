import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { METRICS_MODULE } from "../../modules/metrics"
import { BusinessSnapshot } from "../../modules/metrics/business-metrics"
import MetricsModuleService from "../../modules/metrics/service"
import { countBusinessEntitiesStep } from "./steps/count-business-entities"

// Only overwrites in-memory gauges, so there is nothing to compensate
const publishBusinessSnapshotStep = createStep(
  "publish-business-snapshot",
  async (snapshot: BusinessSnapshot, { container }) => {
    container.resolve<MetricsModuleService>(METRICS_MODULE).setBusinessSnapshot(snapshot)
    return new StepResponse(undefined)
  }
)

// Recounted at scrape time rather than tracked from events, so values survive restarts and match across instances
export const refreshBusinessMetricsWorkflow = createWorkflow("refresh-business-metrics", () => {
  const snapshot = countBusinessEntitiesStep()
  publishBusinessSnapshotStep(snapshot)

  return new WorkflowResponse(snapshot)
})
