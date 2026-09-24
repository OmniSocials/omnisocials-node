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
   * (`threads_mention_<postId>`); there are no Threads DMs. The Threads inbox
   * needs a Threads connection with the reply permissions; connections made
   * before those permissions existed must be reconnected once.
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
   * Threads replies publish as native Threads replies. The Threads inbox
   * needs a Threads connection with the reply permission: a 401
   * `reauth_required` means the connection lacks it (connected before it
   * existed; reconnect Threads).
   *
   * On comment and mention threads, pass `message_id` (the `id` of the
   * comment being answered: `message.id` from `inbox.next()`, or a message
   * `id` from `inbox.getMessages()`). Every comment on a post shares one
   * conversation, so without it the reply is posted under the newest
   * comment on the post, which may be a different person than the one you
   * drafted for. Ignored for DMs. 404 `not_found` when it is not an
   * incoming message of this conversation.
   *
   * Instagram and Facebook DMs can only be answered within 24 hours of the
   * customer's last message (Meta policy). That is checked before the send:
   * a closed window answers 422 `outside_messaging_window` and nothing is
   * sent (`inbox.next()` reports the same in `reply_window`). Answer such a
   * DM from the Instagram or Facebook app (mirrored into the inbox) or mark
   * the conversation read; do not retry.
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
   * call), 502 `hide_not_applied` (Instagram accepted the call but, read
   * back, still reports the comment in its old state; this happens with
   * comments Instagram shows under "Comments from Facebook" on a reel that
   * is also shared to Facebook, which live on Facebook where Instagram's
   * hide does not reach them; the inbox row is left unchanged, so hide it
   * in the Instagram or Facebook app and do not retry). The Threads inbox
   * needs a Threads connection with the reply permissions; a connection
   * made before those permissions existed answers 401 `reauth_required`
   * until reconnected.
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
   * queue for answering the inbox. Returns one item that still needs a
   * reply, together with its conversation so far and the post it belongs
   * to, so a reply can be drafted from one call. An item needs an answer
   * when it is the customer's latest DM with no reply after it, or a
   * comment/mention that has not been replied to and is not hidden. Order:
   * DMs that can still be answered come first (Instagram/Facebook DMs
   * inside Meta's 24-hour window, the one whose window closes soonest
   * first, and X DMs), then Instagram/Facebook DMs whose window has closed
   * (served with `reply_window.open` false: answer them from the native app
   * or mark them read), then comments and mentions, oldest first by
   * default. Replies typed in the native apps count as answers (they are
   * mirrored into the inbox), so a thread a colleague answered on their
   * phone is not served again. Instagram mentions are skipped (no reply
   * path). Looks at the last 30 days of activity. Requires the `inbox:read`
   * scope.
   *
   * Only unread items are served by default: marking a conversation read
   * (`inbox.markRead`) is how to skip one for good; pass `include_read:
   * true` to include read-but-unanswered items. `exclude` is a
   * session-local skip: conversation ids to leave out of this call (up to
   * 100). `order` is `"oldest"` (default: the item that has waited longest
   * first) or `"newest"`; it reverses the order within each group.
   *
   * Returns `{ data, remaining }`. `data` is `{ conversation, message,
   * messages, reply_window }`, or `null` when nothing is waiting. `message`
   * is the unanswered incoming item itself (the customer's latest DM, or
   * the specific comment): its `id` is what `inbox.hide` and
   * `inbox.deleteMessage` take and the `message_id` to pass to
   * `inbox.reply` on comment threads, its `conversation_id` is what
   * `inbox.reply` takes. `messages` is the conversation so far, oldest
   * first (the most recent 50 messages for long DM threads).
   * `reply_window` is `{ open, closes_at }`: `open` is `false` only for an
   * Instagram/Facebook DM past its 24-hour window, which `inbox.reply`
   * refuses with 422 `outside_messaging_window`. `remaining` is the number
   * of unanswered items still waiting after this one (capped at 500), `0`
   * when `data` is `null`. To chain the queue, pass `include_next: true` to
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
