# ykst-treehole-mcp

MCP server for Treehole / YKST (`web.treehole.space` / `treehole.space`). It wraps the recovered gRPC-Web protobuf API as tools that agents can call after you log in locally.

中文文档 / Chinese documentation: [README.md](README.md)

## Features

- One-command browser login: the script opens an isolated Chrome window, waits until jAccount redirects to a URL containing `code=...`, exchanges the code, and saves the local session.
- 51 MCP tools for auth, site metadata, categories, tags, identities, threads, posts, notifications, subscriptions, upload/download URLs, check-in, settings, reports, ratings, favorites, and appreciation.
- Write operations require `confirm: true`.
- Stdio transport for normal MCP clients and optional Streamable HTTP transport for Claude Code or other HTTP clients.
- Session and reverse-engineering artifacts are ignored by git.

## Install

```powershell
npm install
```

## Quick Start

Use this as the default setup path:

```powershell
npm install
npm run login
npm start
```

That is enough for stdio-based MCP clients. `npm run login` is intentionally the only login command you normally need.

## One-Command Login

```powershell
npm run login
```

The command opens an isolated Chrome profile. Complete jAccount login in that window. When the browser reaches `https://web.treehole.space/auth/jaccount?code=...`, the script reads the redirected tab URL through Chrome's local debugging endpoint, exchanges the OAuth code through the Treehole RPC host, and writes `.treehole-session.json`.

You do not need to copy the callback URL or paste the code manually. After this finishes, run `npm start` or configure your MCP client to launch `src/index.js`.

Useful environment variables:

- `CHROME_PATH`: path to `chrome.exe` if Chrome is not auto-detected
- `TREEHOLE_LOGIN_TIMEOUT_MS`: login wait timeout, default `180000`
- `TREEHOLE_LOGIN_CHROME_PROFILE`: isolated Chrome profile path, default `.tmp-chrome-login`
- `TREEHOLE_RPC_HOST`: default `https://proxy.treehole.qaq.ac.cn`
- `TREEHOLE_SESSION_FILE`: custom local session file

Fallbacks, only if the default login flow does not work on your machine:

```powershell
npm run login-capture   # legacy local HTTPS callback capture
npm run save-token      # paste an existing treehole_session token
```

## Run

Stdio, for normal MCP clients:

```powershell
npm start
```

## HTTP Mode, As A Secondary Option

Stdio is the default and simplest mode. Use HTTP only when your client prefers a URL-based MCP server, for example Claude Code or another Streamable HTTP client:

```powershell
node src/index.js --port 38991
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:38991/health
```

## Client Configuration

Stdio example:

```json
{
  "mcpServers": {
    "ykst-treehole": {
      "command": "node",
      "args": ["D:/repo/ykst_mcp/src/index.js"],
      "cwd": "D:/repo/ykst_mcp"
    }
  }
}
```

HTTP client example:

```json
{
  "mcpServers": {
    "ykst-treehole": {
      "url": "http://127.0.0.1:38991/mcp"
    }
  }
}
```

## Tool Groups

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

## Privacy

Login state stays local. Do not commit `.treehole-session.json`, copied cookies, OAuth callback codes, APK files, decoded APK output, downloaded tools, or personal identity/account names.

The ignored local artifacts include:

- `.treehole-session.json`
- `.env*`
- `.tmp-chrome-login/`
- `*.apk`
- `_external/`
- `_tools/`
- `_publish/`

## Development

```powershell
npm run smoke
```

`npm run smoke` requires a valid local session. It verifies the gRPC-Web transport, auth summary, and basic read RPCs.
