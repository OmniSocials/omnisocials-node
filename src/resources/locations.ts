import type { OmniSocials } from "../client.js";
import type {
  LocationSearchResponse,
  LocationValidateResponse,
} from "../types.js";

export class LocationsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /locations/search?q=` - search Facebook Places for Instagram
   * location tagging. Use a result's `id` as `location_id` on a post.
   */
  search(query: string): Promise<LocationSearchResponse> {
    return this.client.get("/locations/search", { q: query });
  }

  /**
   * `GET /locations/validate?id=` - check whether a Facebook Place id is a
   * valid Instagram location before using it as `location_id`.
   */
  validate(id: string): Promise<LocationValidateResponse> {
    return this.client.get("/locations/validate", { id });
  }
}
