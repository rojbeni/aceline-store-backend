import { Counter, Gauge, Registry } from "prom-client"

export type PlacedOrderSample = {
  currencyCode: string
  // Main currency unit (e.g. 12.5 TND), as Medusa stores it
  total: number
}

// Current store state, recounted from the database on each scrape
export type BusinessSnapshot = {
  ordersByStatus: Record<string, number>
  productsByStatus: Record<string, number>
  registeredCustomers: number
  abandonedCheckouts: number
}

// Business metrics use the "aceline_" prefix to separate them from technical "medusa_" ones
export class BusinessMetrics {
  protected ordersPlaced_: Counter<"currency">
  protected orderRevenue_: Counter<"currency">
  protected orders_: Gauge<"status">
  protected products_: Gauge<"status">
  protected registeredCustomers_: Gauge
  protected abandonedCheckouts_: Gauge

  constructor(registry: Registry) {
    const registers = [registry]
    this.ordersPlaced_ = new Counter({
      name: "aceline_orders_placed_total",
      help: "Orders placed, by currency",
      labelNames: ["currency"],
      registers,
    })
    this.orderRevenue_ = new Counter({
      name: "aceline_order_revenue_total",
      help: "Total amount of placed orders in the main currency unit, by currency",
      labelNames: ["currency"],
      registers,
    })
    this.orders_ = new Gauge({
      name: "aceline_orders",
      help: "Orders currently in each status",
      labelNames: ["status"],
      registers,
    })
    this.products_ = new Gauge({
      name: "aceline_products",
      help: "Products currently in each status",
      labelNames: ["status"],
      registers,
    })
    this.registeredCustomers_ = new Gauge({
      name: "aceline_registered_customers",
      help: "Customers with an account",
      registers,
    })
    this.abandonedCheckouts_ = new Gauge({
      name: "aceline_abandoned_checkouts",
      help: "Carts with an email that were left without completing checkout during the tracked window",
      registers,
    })
  }

  recordOrderPlaced({ currencyCode, total }: PlacedOrderSample): void {
    const labels = { currency: currencyCode.toUpperCase() }
    this.ordersPlaced_.inc(labels)
    this.orderRevenue_.inc(labels, total)
  }

  setSnapshot(snapshot: BusinessSnapshot): void {
    for (const [status, count] of Object.entries(snapshot.ordersByStatus)) {
      this.orders_.set({ status }, count)
    }
    for (const [status, count] of Object.entries(snapshot.productsByStatus)) {
      this.products_.set({ status }, count)
    }
    this.registeredCustomers_.set(snapshot.registeredCustomers)
    this.abandonedCheckouts_.set(snapshot.abandonedCheckouts)
  }
}
