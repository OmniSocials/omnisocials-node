import type { OmniSocials } from "../client.js";
import type {
  HideInboxParams,
  InboxConversationsResponse,
  InboxDeleteMessageResponse,
  InboxHideResponse,
  InboxMarkReadResponse,
  InboxMessagesResponse,
  InboxNextParams,
  InboxNextResponse,
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
   * Filter by `platform`, `type`, `unread`, and `unanswered` (only
   * conversations that still need an answer; see
   * `ListInboxConversationsParams.unanswered`). Uses cursor pagination: pass
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
      unanswered: params.unanswered,
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
   *
   * Pass `include_next: true` to also get `next` (the next conversation that
   * needs an answer, the same object as `inbox.next()`'s `data`, using its
   * default queue order and filters; `null` when nothing is waiting) and
   * `remaining` in the response. Saves the extra call when working through
   * the inbox.
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
   * `POST /inbox/messages/:messageId/hide` - hide or unhide a comment someone
   * left on one of your posts, on the platform, as the post owner. Facebook,
   * Instagram, TikTok, YouTube and Threads comments (Threads: incoming
   * top-level replies only; Threads does not allow hiding nested replies).
   * The default hides; pass `{ hide: false }` to unhide. On YouTube, hide
   * sets the comment's moderation status to rejected, which removes it and
   * its replies from public view; unhide publishes it again. The message
   * keeps its place in the conversation and `hidden` flips on the returned
   * message; a hidden comment no longer counts as unanswered. Requires the
   * `inbox:write` scope. The account must have been connected with the
   * moderation permission (Facebook `pages_manage_engagement`, Instagram
   * `instagram_business_manage_comments`).
   *
   * Errors: 400 `unsupported_platform` (not an incoming comment on a
   * supported platform), 400 `not_hideable` (Threads nested reply, or
   * Threads refused), 401 `reauth_required` (the Threads reply permission
   * or the TikTok comments authorization is missing or expired), 403
   * `reconnect_required` (the account was connected without the
   * comment-moderation permission; reconnect it in the dashboard), 404
   * `not_found` (message not in this workspace) or `account_not_connected`,
   * 429 `quota_exceeded` (YouTube's daily API quota is used up; retry after
   * midnight Pacific), 502 `platform_error` (the platform rejected the
   * call). Threads inbox is currently rolling out; until Meta approves the
   * permissions it is disabled on production and Threads calls return a
   * clear error.
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

  /**
   * `DELETE /inbox/messages/:messageId` - delete a comment someone left on
   * one of your posts, on the platform and from the inbox. Facebook,
   * Instagram and TikTok comments only: YouTube's API does not let a channel
   * delete other people's comments, hide those instead (`inbox.hide`).
   * Replies under the deleted comment go with it (the platforms cascade the
   * delete and the inbox mirrors that); their inbox ids come back as
   * `removed_reply_ids`. A comment that is already gone on the platform is
   * still removed from the inbox. This cannot be undone. Requires the
   * `inbox:write` scope.
   *
   * Errors: 400 `unsupported_platform` (not an incoming Facebook, Instagram
   * or TikTok comment), 401 `reauth_required` (the TikTok comments
   * authorization expired), 403 `reconnect_required` (the account was
   * connected without the comment-moderation permission; reconnect it in
   * the dashboard), 404 `not_found` (message not in this workspace) or
   * `account_not_connected`, 502 `platform_error` (the platform rejected
   * the call).
   */
  deleteMessage(messageId: string): Promise<InboxDeleteMessageResponse> {
    return this.client.delete(
      `/inbox/messages/${encodeURIComponent(messageId)}`
    );
  }

  /**
   * `GET /inbox/next` - the next conversation that needs an answer: a work
   * queue for answering the inbox. Returns the oldest (by default) item that
   * still needs a reply, together with its conversation so far and the post
   * it belongs to, so a reply can be drafted from one call. An item needs an
   * answer when it is the customer's latest DM with no reply after it
   * (Instagram/Facebook DMs within the 24-hour messaging window only, since
   * Meta refuses replies outside it), or a comment/mention that has not
   * been replied to and is not hidden. Replies typed in the native apps
   * count as answers (they are mirrored into the inbox), so a thread a
   * colleague answered on their phone is not served again. Instagram
   * mentions are skipped (no reply path). Looks at the last 30 days of
   * activity. Requires the `inbox:read` scope.
   *
   * Only unread items are served by default: marking a conversation read
   * (`inbox.markRead`) is how to skip one for good; pass `include_read:
   * true` to include read-but-unanswered items. `exclude` is a
   * session-local skip: conversation ids to leave out of this call (up to
   * 100). `order` is `"oldest"` (default: the item that has waited longest
   * first) or `"newest"`.
   *
   * Returns `{ data, remaining }`. `data` is `{ conversation, message,
   * messages }`, or `null` when nothing is waiting. `message` is the
   * unanswered incoming item itself (the customer's latest DM, or the
   * specific comment): its `id` is what `inbox.hide` and
   * `inbox.deleteMessage` take, its `conversation_id` is what `inbox.reply`
   * takes. `messages` is the conversation so far, oldest first (the most
   * recent 50 messages for long DM threads). `remaining` is the number of
   * unanswered items still waiting after this one (capped at 500), `0` when
   * `data` is `null`. To chain the queue, pass `include_next: true` to
   * `inbox.reply` and it returns the next item in the same response.
   * Errors: 400 `validation_error` (unknown platform, type or order).
   */
  next(params: InboxNextParams = {}): Promise<InboxNextResponse> {
    return this.client.get("/inbox/next", {
      platform: params.platform,
      type: params.type,
      order: params.order,
      include_read: params.include_read,
      exclude:
        params.exclude && params.exclude.length > 0
          ? params.exclude.join(",")
          : undefined,
    });
  }
}
