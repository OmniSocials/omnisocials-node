import type { OmniSocials } from "../client.js";
import type {
  CheckMediaParams,
  CreateUploadUrlResponse,
  ItemResponse,
  ListMediaParams,
  ListResponse,
  MediaItem,
  MediaUploadResponse,
  UpdateMediaParams,
  UploadMediaFromBase64Params,
  UploadMediaFromUrlParams,
  UploadMediaParams,
} from "../types.js";

export class MediaResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /media` - list the media library (newest first). */
  list(params: ListMediaParams = {}): Promise<ListResponse<MediaItem>> {
    return this.client.get("/media", {
      limit: params.limit,
      offset: params.offset,
      search: params.search,
      folder_id: params.folder_id,
    });
  }

  /** `GET /media/:id` - fetch a single media item. */
  get(id: string): Promise<ItemResponse<MediaItem>> {
    return this.client.get(`/media/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /media/upload` - upload a file as multipart form data (max 50MB
   * for images, 100MB request cap overall; use `uploadFromUrl` or
   * `createUploadUrl` for larger videos, up to 1GB).
   *
   * `file` can be a Buffer, Uint8Array, ArrayBuffer, Blob, or a filesystem
   * path string. A PDF is rasterized into image slides and returned as a
   * carousel (`slides` + `media_ids`).
   */
  async upload(params: UploadMediaParams): Promise<MediaUploadResponse> {
    const { file, name, folder, folder_id } = params;
    let filename = params.filename;
    let blob: Blob;

    if (typeof file === "string") {
      const { readFileSync } = await import("node:fs");
      const { basename } = await import("node:path");
      const bytes = readFileSync(file);
      // Cast: TS 5.7 types Uint8Array generically over ArrayBufferLike, which
      // DOM's BlobPart rejects; Node Buffers are plain-ArrayBuffer backed.
      blob = new Blob([bytes as unknown as BlobPart]);
      filename = filename ?? basename(file);
    } else if (file instanceof Blob) {
      blob = file;
    } else {
      blob = new Blob([file as unknown as BlobPart]);
    }

    const form = new FormData();
    form.append("file", blob, filename ?? "upload.bin");
    if (name !== undefined) form.append("name", name);
    if (folder !== undefined) form.append("folder", folder);
    if (folder_id !== undefined) form.append("folder_id", folder_id);

    return this.client.postForm("/media/upload", form);
  }

  /**
   * `POST /media/upload-from-url` - the server fetches a public URL
   * (files up to 1GB; large videos finish processing in the background and
   * come back with status "processing").
   */
  uploadFromUrl(params: UploadMediaFromUrlParams): Promise<MediaUploadResponse> {
    return this.client.post("/media/upload-from-url", params);
  }

  /** `POST /media/upload-from-base64` - upload base64-encoded file data. */
  uploadFromBase64(
    params: UploadMediaFromBase64Params
  ): Promise<MediaUploadResponse> {
    return this.client.post("/media/upload-from-base64", params);
  }

  /**
   * `POST /media/create-upload-url` - mint a one-time presigned upload URL
   * for large files (up to 1GB). POST the file as multipart form data
   * (field name "file") to the returned `upload_url` within
   * `expires_in_seconds`; no auth headers are needed on that second request.
   */
  createUploadUrl(): Promise<CreateUploadUrlResponse> {
    return this.client.post("/media/create-upload-url");
  }

  /**
   * `POST /media/check` - preflight a file's compatibility with the
   * workspace's connected platforms BEFORE uploading. Provide one of: a
   * public `url`, an existing `media_id`, or `size_bytes` + `mime`.
   */
  check(params: CheckMediaParams): Promise<Record<string, unknown>> {
    return this.client.post("/media/check", params);
  }

  /** `PATCH /media/:id` - rename a file and/or move it into a folder. */
  update(id: string, params: UpdateMediaParams): Promise<ItemResponse<MediaItem>> {
    return this.client.patch(`/media/${encodeURIComponent(id)}`, params);
  }

  /**
   * `DELETE /media/:id` - delete a media file. Resolves to `null` (204).
   * Fails with 409 `media_in_use` when the file is attached to a scheduled
   * or publishing post.
   */
  delete(id: string): Promise<null> {
    return this.client.delete(`/media/${encodeURIComponent(id)}`);
  }
}
