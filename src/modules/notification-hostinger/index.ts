import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { HostingerNotificationService } from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [HostingerNotificationService],
})
