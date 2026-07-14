import type { OmniSocials } from "../client.js";
import type {
  CreateFolderParams,
  Folder,
  ItemResponse,
  ListResponse,
  UpdateFolderParams,
} from "../types.js";

export class FoldersResource {
  constructor(private readonly client: OmniSocials) {}

  /** `GET /folders` - all folders (flat list; build the tree via `parent_id`). */
  list(): Promise<ListResponse<Folder>> {
    return this.client.get("/folders");
  }

  /** `POST /folders` - create a folder (optionally nested under `parent_id`). */
  create(params: CreateFolderParams): Promise<ItemResponse<Folder>> {
    return this.client.post("/folders", params);
  }

  /**
   * `PATCH /folders/:id` - rename (`name`) and/or move (`parent_id`, or
   * `null` for the top level). Cycles are rejected.
   */
  update(id: string, params: UpdateFolderParams): Promise<ItemResponse<Folder>> {
    return this.client.patch(`/folders/${encodeURIComponent(id)}`, params);
  }

  /**
   * `DELETE /folders/:id` - delete a folder. Media is preserved: files move
   * to the root and subfolders move up to the deleted folder's parent.
   * Resolves to `null` (204).
   */
  delete(id: string): Promise<null> {
    return this.client.delete(`/folders/${encodeURIComponent(id)}`);
  }
}
