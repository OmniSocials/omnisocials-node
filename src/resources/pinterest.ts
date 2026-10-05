import type { OmniSocials } from "../client.js";
import type {
  ListPinterestProductsParams,
  PinterestProductValidateResponse,
  PinterestProductsResponse,
} from "../types.js";

export class PinterestResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /pinterest/products` - list the product Pins of the connected
   * Pinterest account. Pass a result's `pin_id` in `pinterest.product_tags`
   * on a post to tag the product on the Pin (max 24 per Pin). Pinterest only
   * accepts a product Pin that is public, belongs to the same account and
   * links to a website that account claimed; products of other merchants
   * cannot be tagged.
   *
   * `source: "catalog"` reads the Pinterest catalog (with `price`,
   * `currency`, `availability`, `item_id`) and needs catalog access, which
   * is given one time in the OmniSocials composer (Pinterest options, Add
   * products, Connect catalog). `source: "pins"` reads the account's own
   * Pins and works on every connection; one call scans up to 250 Pins, so
   * `products` can be empty while `bookmark` is set (call again with the
   * bookmark). When `source` is left out the API uses `"catalog"` when the
   * connection has catalog access, else `"pins"`.
   *
   * Note the response shape (see {@link PinterestProductsResponse}):
   * `products` on success OR `error` when the list could not be read, both
   * with HTTP 200. A bad `source` or `product_group_id` throws a 400
   * `APIError` instead.
   */
  listProducts(
    params: ListPinterestProductsParams = {}
  ): Promise<PinterestProductsResponse> {
    return this.client.get("/pinterest/products", {
      source: params.source,
      product_group_id: params.product_group_id,
      bookmark: params.bookmark,
      page_size: params.page_size,
    });
  }

  /**
   * `GET /pinterest/products/validate?id=` - check whether a Pin can be used
   * in `pinterest.product_tags` before creating the post. `id` is a Pin id
   * or a Pin link (`https://www.pinterest.com/pin/<id>/`; `pin.it` short
   * links do not work).
   */
  validateProduct(id: string): Promise<PinterestProductValidateResponse> {
    return this.client.get("/pinterest/products/validate", { id });
  }
}
