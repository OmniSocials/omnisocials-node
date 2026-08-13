import type { OmniSocials } from "../client.js";
import type {
  InboxConversationsResponse,
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
   * TikTok conversations are video comments only (no DMs or mentions) and
   * need the TikTok comments authorization on the channel.
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
   * conversation (a DM message, or a reply to the comment/mention). Optionally
   * attach a single media asset by public URL with `attachment_url` +
   * `attachment_type`. Returns the created outbound message.
   *
   * TikTok replies are comments only, text-only (no attachments), and capped
   * at 150 characters.
   *
   * X DM replies cost 2 prepaid credits per send (X's per-request send fee,
   * passed through at cost), debited from the company balance before the
   * send and auto-refunded if the send fails. Two new 402 codes can be
   * thrown: `insufficient_credits` (the balance can't cover the 2 credits)
   * and `x_inbox_suspended` (the workspace's X inbox auto-suspended at zero
   * balance; top up and re-enable it in the dashboard to resume - DMs that
   * arrive while suspended are not recovered).
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
}
