import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { NotificationTypes, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import nodemailer from "nodemailer"

export type HostingerOptions = {
  host: string
  port: number
  secure: boolean
  auth: { user: string; pass: string }
  from: string
}

const REQUIRED_OPTIONS = ["host", "port", "auth", "from"] as const

const DEFAULT_SUBJECT = "Notification"

export class HostingerNotificationService extends AbstractNotificationProviderService {
  static identifier = "hostinger-mail"

  protected transporter_: nodemailer.Transporter
  protected options_: HostingerOptions

  static validateOptions(options: Record<string, unknown>) {
    for (const key of REQUIRED_OPTIONS) {
      if (!options[key]) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Hostinger mail: option "${key}" is required`)
      }
    }
  }

  constructor(_container: unknown, options: HostingerOptions) {
    super()
    this.options_ = options
    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.auth,
    })
  }

  async send(notification: NotificationTypes.ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const info = await this.transporter_.sendMail({
      from: this.options_.from,
      to: notification.to,
      subject: notification.content?.subject || DEFAULT_SUBJECT,
      html: notification.content?.html ?? undefined,
      text: notification.content?.text ?? undefined,
    })
    return { id: info.messageId }
  }
}
