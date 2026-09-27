import { defineMiddlewares } from "@medusajs/framework/http"
import { recordHttpMetrics } from "./metrics/http-middlewares"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/*",
      middlewares: [recordHttpMetrics],
    },
  ],
})
