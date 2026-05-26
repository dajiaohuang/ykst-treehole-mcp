# YKST Treehole MCP Tool Map

Use this as a quick index for common operations.
All write/state-changing operations require `confirm: true`.

Preview-first behavior is enabled for a subset of write tools. If `confirm` is omitted on those tools, the server returns `mode: "preview"` and does not execute the write.

## Runtime Validation

Before major changes or release:

```powershell
node scripts/validate-mcp-availability.js
```

Policy in this repo:

- If a tool fails 3 times in availability checks, ban (remove/disable) it until fixed.

## Auth

- `treehole_auth_status`
- `treehole_get_login_url`
- `treehole_login_with_oauth_code`
- `treehole_login_with_callback_url`
- `treehole_save_session_token`
- `treehole_clear_session`

Default login command:

```powershell
npm run login
```

## Profile And Identity

- `treehole_get_profile`
- `treehole_list_identities`
- `treehole_get_identity`
- `treehole_get_active_identity`
- `treehole_get_create_identity_quota`
- `treehole_set_active_identity` (write)
- `treehole_create_identity` (write)
- `treehole_disable_identity` (write)

## Thread/Post Read

- `treehole_list_latest_threads`
- `treehole_list_hot_threads`
- `treehole_list_user_threads`
- `treehole_list_user_posts`
- `treehole_list_user_favorite_threads`
- `treehole_list_user_participated_threads`
- `treehole_get_thread`
- `treehole_get_thread_posts`

## Thread/Post Write

- `treehole_create_thread`
- `treehole_reply_thread`
- `treehole_delete_thread`
- `treehole_delete_post`
- `treehole_rate_thread`
- `treehole_rate_post`
- `treehole_favorite_thread`
- `treehole_appreciate_thread`
- `treehole_appreciate_post`
- `treehole_report`

Preview-enabled in this group:

- `treehole_create_thread`
- `treehole_reply_thread`
- `treehole_delete_thread`
- `treehole_delete_post`
- `treehole_report`

## Notifications / Subscribe / Account Utilities

- `treehole_get_unread_notification_count`
- `treehole_list_notifications`
- `treehole_mark_notification_read` (write)
- `treehole_mark_all_notifications_read` (write)
- `treehole_get_subscribe`
- `treehole_put_subscribe` (write)
- `treehole_check_in` (write)
- `treehole_get_upload_url`
- `treehole_get_download_url`
- `treehole_get_user_stats`
- `treehole_get_punishments`
- `treehole_update_setting` (write)

Preview-enabled in this group:

- `treehole_put_subscribe`
- `treehole_set_active_identity`
- `treehole_create_identity`
- `treehole_disable_identity`
- `treehole_update_setting`

## MCP Primitive Placement

This server uses all three MCP primitives: `tools`, `resources`, and `prompts`.

### Resources

Static resources:

- `treehole://auth/status`
- `treehole://site/config`
- `treehole://site/categories`
- `treehole://site/tags/browsable`
- `treehole://user/profile`
- `treehole://user/identities`
- `treehole://user/identity/active`
- `treehole://threads/latest`
- `treehole://threads/hot`
- `treehole://user/stats`
- `treehole://user/punishments`

Resource templates:

- `treehole://thread/{threadId}`
- `treehole://thread/{threadId}/posts`
- `treehole://thread/{threadId}/subscribe`
- `treehole://identity/{code}`

### Prompts

- `treehole_prompt_read_thread`
- `treehole_prompt_draft_thread`
- `treehole_prompt_safe_write_check`
- `treehole_prompt_login_recovery`

## Currently Banned Tools (3x failures)

- `treehole_get_post`
- `treehole_get_thread_identities`
- `treehole_search_threads`
