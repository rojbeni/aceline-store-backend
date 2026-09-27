import { Module } from "@medusajs/framework/utils"
import MetricsModuleService from "./service"

export const METRICS_MODULE = "metrics"

export default Module(METRICS_MODULE, {
  service: MetricsModuleService,
})
