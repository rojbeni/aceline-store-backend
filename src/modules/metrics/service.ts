import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client"
import { BusinessMetrics, BusinessSnapshot, PlacedOrderSample } from "./business-metrics"
import { HTTP_DURATION_BUCKETS } from "./constants"

export type HttpRequestSample = {
  method: string
  route: string
  statusCode: number
  durationSeconds: number
}

type HttpLabel = "method" | "route" | "status_code"

export default class MetricsModuleService {
  // A dedicated registry keeps our metrics isolated from other libraries using prom-client's global one
  protected registry_ = new Registry()
  protected httpRequests_: Counter<HttpLabel>
  protected httpDuration_: Histogram<HttpLabel>
  protected events_: Counter<"event">
  protected business_: BusinessMetrics

  constructor() {
    collectDefaultMetrics({ register: this.registry_ })

    this.httpRequests_ = new Counter({
      name: "medusa_http_requests_total",
      help: "HTTP requests handled, by method, route pattern and status code",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry_],
    })
    this.httpDuration_ = new Histogram({
      name: "medusa_http_request_duration_seconds",
      help: "HTTP request duration, by method, route pattern and status code",
      labelNames: ["method", "route", "status_code"],
      buckets: HTTP_DURATION_BUCKETS,
      registers: [this.registry_],
    })
    this.events_ = new Counter({
      name: "medusa_events_total",
      help: "Medusa events emitted, by event name",
      labelNames: ["event"],
      registers: [this.registry_],
    })
    this.business_ = new BusinessMetrics(this.registry_)
  }

  recordHttpRequest({ method, route, statusCode, durationSeconds }: HttpRequestSample): void {
    const labels = { method, route, status_code: String(statusCode) }
    this.httpRequests_.inc(labels)
    this.httpDuration_.observe(labels, durationSeconds)
  }

  recordEvent(eventName: string): void {
    this.events_.inc({ event: eventName })
  }

  recordOrderPlaced(order: PlacedOrderSample): void {
    this.business_.recordOrderPlaced(order)
  }

  setBusinessSnapshot(snapshot: BusinessSnapshot): void {
    this.business_.setSnapshot(snapshot)
  }

  get contentType(): string {
    return this.registry_.contentType
  }

  async render(): Promise<string> {
    return this.registry_.metrics()
  }
}
