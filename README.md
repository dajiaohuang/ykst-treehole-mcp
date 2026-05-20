# ykst-treehole-mcp

MCP server for `web.treehole.space` / `treehole.space`, based on the recovered gRPC-Web protobuf client from the web bundle and APK.

## Install

```powershell
npm install
```

## Run

```powershell
npm start
```

## Login

Preferred flow:

1. Run `npm run login`.
2. Complete jAccount login in the isolated Chrome window it opens.
3. The local callback captures `https://web.treehole.space/auth/jaccount?code=...`, exchanges it through `https://proxy.treehole.qaq.ac.cn`, and saves `.treehole-session.json`.

This is the default because the production web app currently calls a broken browser RPC host and may fail to write `treehole_session`.

The direct `treehole_login_with_oauth_code` and `treehole_login_with_callback_url` tools are kept for cases where a usable production callback code/URL is available. Codes minted for a local redirect URI do not currently work because the Treehole backend token exchange expects the production web redirect URI.

Fallback web flow:

```powershell
npm run login-web
```

If the web app successfully writes a cookie, copy `treehole_session` and run:

```powershell
npm run save-token
```

If you already have a valid session token, call `treehole_save_session_token`.

After logging in on `https://web.treehole.space/`, you can also save the browser session manually:

1. Open Chrome DevTools on `https://web.treehole.space/`.
2. Go to Application -> Cookies -> `https://web.treehole.space`.
3. Copy the value of `treehole_session`.
4. Run:

```powershell
npm run save-token
```

Paste the token when prompted.

The session is stored in `.treehole-session.json`, which is ignored by git. You can also use:

- `TREEHOLE_SESSION` or `TREEHOLE_TOKEN`
- `TREEHOLE_RPC_HOST` defaults to `https://proxy.treehole.qaq.ac.cn`
- `TREEHOLE_SESSION_FILE`

## Privacy

This project intentionally keeps login state local. Do not commit `.treehole-session.json`, copied cookies, OAuth callback codes, APK inputs, decoded APK output, or personal identity/account names. Write tools require `confirm: true`.

## Tools

Auth/session:

- `treehole_auth_status`
- `treehole_get_login_url`
- `treehole_login_with_oauth_code`
- `treehole_login_with_callback_url`
- `treehole_save_session_token`
- `treehole_clear_session`

Site metadata:

- `treehole_get_site_config`
- `treehole_list_categories`
- `treehole_list_tags`
- `treehole_list_browsable_tags`

Profile and identities:

- `treehole_get_profile`
- `treehole_list_identities`
- `treehole_get_identity`
- `treehole_get_active_identity`
- `treehole_get_create_identity_quota`
- `treehole_set_active_identity`
- `treehole_create_identity`
- `treehole_disable_identity`
- `treehole_get_thread_identities`

Threads and posts:

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

Notifications and subscriptions:

- `treehole_get_unread_notification_count`
- `treehole_list_notifications`
- `treehole_mark_notification_read`
- `treehole_mark_all_notifications_read`
- `treehole_get_subscribe`
- `treehole_put_subscribe`

Account utilities:

- `treehole_check_in`
- `treehole_get_upload_url`
- `treehole_get_download_url`
- `treehole_get_user_stats`
- `treehole_get_punishments`
- `treehole_update_setting`

Write operations require `confirm: true`.

## Login Capture Details

`npm run login` runs the same production OAuth redirect URI that Treehole expects, but captures it in an isolated Chrome profile:

```powershell
npm run login
```

The script maps only `web.treehole.space` in that Chrome process to a temporary local HTTPS callback, captures the OAuth `code`, exchanges it through the working RPC host, and saves `.treehole-session.json`. The default browser profile and system hosts file are not changed.
