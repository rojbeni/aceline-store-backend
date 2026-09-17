// src/subscribers/product-changes.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function productChangeHandler({
  event: { name,data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log("event:", name , "product", data.id )
  await fetch(
    `${process.env.STOREFRONT_URL}/api/revalidate?tags=products&tags=product-${data.id}`
  )
}

export const config: SubscriberConfig = {
  event: [
    "product.created", "product.updated", "product.deleted",
    "product-variant.updated",
    "price-set.updated",
    "price-list.updated",
    "price.updated",
    ],
}