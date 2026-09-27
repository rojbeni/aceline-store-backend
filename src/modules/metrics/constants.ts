import {
  AuthWorkflowEvents,
  CartWorkflowEvents,
  CustomerWorkflowEvents,
  FulfillmentWorkflowEvents,
  OrderWorkflowEvents,
  PaymentEvents,
  ProductWorkflowEvents,
} from "@medusajs/framework/utils"

// Explicit list rather than a wildcard: the event name is a label, so it must stay bounded
export const TRACKED_EVENTS: string[] = [
  ...Object.values(OrderWorkflowEvents),
  ...Object.values(CartWorkflowEvents),
  ...Object.values(CustomerWorkflowEvents),
  ...Object.values(PaymentEvents),
  ...Object.values(FulfillmentWorkflowEvents),
  ...Object.values(AuthWorkflowEvents),
  ...Object.values(ProductWorkflowEvents),
]

// Seconds; tuned for API calls, from fast cached reads to slow third-party calls (Claude, Facebook)
export const HTTP_DURATION_BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]

export const UNMATCHED_ROUTE = "unmatched"
