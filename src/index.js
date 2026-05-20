#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const z = require("zod/v4");
const client = require("./treeholeClient");
const { authSummary, clearSession, saveSession } = require("./session");

const server = new McpServer({
  name: "ykst-treehole-mcp",
  version: "0.1.0",
});

function json(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function requireConfirm(confirm, action) {
  if (confirm !== true) {
    throw new Error(`${action} is a write operation. Re-run with confirm: true after reviewing the arguments.`);
  }
}

const rateTypeSchema = z.enum(["normal", "like", "hate"]);
const reportTargetSchema = z.enum(["thread", "post"]);
const reportTypeSchema = z.enum(["normal", "politics", "porn", "contact", "abuse", "ky"]);
const notificationTypeSchema = z.enum(["all", "thread_replied", "post_replied", "system"]);

server.registerTool("treehole_auth_status", {
  description: "Show whether a Treehole session is configured without revealing the token.",
  inputSchema: {},
}, async () => json(authSummary()));

server.registerTool("treehole_get_login_url", {
  description: "Get the jAccount OAuth login URL. Open it in a browser, log in, then pass the returned code to treehole_login_with_oauth_code.",
  inputSchema: {
    redirectUri: z.string().url().optional(),
  },
}, async (args) => json(await client.getLoginUrl(args)));

server.registerTool("treehole_login_with_oauth_code", {
  description: "Exchange a jAccount OAuth code for a Treehole token and save it to the local session file.",
  inputSchema: {
    code: z.string().min(1),
  },
}, async ({ code }) => json(await client.loginWithCode(code)));

server.registerTool("treehole_login_with_callback_url", {
  description: "Exchange a full https://web.treehole.space/auth/jaccount?code=... callback URL for a Treehole token and save it locally.",
  inputSchema: {
    callbackUrl: z.string().url(),
  },
}, async ({ callbackUrl }) => json(await client.loginWithCallbackUrl(callbackUrl)));

server.registerTool("treehole_save_session_token", {
  description: "Save an existing Treehole session token locally. Useful if you copied treehole_session/css-treehole_token from a browser or APK.",
  inputSchema: {
    token: z.string().min(1),
    host: z.string().url().optional(),
  },
}, async ({ token, host }) => json(saveSession({ token, host })));

server.registerTool("treehole_clear_session", {
  description: "Delete the locally saved Treehole session file.",
  inputSchema: {},
}, async () => json(clearSession()));

server.registerTool("treehole_get_site_config", {
  description: "Get server-side site configuration.",
  inputSchema: {},
}, async () => json(await client.getSiteConfig()));

server.registerTool("treehole_list_categories", {
  description: "List all categories.",
  inputSchema: {},
}, async () => json(await client.listCategories()));

server.registerTool("treehole_list_tags", {
  description: "List tags. Set all=true to include hidden/non-browsable tags if allowed.",
  inputSchema: {
    all: z.boolean().optional(),
  },
}, async (args) => json(await client.listTags(args)));

server.registerTool("treehole_list_browsable_tags", {
  description: "List browsable tags.",
  inputSchema: {},
}, async () => json(await client.listBrowsableTags()));

server.registerTool("treehole_get_profile", {
  description: "Get the logged-in user's profile.",
  inputSchema: {},
}, async () => json(await client.profile()));

server.registerTool("treehole_list_identities", {
  description: "List identities on the logged-in user's profile.",
  inputSchema: {},
}, async () => json(await client.listIdentities()));

server.registerTool("treehole_get_identity", {
  description: "Get one identity from the profile by identityId, code, or active=true.",
  inputSchema: {
    identityId: z.number().int().positive().optional(),
    code: z.string().optional(),
    active: z.boolean().optional(),
  },
}, async (args) => json(await client.getIdentity(args)));

server.registerTool("treehole_get_active_identity", {
  description: "Get the currently active identity.",
  inputSchema: {},
}, async () => json(await client.getActiveIdentity()));

server.registerTool("treehole_get_create_identity_quota", {
  description: "Get remaining identity creation quota.",
  inputSchema: {},
}, async () => json(await client.getCreateIdentityQuota()));

server.registerTool("treehole_set_active_identity", {
  description: "Switch the active identity by identity id.",
  inputSchema: {
    identityId: z.number().int().positive(),
    confirm: z.boolean().optional(),
  },
}, async ({ identityId, confirm }) => {
  requireConfirm(confirm, "treehole_set_active_identity");
  return json(await client.setActiveIdentity(identityId));
});

server.registerTool("treehole_create_identity", {
  description: "Create a new identity for the logged-in user.",
  inputSchema: {
    confirm: z.boolean().optional(),
  },
}, async ({ confirm }) => {
  requireConfirm(confirm, "treehole_create_identity");
  return json(await client.createIdentity());
});

server.registerTool("treehole_disable_identity", {
  description: "Disable an identity by identity id. Requires confirm: true.",
  inputSchema: {
    identityId: z.number().int().positive(),
    confirm: z.boolean().optional(),
  },
}, async ({ identityId, confirm }) => {
  requireConfirm(confirm, "treehole_disable_identity");
  return json(await client.disableIdentity(identityId));
});

server.registerTool("treehole_get_thread_identities", {
  description: "Get identities participating in a thread, when the server allows it.",
  inputSchema: {
    threadId: z.number().int().positive(),
  },
}, async ({ threadId }) => json(await client.getThreadUserIdentities(threadId)));

server.registerTool("treehole_list_latest_threads", {
  description: "List latest threads. Use nextCursor for pagination.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    categoryId: z.number().int().positive().optional(),
    tagIds: z.array(z.number().int().positive()).optional(),
  },
}, async (args) => json(await client.latestThreads(args)));

server.registerTool("treehole_list_hot_threads", {
  description: "List hot threads. Use nextCursor for pagination.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  },
}, async (args) => json(await client.hotThreads(args)));

server.registerTool("treehole_list_user_threads", {
  description: "List threads created by the logged-in user.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  },
}, async (args) => json(await client.userThreads(args)));

server.registerTool("treehole_list_user_posts", {
  description: "List posts/replies created by the logged-in user.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.number().int().min(0).optional(),
    top: z.number().int().min(0).optional(),
  },
}, async (args) => json(await client.userPosts(args)));

server.registerTool("treehole_list_user_favorite_threads", {
  description: "List threads favorited by the logged-in user.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  },
}, async (args) => json(await client.userFavoriteThreads(args)));

server.registerTool("treehole_list_user_participated_threads", {
  description: "List threads the logged-in user has participated in.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  },
}, async (args) => json(await client.userParticipatedThreads(args)));

server.registerTool("treehole_search_threads", {
  description: "Search threads by keyword.",
  inputSchema: {
    keyword: z.string().min(1),
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().min(0).optional(),
  },
}, async (args) => json(await client.searchThreads(args)));

server.registerTool("treehole_get_thread", {
  description: "Get a thread by id.",
  inputSchema: {
    threadId: z.number().int().positive(),
  },
}, async ({ threadId }) => json(await client.getThread(threadId)));

server.registerTool("treehole_get_post", {
  description: "Get one post/reply by post id.",
  inputSchema: {
    postId: z.number().int().positive(),
  },
}, async ({ postId }) => json(await client.getPost(postId)));

server.registerTool("treehole_get_thread_posts", {
  description: "Get posts in a thread. Use nextCursor for pagination.",
  inputSchema: {
    threadId: z.number().int().positive(),
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.number().int().min(0).optional(),
    top: z.number().int().min(0).optional(),
    onlyAuthor: z.boolean().optional(),
  },
}, async (args) => json(await client.getThreadPosts(args)));

server.registerTool("treehole_create_thread", {
  description: "Create a new thread. Requires confirm: true.",
  inputSchema: {
    title: z.string().min(1).max(120),
    content: z.string().min(1),
    categoryId: z.number().int().positive(),
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_create_thread");
  return json(await client.createThread(args));
});

server.registerTool("treehole_reply_thread", {
  description: "Reply to a thread. Requires confirm: true.",
  inputSchema: {
    threadId: z.number().int().positive(),
    content: z.string().min(1),
    hideIdentity: z.boolean().optional(),
    replyToPostId: z.number().int().positive().optional(),
    userThreadIdentityId: z.number().int().positive().optional(),
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_reply_thread");
  return json(await client.replyThread(args));
});

server.registerTool("treehole_delete_thread", {
  description: "Delete a thread owned by the logged-in user. Requires confirm: true.",
  inputSchema: {
    threadId: z.number().int().positive(),
    confirm: z.boolean().optional(),
  },
}, async ({ threadId, confirm }) => {
  requireConfirm(confirm, "treehole_delete_thread");
  return json(await client.deleteThread(threadId));
});

server.registerTool("treehole_delete_post", {
  description: "Delete a post owned by the logged-in user. Requires confirm: true.",
  inputSchema: {
    postId: z.number().int().positive(),
    confirm: z.boolean().optional(),
  },
}, async ({ postId, confirm }) => {
  requireConfirm(confirm, "treehole_delete_post");
  return json(await client.deletePost(postId));
});

server.registerTool("treehole_rate_thread", {
  description: "Rate a thread as like, hate, or normal. Requires confirm: true.",
  inputSchema: {
    threadId: z.number().int().positive(),
    type: rateTypeSchema,
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_rate_thread");
  return json(await client.rateThread(args));
});

server.registerTool("treehole_rate_post", {
  description: "Rate a post as like, hate, or normal. Requires confirm: true.",
  inputSchema: {
    postId: z.number().int().positive(),
    type: rateTypeSchema,
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_rate_post");
  return json(await client.ratePost(args));
});

server.registerTool("treehole_favorite_thread", {
  description: "Set a thread favorite state. Requires confirm: true.",
  inputSchema: {
    threadId: z.number().int().positive(),
    isFav: z.boolean(),
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_favorite_thread");
  return json(await client.favoriteThread(args));
});

server.registerTool("treehole_appreciate_thread", {
  description: "Spend fish to appreciate a thread author. Requires confirm: true.",
  inputSchema: {
    threadId: z.number().int().positive(),
    amount: z.number().int().positive().optional(),
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_appreciate_thread");
  return json(await client.appreciateThread(args));
});

server.registerTool("treehole_appreciate_post", {
  description: "Spend fish to appreciate a post author. Requires confirm: true.",
  inputSchema: {
    postId: z.number().int().positive(),
    amount: z.number().int().positive().optional(),
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_appreciate_post");
  return json(await client.appreciatePost(args));
});

server.registerTool("treehole_report", {
  description: "Report a thread or post. Requires confirm: true.",
  inputSchema: {
    target: reportTargetSchema,
    targetId: z.number().int().positive(),
    type: reportTypeSchema,
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_report");
  return json(await client.putReport(args));
});

server.registerTool("treehole_get_unread_notification_count", {
  description: "Get unread notification count.",
  inputSchema: {},
}, async () => json(await client.unreadNotificationCount()));

server.registerTool("treehole_list_notifications", {
  description: "List notifications. Use nextCursor for pagination.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    onlyUnread: z.boolean().optional(),
    type: notificationTypeSchema.optional(),
  },
}, async (args) => json(await client.listNotifications(args)));

server.registerTool("treehole_mark_notification_read", {
  description: "Mark one notification as read. Requires confirm: true.",
  inputSchema: {
    notificationId: z.number().int().positive(),
    confirm: z.boolean().optional(),
  },
}, async ({ notificationId, confirm }) => {
  requireConfirm(confirm, "treehole_mark_notification_read");
  return json(await client.markNotificationRead(notificationId));
});

server.registerTool("treehole_mark_all_notifications_read", {
  description: "Mark all notifications as read. Requires confirm: true.",
  inputSchema: {
    confirm: z.boolean().optional(),
  },
}, async ({ confirm }) => {
  requireConfirm(confirm, "treehole_mark_all_notifications_read");
  return json(await client.markAllNotificationsRead());
});

server.registerTool("treehole_get_subscribe", {
  description: "Get subscription state for a thread.",
  inputSchema: {
    threadId: z.number().int().positive(),
  },
}, async ({ threadId }) => json(await client.getSubscribe(threadId)));

server.registerTool("treehole_put_subscribe", {
  description: "Update subscription state for a thread. Requires confirm: true.",
  inputSchema: {
    threadId: z.number().int().positive(),
    subscribePost: z.boolean().optional(),
    subscribeMention: z.boolean().optional(),
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_put_subscribe");
  return json(await client.putSubscribe(args));
});

server.registerTool("treehole_check_in", {
  description: "Check in and receive fish if available. Requires confirm: true.",
  inputSchema: {
    confirm: z.boolean().optional(),
  },
}, async ({ confirm }) => {
  requireConfirm(confirm, "treehole_check_in");
  return json(await client.checkIn());
});

server.registerTool("treehole_get_upload_url", {
  description: "Get a pre-signed upload URL for an attachment.",
  inputSchema: {
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().int().min(0),
    md5: z.string().min(1),
    width: z.number().int().min(0).optional(),
    height: z.number().int().min(0).optional(),
  },
}, async (args) => json(await client.getUploadUrl(args)));

server.registerTool("treehole_get_download_url", {
  description: "Get a download URL for an attachment by uuid.",
  inputSchema: {
    uuid: z.string().min(1),
    name: z.string().optional(),
    width: z.number().int().min(0).optional(),
    height: z.number().int().min(0).optional(),
  },
}, async (args) => json(await client.getDownloadUrl(args)));

server.registerTool("treehole_get_user_stats", {
  description: "Get user post/like/hate statistics.",
  inputSchema: {},
}, async () => json(await client.getUserStats()));

server.registerTool("treehole_get_punishments", {
  description: "Get punishment/ban information for the logged-in user.",
  inputSchema: {},
}, async () => json(await client.getPunishments()));

server.registerTool("treehole_update_setting", {
  description: "Update user settings. Omitted fields keep their current values. Requires confirm: true.",
  inputSchema: {
    filteredWords: z.string().optional(),
    filteredTagIds: z.string().optional(),
    filteredCategoryIds: z.string().optional(),
    inactiveRead: z.boolean().optional(),
    hideBadPosts: z.boolean().optional(),
    hideBadThreads: z.boolean().optional(),
    enablePushNotifications: z.boolean().optional(),
    enableUtilities: z.boolean().optional(),
    confirm: z.boolean().optional(),
  },
}, async ({ confirm, ...args }) => {
  requireConfirm(confirm, "treehole_update_setting");
  return json(await client.updateSetting(args));
});

async function main() {
  const args = process.argv.slice(2);
  const portArg = args.indexOf("--port");
  const port = portArg >= 0 ? parseInt(args[portArg + 1], 10) : null;

  if (port) {
    const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
    const { createMcpExpressApp } = require("@modelcontextprotocol/sdk/server/express.js");

    const app = createMcpExpressApp();

    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });

    app.post("/mcp", async (req, res) => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on("close", () => {
          transport.close().catch(() => {});
        });
      } catch (error) {
        console.error("MCP request error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      }
    });

    app.listen(port, () => {
      console.error(`ykst-treehole-mcp HTTP transport on http://localhost:${port}/mcp`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ykst-treehole-mcp running on stdio");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
