import type { OmniSocials } from "../client.js";
import type { AudioSearchResponse } from "../types.js";

export class AudioResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /audio/search?q=&type=` - search Meta's licensed audio catalog for
   * Instagram Reels. Omit `query` for trending audio; `type` is `"music"`
   * (server default) or `"original_sound"`. Use a result's `audio_id` as
   * `instagram.audio_id` on a reel post (with optional
   * `instagram.audio_volume` / `instagram.video_volume`, integers 0-100).
   * `preview_url` is temporary (~1.5 days); never persist it.
   */
  search(
    query?: string,
    type?: "music" | "original_sound"
  ): Promise<AudioSearchResponse> {
    return this.client.get("/audio/search", { q: query, type });
  }
}
