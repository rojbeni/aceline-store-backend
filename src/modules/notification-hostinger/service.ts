import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import { ProviderSendNotificationResultsDTO, NotificationTypes } from "@medusajs/framework/types"
import nodemailer from "nodemailer"

export class HostingerNotificationService extends AbstractNotificationProviderService {
    static identifier = "hostinger-mail"
    protected transporter_: nodemailer.Transporter
    protected config_: any

    constructor(container: any, options: any) {
        super()
        this.config_ = options
        this.transporter_ = nodemailer.createTransport({
            host: options.host,
            port: options.port,
            secure: options.secure,
            auth: options.auth,
        })
    }

    async send(notification: NotificationTypes.ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
        const info = await this.transporter_.sendMail({
            from: this.config_.from,
            to: notification.to,
            subject: notification.content?.subject || "Notification",
            html: notification.content?.html as string,
            text: notification.content?.text as string,
        })
        return { id: info.messageId }
    }
}