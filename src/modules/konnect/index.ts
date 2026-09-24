import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import KonnectPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [KonnectPaymentProviderService],
})
