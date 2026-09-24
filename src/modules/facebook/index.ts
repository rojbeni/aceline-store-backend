import { Module } from "@medusajs/framework/utils"
import FacebookModuleService from "./service"

export const FACEBOOK_MODULE = "facebook"

export default Module(FACEBOOK_MODULE, {
  service: FacebookModuleService,
})
