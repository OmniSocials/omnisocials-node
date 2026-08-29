import type { OmniSocials } from "../client.js";
import type {
  LocationSearchResponse,
  LocationValidateResponse,
  SearchLocationsParams,
  ThreadsLocationSearchResponse,
} from "../types.js";

export class LocationsResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /locations/search` - search locations for post tagging.
   *
   * Default (a plain-string call, or `platform: "instagram"`): searches
   * Facebook Places for Instagram location tagging. Use a result's `id` as
   * `location_id` on a post.
   *
   * With `platform: "threads"`: searches Threads locations by `q` or around
   * a `latitude` + `longitude` point (pass either `q` or the coordinate
   * pair). Use a result's `id` as `threads.location_id` on a post; the two
   * sources use different ids, and the response shape differs (see
   * {@link ThreadsLocationSearchResponse}). Threads location tagging is
   * currently rolling out; until Meta approves the permissions it is
   * disabled on production and calls return a clear error.
   */
  search(query: string): Promise<LocationSearchResponse>;
  search(
    params: SearchLocationsParams & { platform: "threads" }
  ): Promise<ThreadsLocationSearchResponse>;
  search(params: SearchLocationsParams): Promise<LocationSearchResponse>;
  search(
    queryOrParams: string | SearchLocationsParams
  ): Promise<LocationSearchResponse | ThreadsLocationSearchResponse> {
    const params =
      typeof queryOrParams === "string" ? { q: queryOrParams } : queryOrParams;
    return this.client.get("/locations/search", {
      q: params.q,
      platform: params.platform,
      latitude: params.latitude,
      longitude: params.longitude,
    });
  }

  /**
   * `GET /locations/validate?id=` - check whether a Facebook Place id is a
   * valid Instagram location before using it as `location_id`.
   */
  validate(id: string): Promise<LocationValidateResponse> {
    return this.client.get("/locations/validate", { id });
  }
}
