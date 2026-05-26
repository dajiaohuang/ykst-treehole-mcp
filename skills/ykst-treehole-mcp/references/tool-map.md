# YKST Treehole MCP Tool Map

Use this as a quick index for common operations. All write/state-changing operations require `confirm: true`.

## Auth

- `treehole_auth_status`: check whether a local session is configured.
- `treehole_get_login_url`: get a jAccount OAuth URL.
- `treehole_login_with_oauth_code`: exchange a raw OAuth code.
- `treehole_login_with_callback_url`: exchange a full callback URL containing `code=...`.
- `treehole_save_session_token`: save an existing token manually.
- `treehole_clear_session`: remove the local session file.

Default CLI login:

```powershell
npm run login
```

## Site Metadata

- `treehole_get_site_config`
- `treehole_list_categories`
- `treehole_list_tags`
- `treehole_list_browsable_tags`

Known categories from `treehole_list_categories` on 2026-05-21:

| id | name | notes |
|---:|---|---|
| 1 | 综合版 | default general category |
| 2 | 校园 | campus topics |
| 3 | 深夜食堂 | Alice category, open 18:00-06:00 |
| 4 | 情感 | emotional/relationship topics |
| 5 | 学业 | academic topics |
| 6 | 科技 | tech topics |
| 7 | 值班室 | station/moderation topics |
| 8 | 游戏 | games |
| 9 | 深水区 | hidden from timeline |
| 10 | 泛二次元 | anime/acg-adjacent topics |
| 11 | 时事 | current events |

Known tags include `灌水`, `钓鱼`, `吃瓜`, `NSFW`, `站务`, `干货`, `问与答`, `性相关`, `令人不适`, `争议`, `转载`, `未经证实`, `讨论`, and `谜语人`.

## Profile And Identities

- `treehole_get_profile`
- `treehole_list_identities`
- `treehole_get_identity`
- `treehole_get_active_identity`
- `treehole_get_create_identity_quota`
- `treehole_set_active_identity`
- `treehole_create_identity`
- `treehole_disable_identity`

When posting with a requested identity, switch identity first with `treehole_set_active_identity`, then verify with `treehole_get_active_identity`.

## Threads And Posts

Reads:

- `treehole_list_latest_threads`
- `treehole_list_hot_threads`
- `treehole_list_user_threads`
- `treehole_list_user_posts`
- `treehole_list_user_favorite_threads`
- `treehole_list_user_participated_threads`
- `treehole_get_thread`
- `treehole_get_thread_posts`

Writes:

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

## Notifications, Subscriptions, Account Utilities

- `treehole_get_unread_notification_count`
- `treehole_list_notifications`
- `treehole_mark_notification_read`
- `treehole_mark_all_notifications_read`
- `treehole_get_subscribe`
- `treehole_put_subscribe`
- `treehole_check_in`
- `treehole_get_upload_url`
- `treehole_get_download_url`
- `treehole_get_user_stats`
- `treehole_get_punishments`
- `treehole_update_setting`

Temporarily banned after 3x runtime failures in availability checks:

- `treehole_get_post`
- `treehole_get_thread_identities`
- `treehole_search_threads`

## MCP Primitive Placement

This server now uses all three MCP primitives: `tools`, `resources`, and `prompts`.

### Best-Fit Rule

- Use `resources` for read-mostly context snapshots and URI-addressable objects.
- Use `tools` for state changes and parameter-heavy operations.
- Use `prompts` for reusable workflows/checklists that guide model behavior.

### Resources (new)

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

### Prompts (new)

- `treehole_prompt_read_thread`
- `treehole_prompt_draft_thread`
- `treehole_prompt_safe_write_check`
- `treehole_prompt_login_recovery`

### Tools kept as primary execution surface

Auth/session tools:

- `treehole_auth_status`
- `treehole_get_login_url`
- `treehole_login_with_oauth_code`
- `treehole_login_with_callback_url`
- `treehole_save_session_token`
- `treehole_clear_session`

Read/query tools (kept for pagination/filter/arguments):

- `treehole_get_site_config`
- `treehole_list_categories`
- `treehole_list_tags`
- `treehole_list_browsable_tags`
- `treehole_get_profile`
- `treehole_list_identities`
- `treehole_get_identity`
- `treehole_get_active_identity`
- `treehole_get_create_identity_quota`
- `treehole_get_thread_identities`
- `treehole_list_latest_threads`
- `treehole_list_hot_threads`
- `treehole_list_user_threads`
- `treehole_list_user_posts`
- `treehole_list_user_favorite_threads`
- `treehole_list_user_participated_threads`
- `treehole_search_threads`
- `treehole_get_thread`
- `treehole_get_post`
- `treehole_get_thread_posts`
- `treehole_get_unread_notification_count`
- `treehole_list_notifications`
- `treehole_get_subscribe`
- `treehole_get_upload_url`
- `treehole_get_download_url`
- `treehole_get_user_stats`
- `treehole_get_punishments`

Write/state-change tools (require `confirm: true`):

- `treehole_set_active_identity`
- `treehole_create_identity`
- `treehole_disable_identity`
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
- `treehole_mark_notification_read`
- `treehole_mark_all_notifications_read`
- `treehole_put_subscribe`
- `treehole_check_in`
- `treehole_update_setting`
