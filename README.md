# ykst-treehole-mcp

这是一个给 Treehole / YKST（`web.treehole.space` / `treehole.space`）用的 MCP server。它把从网页 bundle 和 APK 里恢复出来的 gRPC-Web protobuf API 封装成 agent 可以调用的 MCP tools。

English documentation: [README_EN.md](README_EN.md)

## 功能

- 单命令登录：脚本打开独立 Chrome，等待 jAccount 跳转到包含 `code=...` 的回调 URL，自动读取 URL、换取 token，并保存本地登录态。
- 51 个 MCP tools，覆盖登录、站点信息、分类、标签、身份、帖子、回复、通知、订阅、上传/下载 URL、签到、设置、举报、评分、收藏、赞赏等基础读写能力。
- 所有写操作都要求显式传 `confirm: true`。
- 默认 stdio transport，兼容常规 MCP 客户端；也支持 Streamable HTTP transport，方便 Claude Code 等客户端使用。
- 登录态和逆向分析产物默认不会进 git。

## 安装

```powershell
npm install
```

## 快速开始

默认按这个流程走：

```powershell
npm install
npm run login
npm start
```

这就足够给 stdio 类型的 MCP 客户端使用。`npm run login` 是正常情况下唯一需要手动运行的登录命令。

## 单命令登录

```powershell
npm run login
```

这个命令会打开一个独立 Chrome profile。你只需要在窗口里手动完成 jAccount 登录。浏览器跳到 `https://web.treehole.space/auth/jaccount?code=...` 后，脚本会通过 Chrome 的本地调试端口读到被重定向后的标签页 URL，把 OAuth code 换成 Treehole session，并写入 `.treehole-session.json`。

你不需要复制回调 URL，也不需要手动粘贴 code。登录完成后，直接运行 `npm start`，或者让 MCP 客户端启动 `src/index.js` 即可。

常用环境变量：

- `CHROME_PATH`：Chrome 路径，自动识别失败时使用
- `TREEHOLE_LOGIN_TIMEOUT_MS`：等待登录的超时时间，默认 `180000`
- `TREEHOLE_LOGIN_CHROME_PROFILE`：独立 Chrome profile 路径，默认 `.tmp-chrome-login`
- `TREEHOLE_RPC_HOST`：默认 `https://proxy.treehole.qaq.ac.cn`
- `TREEHOLE_SESSION_FILE`：自定义本地 session 文件

备用方式，仅在默认登录流程在你的机器上不可用时使用：

```powershell
npm run login-capture   # 旧版本地 HTTPS 回调捕获
npm run save-token      # 手动粘贴已有 treehole_session token
```

## 启动

stdio，适合普通 MCP 客户端：

```powershell
npm start
```

## HTTP 模式，作为次选

stdio 是默认、最简单的模式。只有当你的客户端更适合连接一个 URL 型 MCP server 时，再使用 HTTP 模式，例如 Claude Code 或其他 Streamable HTTP 客户端：

```powershell
node src/index.js --port 38991
```

健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:38991/health
```

## 客户端配置

stdio 示例：

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

HTTP 客户端示例：

```json
{
  "mcpServers": {
    "ykst-treehole": {
      "url": "http://127.0.0.1:38991/mcp"
    }
  }
}
```

## 工具列表

登录/会话：

- `treehole_auth_status`
- `treehole_get_login_url`
- `treehole_login_with_oauth_code`
- `treehole_login_with_callback_url`
- `treehole_save_session_token`
- `treehole_clear_session`

站点信息：

- `treehole_get_site_config`
- `treehole_list_categories`
- `treehole_list_tags`
- `treehole_list_browsable_tags`

个人资料和身份：

- `treehole_get_profile`
- `treehole_list_identities`
- `treehole_get_identity`
- `treehole_get_active_identity`
- `treehole_get_create_identity_quota`
- `treehole_set_active_identity`
- `treehole_create_identity`
- `treehole_disable_identity`
- `treehole_get_thread_identities`

主题和回复：

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

通知和订阅：

- `treehole_get_unread_notification_count`
- `treehole_list_notifications`
- `treehole_mark_notification_read`
- `treehole_mark_all_notifications_read`
- `treehole_get_subscribe`
- `treehole_put_subscribe`

账号工具：

- `treehole_check_in`
- `treehole_get_upload_url`
- `treehole_get_download_url`
- `treehole_get_user_stats`
- `treehole_get_punishments`
- `treehole_update_setting`

## 隐私

登录态只保存在本地。不要提交 `.treehole-session.json`、复制出来的 cookie、OAuth callback code、APK、解包产物、下载的工具、个人身份名或账号名。

这些本地文件默认会被忽略：

- `.treehole-session.json`
- `.env*`
- `.tmp-chrome-login/`
- `*.apk`
- `_external/`
- `_tools/`
- `_publish/`

## 开发验证

```powershell
npm run smoke
```

`npm run smoke` 需要有效本地登录态，会验证 gRPC-Web transport、登录摘要和基础只读 RPC。
