# web.treehole.space MCP 前期分析

分析日期：2026-05-20  
目标：为 `https://web.treehole.space/` 设计一个 MCP server，参考 `skyzh/make-a-fortune` 的匿名社区/RPC 前端思路。

## 资料来源

- 目标站点：<https://web.treehole.space/>
- 参考仓库：<https://github.com/skyzh/make-a-fortune>
- 本地抓取产物：`_external/site/`
- 本地还原源码：`_external/site/src-extracted/`
- 本地参考仓库：`_external/make-a-fortune/`
- 本地 APK：`base.apk`
- APK 解包产物：`_external/apk-analysis/apktool/`、`_external/apk-analysis/jadx/`

说明：Chrome 实时调试未能接通，原因是本机 Codex Chrome native host 注册缺失；本次分析主要基于首页 HTML、JS bundle、source map 和参考仓库源码。

## 目标站点概览

`web.treehole.space` 是一个 Gatsby 4 + React + Chakra UI 的前端。首页 HTML 暴露了以下路由 chunk：

- `/`：时间线
- `/trend`：热门
- `/category/[id]`：按版块浏览
- `/tag/[id]`：按标签浏览
- `/thread/[id]`：帖子详情与楼层
- `/auth/jaccount`：jAccount OAuth 回调

站点不是 REST API 前端，而是 gRPC-Web 前端。核心 RPC 客户端在 source map 中还原为：

- `src/services/rpc.ts`
- `src/services/TreeholeServiceClientPb.ts`
- `src/services/*_pb.js`

RPC host 固定为：

```text
https://treehole-proxy.boar.workers.dev
```

每个 RPC 请求都会把 `treehole_session` cookie 放到 gRPC metadata：

```ts
meta.authorization = Cookies.get('treehole_session')
```

这意味着 MCP server 最小可行方案不需要复刻网页 UI，只要能持有有效 session token，就可以直接调用 gRPC-Web endpoint。

## APK 分析补充

`base.apk` 已用 apktool 3.0.2 和 jadx 1.5.5 解包。jadx 反编译结束时报 11 个反编译错误，但主应用类、Manifest、资源和 JS bundle 均已产出，足够支撑 MCP 设计分析。

APK 基本信息：

- 包名：`com.dongyueweb.treehole`
- 应用名：`亦可赛艇` / `Treehole`
- 版本：`2.0.19`
- `versionCode`：`77`
- `minSdkVersion`：`21`
- `targetSdkVersion`：`30`
- SHA256：`33942DF0C1214A8BF08854B77510BD598F1504FAE66A724EAC4F382B3365DBB1`

技术栈判断：

- Android 原生壳是 React Native 应用，入口是 `com.dongyueweb.treehole.MainApplication` 和 `MainActivity`。
- JS 入口来自 CodePush：`MainApplication.getJSBundleFile()` 调用 `CodePush.getJSBundleFile()`。
- APK 内置 `assets/index.android.bundle`，大小约 6 MB，包含 Hermes/Metro 产物和业务字符串。
- 启用了 Firebase Messaging、AppCenter/CodePush、Expo modules、React Native Reanimated、React Native Gesture Handler。
- APK 内含 AppCenter 配置文件，但文档和日志中不应暴露其中 secret。

Manifest 暴露的路由/登录线索：

- 自定义 scheme：`com.dongyueweb.treehole://`
- 自定义 scheme：`treehole://`
- Web deep link：`https://treehole.space/thread/...`
- OAuth 回调 scheme：`treehole-auth://`
- 使用 `net.openid.appauth.RedirectUriReceiverActivity` 处理 OAuth redirect。

APK bundle 中确认的后端/资源线索：

- gRPC-Web 内容类型：`application/grpc-web+proto`、`application/grpc-web`
- gRPC-Web JS 客户端标识：`rpc-web-javascript/0.1`
- 移动端代理/服务地址字符串：`proxy.treehole.qaq.ac.cn`
- 更新检查 URL：`https://s3.jcloud.sjtu.edu.cn/9fd44bb76f604e8597acfcceada7cb83-tongqu/treehole/android/version.json`
- 教室/楼宇查询 URL：`https://ids.sjtu.edu.cn/build/find...`
- 本地 token/storage 相关字符串：`css-treehole_token`
- Thread deep link 正则：`https:\/\/treehole\.space\/thread\/(\d+)\/?(\d+)?`

APK 的 `model.TreeHole` 方法集合比网页分析更完整。除网页已确认的读写方法外，bundle 中还出现了这些移动端相关方法或功能点：

- 设备/推送：`RegisterDevice`
- 应用兼容性/配置：`CheckIncompatible`、`GetSiteConfig`
- 商店/购买：`GetStoreItems`、`GetStoreOrders`、`PurchaseItem`
- 投票：`CreateVote`、`DoVote`、`GetVoteResult`
- 身份：`CreateIdentity`、`DisableIdentity`、`SetActiveIdentity`、`GetThreadUserIdentities`
- 订阅/通知：`PutSubscribe`、`GetSubscribe`、`GetUnreadNotificationCount`、`GetAllNotifications`
- 审核/管理：`AdminBanUser`、`AdminGetAllTags`、`AdminSetPostStatus`、`AdminSetThreadAction`

对 MCP 的影响：

- 网页端和 APK 都指向同一个核心 gRPC service：`model.TreeHole`，因此 MCP 不需要分别实现 Web/API 两套协议。
- APK 证明移动端也使用 gRPC-Web/protobuf，而不是传统 REST；Node 侧应继续围绕 protobuf message 和 gRPC-Web unary POST 实现。
- 认证上网页使用 `treehole_session` cookie，APK 暴露了 `css-treehole_token` 这一移动端 token 存储名；MCP 第一版仍建议统一用 `TREEHOLE_SESSION` 或 `TREEHOLE_TOKEN` 注入，内部映射到 metadata `authorization`。
- 移动端代理 `proxy.treehole.qaq.ac.cn` 和网页代理 `treehole-proxy.boar.workers.dev` 都应做成可配置 host。2026-05-20 实测网页代理从当前网络返回 Cloudflare 525，移动端代理可正常响应 `GetOAuthConfig`，因此当前实现默认使用 `https://proxy.treehole.qaq.ac.cn`，并允许通过 `TREEHOLE_RPC_HOST` 切换。
- APK 暴露了更多高风险写操作、管理操作和购买/投票/设备注册接口；MCP 第一版不应默认开放这些能力。

## 登录与认证

登录流程是 jAccount OAuth：

1. 前端调用 `GetOAuthConfig` 获取 authorize URL、client id、scope。
2. 用户跳转/弹窗到 `https://jaccount.sjtu.edu.cn/oauth2`。
3. jAccount 回调 `/auth/jaccount?code=...`。
4. 前端调用 `OAuthLogin`，参数包括：
   - `channel = LOGINWITHJACCOUNT`
   - `source = LOGINSOURCEWEB`
   - `webSource = WEBSOURCEPRODSERVER`
   - `code = OAuth code`
5. 后端返回 token，前端写入 cookie：`treehole_session`。
6. 后续所有 RPC metadata 都携带 `authorization = treehole_session`。

对 MCP 的建议：

- 第一版优先使用环境变量 `TREEHOLE_SESSION` 注入 token。
- 可选实现 `get_login_url` 和 `exchange_oauth_code`，但不要在 MCP 内自动处理学校统一认证密码。
- 所有日志必须避免输出 token。

## 前端已确认的页面数据流

时间线 `/`：

- 调用 `GetLatestThreads`
- 请求：`ThreadsQueryRequest`
- 设置：`sort = SORTDESC`
- 翻页游标：首次 `last = ""`，后续用最后一条 thread 的 `lastReplyAt`

热门 `/trend`：

- 调用 `GetHottestThreads`
- 请求：`ThreadsQueryRequest`
- 翻页游标：`last = threads.length.toString()`

版块 `/category/[id]`：

- 调用 `GetLatestThreads`
- 设置：`sort = SORTDESC`
- 设置：`categoryId = id`
- 翻页游标：最后一条 thread 的 `lastReplyAt`

标签 `/tag/[id]`：

- 调用 `GetLatestThreads`
- 设置：`sort = SORTDESC`
- 设置：`tagIdsList = [id]`
- 翻页游标：最后一条 thread 的 `lastReplyAt`

帖子详情 `/thread/[id]`：

- 先调用 `GetThread`，请求使用 `PostsQueryRequest.threadId`
- 再调用 `GetThreadPostsEx`
- 请求参数：
  - `threadId = id`
  - `top = 0`
  - `last = 0` 或最后一楼 `floor`
  - `size = 15`
  - `sort = SORTASC`
  - `onlyAuthor = true/false`
  - `direction = LOADDIRECTIONDOWN`

帖子交互：

- 点赞/取消：`RateThread` / `RatePost`
- 点踩/取消：`RateThread` / `RatePost`
- 收藏帖子：`FavThread`
- 感谢楼主/层主：`AppreciateThread` / `AppreciatePost`

前端当前页面没有完整暴露发帖/回帖 UI，但客户端 stub 已包含 `PutThread`、`PutPost`、`DeleteThread`、`DeletePost`。

## RPC 方法目录

以下方法都属于 gRPC service `model.TreeHole`，均为 unary。

| 方法 | 请求 | 响应 | MCP 建议 |
| --- | --- | --- | --- |
| `Ping` | `EmptyRequest` | `EmptyRequest` | 健康检查 |
| `GetOAuthConfig` | `OAuthConfigRequest` | `OAuthConfigResponse` | 登录辅助 |
| `OAuthLogin` | `OAuthLoginRequest` | `OAuthLoginResponse` | 登录辅助 |
| `GetProfile` | `EmptyRequest` | `User` | 账号信息 |
| `GetAllCategories` | `EmptyRequest` | `CategoriesResponse` | 版块列表 |
| `GetAllTags` | `TagsRequest` | `TagsResponse` | 标签列表 |
| `GetBrowsableTags` | `EmptyRequest` | `TagsResponse` | 可浏览/精选标签 |
| `GetLatestThreads` | `ThreadsQueryRequest` | `ThreadsResponse` | 时间线/筛选 |
| `GetHottestThreads` | `ThreadsQueryRequest` | `ThreadsResponse` | 热门 |
| `SearchThreads` | `SearchRequest` | `ThreadsResponse` | 搜索 |
| `GetThread` | `PostsQueryRequest` | `Thread` | 帖子详情 |
| `GetThreadPostsEx` | `PostsQueryRequestEx` | `PostsResponse` | 楼层列表 |
| `GetPost` | `Post` | `Post` | 单楼详情 |
| `GetUserThreads` | `ThreadsQueryRequest` | `ThreadsResponse` | 我的帖子 |
| `GetUserPosts` | `PostsQueryRequest` | `PostsResponse` | 我的回复 |
| `GetUserFavThreads` | `ThreadsQueryRequest` | `ThreadsResponse` | 我的收藏 |
| `GetUserParticipateThreads` | `ThreadsQueryRequest` | `ThreadsResponse` | 我参与的帖子 |
| `RateThread` | `RateRequest` | `Thread` | 可选写操作 |
| `RatePost` | `RateRequest` | `Post` | 可选写操作 |
| `FavThread` | `FavRequest` | `Thread` | 可选写操作 |
| `AppreciateThread` | `AppreciateRequest` | `Thread` | 可选写操作 |
| `AppreciatePost` | `AppreciateRequest` | `Post` | 可选写操作 |
| `PutThread` | `Thread` | `Thread` | 高风险写操作 |
| `PutPost` | `Post` | `Post` | 高风险写操作 |
| `DeleteThread` | `Thread` | `EmptyRequest` | 高风险写操作 |
| `DeletePost` | `Post` | `EmptyRequest` | 高风险写操作 |
| `PutReport` | `Report` | `Report` | 举报 |
| `GetUnreadNotificationCount` | `EmptyRequest` | `CountReply` | 通知 |
| `GetAllNotifications` | `NotificationQueryRequest` | `NotificationResponse` | 通知列表 |
| `PutNotificationRead` | `Notification` | `EmptyRequest` | 可选写操作 |
| `PutAllNotificationRead` | `EmptyRequest` | `EmptyRequest` | 可选写操作 |
| `PutSubscribe` | `Subscribe` | `Subscribe` | 可选写操作 |
| `GetSubscribe` | `Subscribe` | `Subscribe` | 订阅状态 |
| `CheckIn` | `EmptyRequest` | `FishResponse` | 签到/小鱼干 |
| `GetUploadUrl` | `UploadRequest` | `UploadResponse` | 上传前置 |
| `GetDownloadUrl` | `UploadResponse` | `UploadResponse` | 附件下载 URL |
| `GetUserStats` | `EmptyRequest` | `UserStatsResponse` | 用户统计 |
| `CreateIdentity` | `EmptyRequest` | `User` | 身份管理 |
| `DisableIdentity` | `Identity` | `User` | 身份管理 |
| `SetActiveIdentity` | `IDRequest` | `User` | 身份管理 |
| `GetCreateIdentityQuota` | `EmptyRequest` | `QuotaResponse` | 身份额度 |
| `UpdateSetting` | `Setting` | `Setting` | 用户设置 |
| `GetPunishments` | `EmptyRequest` | `PunishmentsResponse` | 处罚信息 |
| `AdminBanUser` | `Punishment` | `Punishment` | 不建议暴露 |
| `AdminSetPostStatus` | `Post` | `Post` | 不建议暴露 |
| `AdminSetThread` | `Thread` | `Thread` | 不建议暴露 |
| `AdminGetAllTags` | `EmptyRequest` | `TagsResponse` | 不建议暴露 |

## 关键数据模型

`Thread` 常用字段：

- `model.id`
- `title`
- `categoryId`
- `category`
- `tagsList`
- `identityCode`
- `content`
- `preview`
- `viewCount`
- `likeCount`
- `hateCount`
- `replyCount`
- `isTop`
- `isFav`
- `isLike`
- `isHate`
- `lastReplyAt`
- `isReadOnly`
- `canDelete`
- `disableHate`

`Post` 常用字段：

- `model.id`
- `threadId`
- `floor`
- `identityCode`
- `content`
- `preview`
- `likeCount`
- `hateCount`
- `status`
- `replyToPostId`
- `replyToPost`
- `isLike`
- `isHate`
- `appreciationCount`
- `isAppreciated`
- `canDelete`
- `disableHate`

请求模型：

- `ThreadsQueryRequest`: `last`, `size`, `sort`, `categoryId`, `tagIdsList`
- `PostsQueryRequest`: `threadId`, `last`, `top`, `size`, `sort`, `onlyAuthor`, `shouldStatistic`
- `PostsQueryRequestEx`: `threadId`, `last`, `top`, `size`, `sort`, `onlyAuthor`, `direction`
- `SearchRequest`: `keyword`, `pageSize`, `offset`
- `RateRequest`: `id`, `type`
- `FavRequest`: `id`, `isFav`
- `AppreciateRequest`: `id`, `amount`

枚举：

- `Sort`: `SORTASC = 0`, `SORTDESC = 1`, `SORTPOPULAR = 2`
- `LoadDirection`: `LOADDIRECTIONDOWN = 0`, `LOADDIRECTIONUP = 1`
- `RateType`: `RATETYPENORMAL = 0`, `RATETYPEHATE = -1`, `RATETYPELIKE = 1`
- `OAuthLoginChannel`: `LOGINWITHJACCOUNT = 0`
- `LoginSource`: `LOGINSOURCEWEB = 2`
- `WebSource`: `WEBSOURCEPRODSERVER = 2`

## MCP 设计建议

第一阶段建议只做只读 tools：

- `treehole_ping`
- `treehole_get_profile`
- `treehole_list_categories`
- `treehole_list_featured_tags`
- `treehole_list_latest_threads`
- `treehole_list_hot_threads`
- `treehole_search_threads`
- `treehole_get_thread`
- `treehole_get_thread_posts`
- `treehole_get_user_threads`
- `treehole_get_user_posts`
- `treehole_get_user_favorites`
- `treehole_get_notifications`

第二阶段再加写操作，并默认关闭：

- `treehole_rate_thread`
- `treehole_rate_post`
- `treehole_favorite_thread`
- `treehole_appreciate_thread`
- `treehole_appreciate_post`
- `treehole_reply_thread`
- `treehole_create_thread`
- `treehole_report`

写操作建议加双保险：

- 环境变量 `TREEHOLE_ENABLE_MUTATIONS=true`
- tool 参数 `confirm=true`
- 返回响应中明确展示 server 端更新后的对象摘要

不建议暴露 admin 方法，即使当前 token 具备权限，也容易造成误操作。

## 实现路线

推荐 TypeScript MCP server：

1. 建立 MCP server 骨架。
2. 复制或重新生成 protobuf/gRPC-Web client stub。
3. 统一封装 `TreeholeRpcClient`：
   - host 默认 `https://treehole-proxy.boar.workers.dev`
   - token 从 `TREEHOLE_SESSION` 读取
   - metadata 设置 `authorization`
   - 输出统一转为 plain object
4. 先实现只读 tools，并做分页参数标准化：
   - `limit` 映射到 `size`
   - `cursor` 映射到 `last` 或 `offset`
   - 返回 `nextCursor`
5. 加入错误处理：
   - 未登录/过期 token：返回可读错误
   - gRPC status/message 原样保留
   - 不输出 token
6. 再实现可选写操作。

如果 Node 侧 gRPC-Web 客户端兼容性不顺，可以考虑两条路：

- 继续使用 `grpc-web` 生成代码，并补齐 Node 环境下的 fetch/XMLHttpRequest 适配。
- 手写最小 gRPC-Web binary POST 调用器，用生成的 protobuf message 做 `serializeBinary` / `deserializeBinary`。

## 参考仓库分析

`skyzh/make-a-fortune` 当前 `master` 是一个早期 Expo/React Native Web 前端原型：

- 依赖：Expo、React Native、NativeBase、React Navigation。
- 入口：`src/App.tsx` -> `src/Home.tsx`。
- `src/ThreadList.tsx` 使用本地 mock 数据，没有真实 RPC/API。
- README 说明项目定位是“通用匿名社区前端”，通过 RPC 后端访问匿名社区，避免真实 IP 暴露。
- README 提到 v3 目标是 `treehole.space`，但仓库代码尚未实现 v3 RPC。

它对本项目的价值主要是架构思路，而不是可直接复用的 API 代码：

- MCP server 可以承担类似“可信 RPC 中间层”的角色。
- 需要清楚告知用户：token、发帖内容、回复内容都会经过 MCP server 进程。
- 应保持与社区规范一致，MCP 不能设计成绕过限制或批量滥用工具。

## 风险与待确认

- `treehole-proxy.boar.workers.dev` 是前端当前写死的 host，但未来可能变化。
- source map 暴露的 protobuf stub 是当前版本快照，最好在实现时记录版本或自动校验。
- 写操作虽然在 stub 中存在，但当前网页没有完整发帖/回帖 UI，字段组合需要小心验证。
- OAuth 登录涉及 jAccount，第一版不要处理密码，只处理用户主动提供的 session token 或 OAuth code。
- 需要确认使用 MCP 访问该服务是否符合站点与学校账号系统的使用规范。

## 下一步

建议下一步直接进入实现：

1. 搭建 TypeScript MCP server。
2. 接入 gRPC-Web/protobuf client。
3. 实现只读 tools：时间线、热门、搜索、帖子详情、楼层列表、版块/标签。
4. 用 `TREEHOLE_SESSION` 做一次真实联调。
5. 再决定是否开放写操作。
