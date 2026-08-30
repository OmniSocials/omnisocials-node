import type { OmniSocials } from "../client.js";
import type {
  HideInboxParams,
  InboxConversationsResponse,
  InboxHideResponse,
  InboxMarkReadResponse,
  InboxMessagesResponse,
  InboxReplyResponse,
  ListInboxConversationsParams,
  ListInboxMessagesParams,
  ReplyInboxParams,
} from "../types.js";

export class InboxResource {
  constructor(private readonly client: OmniSocials) {}

  /**
   * `GET /inbox/conversations` - list social inbox conversations (DMs,
   * comments, mentions) across connected platforms, newest activity first.
   * TikTok and YouTube conversations are video comments only (no DMs or
   * mentions); TikTok needs the TikTok comments authorization on the
   * channel. Threads conversations are `type` `"comment"` (replies people
   * leave on your Threads posts; `conversation_id` looks like
   * `threads_comment_<rootPostId>`) and `"mention"`
   * (`threads_mention_<postId>`); there are no Threads DMs. Threads inbox is
   * currently rolling out; until Meta approves the permissions it is
   * disabled on production, and it needs a Threads connection with the reply
   * permission.
   * Filter by `platform`, `type`, and `unread`. Uses cursor pagination: pass
   * the previous response's `pagination.next_cursor` as `cursor` to page on
   * while `pagination.has_more` is true.
   */
  listConversations(
    params: ListInboxConversationsParams = {}
  ): Promise<InboxConversationsResponse> {
    return this.client.get("/inbox/conversations", {
      platform: params.platform,
      type: params.type,
      unread: params.unread,
      limit: params.limit,
      cursor: params.cursor,
    });
  }

  /**
   * `GET /inbox/conversations/:conversationId/messages` - full message thread
   * for one conversation, newest first. Uses cursor pagination (`limit` /
   * `cursor`). The id is URL-encoded for you, so pass it exactly as returned
   * (LinkedIn ids contain `:` and `()`).
   */
  getMessages(
    conversationId: string,
    params: ListInboxMessagesParams = {}
  ): Promise<InboxMessagesResponse> {
    return this.client.get(
      `/inbox/conversations/${encodeURIComponent(conversationId)}/messages`,
      { limit: params.limit, cursor: params.cursor }
    );
  }

  /**
   * `POST /inbox/conversations/:conversationId/read` - mark every message in
   * the conversation as read. Returns the count of messages that were newly
   * marked read.
   */
  markRead(conversationId: string): Promise<InboxMarkReadResponse> {
    return this.client.post(
      `/inbox/conversations/${encodeURIComponent(conversationId)}/read`
    );
  }

  /**
   * `POST /inbox/conversations/:conversationId/reply` - send a reply into the
   * conversation (a DM message, or a reply to the comment/mention). On
   * Facebook and Instagram DMs, optionally attach a single media asset by
   * public URL with `attachment_url` + `attachment_type`; `text` is optional
   * when `attachment_url` is set (an attachment-only reply is allowed).
   * Returns the created outbound message.
   *
   * TikTok replies are comments only, text-only (no attachments), and capped
   * at 150 characters. YouTube replies are comments only (YouTube has no
   * DMs).
   *
   * X DM replies cost 2 prepaid credits per send (X's per-request send fee,
   * passed through at cost), debited from the company balance before the
   * send and auto-refunded if the send fails. Two new 402 codes can be
   * thrown: `insufficient_credits` (the balance can't cover the 2 credits)
   * and `x_inbox_suspended` (the workspace's X inbox auto-suspended at zero
   * balance; top up and re-enable it in the dashboard to resume - DMs that
   * arrive while suspended are not recovered).
   *
   * Threads replies publish as native Threads replies. Threads inbox is
   * currently rolling out; until Meta approves the permissions it is
   * disabled on production, and it needs a Threads connection with the reply
   * permission: a 401 `reauth_required` means the connection lacks it
   * (reconnect Threads).
   */
  reply(
    conversationId: string,
    params: ReplyInboxParams
  ): Promise<InboxReplyResponse> {
    return this.client.post(
      `/inbox/conversations/${encodeURIComponent(conversationId)}/reply`,
      params
    );
  }

  /**
   * `POST /inbox/messages/:messageId/hide` - hide or unhide a reply someone
   * left on one of your Threads posts, as the post owner (Threads only for
   * now). The default hides; pass `{ hide: false }` to unhide. Only incoming
   * top-level replies can be hidden (Threads does not allow hiding nested
   * replies); the message keeps its place in the conversation. Returns the
   * message with `hidden` flipped. Requires the `inbox:write` scope.
   *
   * Threads inbox is currently rolling out; until Meta approves the
   * permissions it is disabled on production and calls return a clear error.
   * Errors: 400 `unsupported_platform` (not an incoming Threads reply, or
   * Threads inbox not available yet), 400 `not_hideable` (nested reply or
   * Threads refused), 401 `reauth_required` (the Threads connection lacks
   * the reply permission; reconnect Threads), 404 `not_found` (message not
   * in this workspace) or `account_not_connected` (no Threads account).
   */
  hide(
    messageId: string,
    params: HideInboxParams = {}
  ): Promise<InboxHideResponse> {
    return this.client.post(
      `/inbox/messages/${encodeURIComponent(messageId)}/hide`,
      params
    );
  }
}
