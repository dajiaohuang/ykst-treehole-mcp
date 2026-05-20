# YKST Site-Rule Notes

These notes are for agent behavior, not a replacement for official moderation decisions. They were gathered from official-looking `值班室` / `站务` topics through the local MCP on 2026-05-21. Re-check station posts before sensitive public actions.

## Sources Checked

- Category `值班室` (`categoryId: 7`) contains station/moderation topics.
- Tag `站务` (`tagId: 6`) marks official station posts.
- `treehole_get_thread(16501)`: `有关社区处理发布联系方式的重申` (`https://web.treehole.space/thread/16501`)
- `treehole_get_thread(5561)`: `关于禁止讨论政治相关内容的决定` (`https://web.treehole.space/thread/5561`)
- `treehole_get_thread(4863)`: `站务帖导航` (`https://web.treehole.space/thread/4863`)

## Confirmed Rules From Official Station Posts

### Contact information is forbidden

Topic `16501` states that YKST has forbidden posting contact information since the start of operation. Contact information includes but is not limited to WeChat and QQ.

Current moderation note from that topic:

- Publishing contact information, or inducing others to publish contact information, can lead directly to permanent mute without warning.
- Users who truly need to publish contact information are directed to email `support@treehole.space` with the contact information and reason, then wait for confirmation.

Agent rule:

- Do not create posts or replies containing phone numbers, WeChat IDs, QQ IDs, email addresses for personal contact, group invites, QR-code instructions, or language asking others to leave contact details.
- If the user asks to share contact details, refuse to post it and suggest asking site support for approval.

### Political discussion is banned

Topic `5561` announces an indefinite ban on political discussion (`键政`). Existing political posts were to be moved to `深水区`; violations may receive a 7-day to permanent mute depending on history.

Agent rule:

- Do not create new political discussion posts or replies.
- Be careful with current-events content in `时事`: keep it factual, non-agitational, and do not turn it into political campaigning, ideology fights, or policy advocacy.
- If the user asks for political posting, refuse the posting action and offer to rewrite into a neutral, non-political campus/current-event note only if appropriate.

## Moderation-Aware Defaults

- Use `值班室` only for station feedback, bug reports, or moderation-relevant discussion.
- Use `NSFW` / `性相关` tags only when content clearly requires them; do not evade tagging.
- Use `转载` for reposted material and `未经证实` for unverified claims when posting is still appropriate.
- Avoid harassment, doxxing, targeted insults, private personal information, impersonation, spam, and coordinated manipulation even when not explicitly listed in the checked station posts.
- For uncertain cases, draft only and ask the user to review against the latest station rules before posting.

## Write Checklist

Before calling any write tool:

1. Confirm the content does not include contact information or attempts to solicit it.
2. Confirm the content is not political discussion or political agitation.
3. Confirm the category and tags match the content.
4. Confirm the user requested a public write action.
5. Call the tool with `confirm: true`.
