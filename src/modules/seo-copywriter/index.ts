import { Module } from "@medusajs/framework/utils"
import SeoCopywriterModuleService from "./service"

export const SEO_COPYWRITER_MODULE = "seoCopywriter"

export default Module(SEO_COPYWRITER_MODULE, {
  service: SeoCopywriterModuleService,
})
