import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: {
      connection: {
        ssl: false,
      },
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },

  },
  modules: [
    { resolve: "@medusajs/translation", },
    {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: process.env.R2_PUBLIC_URL,
              access_key_id: process.env.R2_ACCESS_KEY_ID!,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY!,
              region: "auto",
              bucket: process.env.R2_BUCKET_NAME!,
              endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/notification-local",
            id: "local",
            options: {
              name: "Local Notification Provider",
              channels: ["feed"],
            },
          },
          {
            resolve: "./src/modules/notification-hostinger",
            id: "hostinger-mail",
            options: {
              channels: ["email"],
              host: process.env.HOSTINGER_SMTP_HOST,
              port: parseInt(process.env.HOSTINGER_SMTP_PORT || "465"),
              secure: true,
              auth: {
                user: process.env.HOSTINGER_SMTP_USER,
                pass: process.env.HOSTINGER_SMTP_PASS,
              },
              from: process.env.HOSTINGER_SMTP_FROM,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          // ...your other providers (e.g. system/manual)
          {
            resolve: "./src/modules/konnect",
            id: "konnect",
            options: {
              apiKey: process.env.KONNECT_API_KEY, // "<walletId>:<apiKey>"
              receiverWalletId: process.env.KONNECT_WALLET_ID,
              baseUrl: process.env.KONNECT_BASE_URL, // omit for sandbox default
              // Medusa auto-mounts a webhook listener at:
              // {BACKEND_URL}/hooks/payment/{identifier}_{provider_id}
              // Since static identifier = "konnect" and id below = "konnect",
              // the full URL Konnect should call is:
              // {BACKEND_URL}/hooks/payment/konnect_konnect
              webhookUrl: `${process.env.BACKEND_URL}/hooks/payment/konnect_konnect`,
              successUrl: `${process.env.STOREFRONT_URL}/order/confirmed`,
              failUrl: `${process.env.STOREFRONT_URL}/checkout?payment=failed`,
            },
          },
        ],
      },
    },

  ],
  featureFlags: { translation: true, },
  plugins: [
    {
      resolve: "@agilo/medusa-analytics-plugin",
      options: {
        redisUrl: process.env.REDIS_URL,
        ttl: 30
      },
    },
  ],
})


