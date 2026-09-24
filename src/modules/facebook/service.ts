import { MedusaError } from "@medusajs/framework/utils"

export type FacebookOptions = {
  pageAccessToken: string
  graphApiVersion?: string
}

type GraphApiError = { error?: { message?: string } }

const DEFAULT_GRAPH_API_VERSION = "v20.0"

// We call /me/... instead of /{page-id}/...: for pages migrated to the
// "New Pages Experience", /{page-id}/ fails with (#100) "The global id ... is
// not allowed for this call", while a page token already resolves "me" to the page.
const PAGE_PATH = "me"

export default class FacebookModuleService {
  protected options_: FacebookOptions

  constructor(_container: unknown, options: FacebookOptions) {
    if (!options?.pageAccessToken) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Facebook: option "pageAccessToken" is required`)
    }
    this.options_ = options
  }

  // Uploads a photo without publishing it, so it can be attached to a post
  async uploadUnpublishedPhoto(imageUrl: string): Promise<string> {
    const photo = await this.request<{ id: string }>("POST", `${PAGE_PATH}/photos`, {
      url: imageUrl,
      published: false,
    })
    return photo.id
  }

  async createPost(message: string, mediaIds: string[]): Promise<string> {
    const post = await this.request<{ id?: string; post_id?: string }>("POST", `${PAGE_PATH}/feed`, {
      message,
      // With a JSON body attached_media is a real array; the attached_media[0]
      // notation only works with form encoding and is silently ignored here.
      attached_media: mediaIds.map((mediaId) => ({ media_fbid: mediaId })),
    })

    const postId = post.id ?? post.post_id
    if (!postId) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Erreur Facebook API : aucun identifiant de publication reçu")
    }
    return postId
  }

  // Deletes a post or photo
  async deleteObject(objectId: string): Promise<void> {
    await this.request("DELETE", objectId)
  }

  private async request<T>(method: "POST" | "DELETE", path: string, body: Record<string, unknown> = {}): Promise<T> {
    const version = this.options_.graphApiVersion ?? DEFAULT_GRAPH_API_VERSION
    const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: this.options_.pageAccessToken }),
    })
    const json = (await response.json()) as T & GraphApiError

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Erreur Facebook API : ${json.error?.message ?? `échec de la requête (${response.status})`}`
      )
    }
    return json
  }
}
