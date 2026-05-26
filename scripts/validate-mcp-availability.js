#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const RETRIES = 3;
const WAIT_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function contentText(result) {
  const list = result?.content || [];
  return list
    .map((item) => {
      if (!item) return "";
      if (typeof item.text === "string") return item.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function isExpectedToolError(name, result, errorText) {
  const text = `${errorText || ""}\n${contentText(result)}`;
  if (/is a write operation\. Re-run with confirm: true/i.test(text)) return true;
  if (name === "treehole_login_with_callback_url" && /code query parameter/i.test(text)) return true;
  if (name === "treehole_login_with_oauth_code" && /oauthlogin|invalid|cannot fetch token|rpc \/model\.treehole\/oauthlogin failed/i.test(text)) return true;
  return false;
}

function defaultToolArgs(name, ctx) {
  switch (name) {
    case "treehole_auth_status":
    case "treehole_clear_session":
    case "treehole_get_site_config":
    case "treehole_list_categories":
    case "treehole_list_browsable_tags":
    case "treehole_get_profile":
    case "treehole_list_identities":
    case "treehole_get_active_identity":
    case "treehole_get_create_identity_quota":
    case "treehole_get_unread_notification_count":
    case "treehole_mark_all_notifications_read":
    case "treehole_check_in":
    case "treehole_get_user_stats":
    case "treehole_get_punishments":
    case "treehole_create_identity":
      return {};
    case "treehole_get_login_url":
      return { redirectUri: "https://web.treehole.space/auth/jaccount" };
    case "treehole_login_with_oauth_code":
      return { code: "invalid_smoke_code" };
    case "treehole_login_with_callback_url":
      return { callbackUrl: "https://web.treehole.space/auth/jaccount" };
    case "treehole_save_session_token":
      return { token: ctx.session?.token || "invalid-token", host: ctx.session?.host || "https://proxy.treehole.qaq.ac.cn" };
    case "treehole_list_tags":
      return { all: false };
    case "treehole_get_identity":
      return ctx.identityCode ? { code: ctx.identityCode } : { active: true };
    case "treehole_set_active_identity":
    case "treehole_disable_identity":
      return { identityId: ctx.identityId || 1 };
    case "treehole_get_thread_identities":
      return { threadId: ctx.threadId || 1 };
    case "treehole_list_latest_threads":
    case "treehole_list_hot_threads":
    case "treehole_list_user_threads":
    case "treehole_list_user_favorite_threads":
    case "treehole_list_user_participated_threads":
      return { limit: 3 };
    case "treehole_list_user_posts":
      return { limit: 3, cursor: 0, top: 0 };
    case "treehole_search_threads":
      return { keyword: "测试", limit: 3, offset: 0 };
    case "treehole_get_thread":
      return { threadId: ctx.threadId || 1 };
    case "treehole_get_post":
      return { postId: ctx.postId || 1 };
    case "treehole_get_thread_posts":
      return { threadId: ctx.threadId || 1, limit: 3, cursor: 0, top: 0, onlyAuthor: false };
    case "treehole_create_thread":
      return { title: "availability-check", content: "availability-check", categoryId: 1 };
    case "treehole_reply_thread":
      return { threadId: ctx.threadId || 1, content: "availability-check" };
    case "treehole_delete_thread":
      return { threadId: ctx.threadId || 1 };
    case "treehole_delete_post":
      return { postId: ctx.postId || 1 };
    case "treehole_rate_thread":
      return { threadId: ctx.threadId || 1, type: "like" };
    case "treehole_rate_post":
      return { postId: ctx.postId || 1, type: "like" };
    case "treehole_favorite_thread":
      return { threadId: ctx.threadId || 1, isFav: true };
    case "treehole_appreciate_thread":
      return { threadId: ctx.threadId || 1, amount: 1 };
    case "treehole_appreciate_post":
      return { postId: ctx.postId || 1, amount: 1 };
    case "treehole_report":
      return { target: "thread", targetId: ctx.threadId || 1, type: "normal" };
    case "treehole_list_notifications":
      return { limit: 3, onlyUnread: false, type: "all" };
    case "treehole_mark_notification_read":
      return { notificationId: ctx.notificationId || 1 };
    case "treehole_get_subscribe":
      return { threadId: ctx.threadId || 1 };
    case "treehole_put_subscribe":
      return { threadId: ctx.threadId || 1, subscribePost: true, subscribeMention: true };
    case "treehole_get_upload_url":
      return { fileName: "a.txt", contentType: "text/plain", size: 1, md5: "0cc175b9c0f1b6a831c399e269772661", width: 0, height: 0 };
    case "treehole_get_download_url":
      return { uuid: ctx.downloadUuid || "invalid-uuid", name: "a.txt", width: 0, height: 0 };
    case "treehole_update_setting":
      return { inactiveRead: false };
    default:
      return {};
  }
}

function promptArgs(name, ctx) {
  switch (name) {
    case "treehole_prompt_read_thread":
      return { threadId: String(ctx.threadId || 1), includePosts: "true", focus: "summary" };
    case "treehole_prompt_draft_thread":
      return { categoryId: "1", topic: "availability test", tone: "neutral", constraints: "none" };
    case "treehole_prompt_safe_write_check":
      return { operation: "treehole_create_thread", target: "category:1", payloadSummary: "smoke payload" };
    case "treehole_prompt_login_recovery":
      return { symptom: "session missing" };
    default:
      return {};
  }
}

async function main() {
  const sessionFile = path.resolve(process.cwd(), ".treehole-session.json");
  const sessionBackup = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, "utf8")) : null;

  const client = new Client({ name: "availability-checker", version: "1.0.0" }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: "node",
    args: ["src/index.js"],
    cwd: process.cwd(),
    stderr: "pipe",
  });
  if (transport.stderr) {
    transport.stderr.on("data", (chunk) => process.stderr.write(chunk));
  }
  await client.connect(transport);

  const report = {
    timestamp: new Date().toISOString(),
    tools: {},
    resources: {},
    prompts: {},
    bannedTools: [],
  };

  const context = {
    session: sessionBackup,
    threadId: 1,
    postId: 1,
    identityId: 1,
    identityCode: "",
    notificationId: 1,
    downloadUuid: "",
  };

  let hasRestorableSession = Boolean(sessionBackup?.token);

  try {
    const latest = await client.callTool({ name: "treehole_list_latest_threads", arguments: { limit: 1 } });
    const threads = latest?.structuredContent?.threads || [];
    if (threads[0]?.model?.id) context.threadId = Number(threads[0].model.id);
  } catch {}
  try {
    const posts = await client.callTool({ name: "treehole_get_thread_posts", arguments: { threadId: context.threadId, limit: 1, cursor: 0 } });
    const postList = posts?.structuredContent?.posts || [];
    if (postList[0]?.model?.id) context.postId = Number(postList[0].model.id);
  } catch {}
  try {
    const userPosts = await client.callTool({ name: "treehole_list_user_posts", arguments: { limit: 1, cursor: 0, top: 0 } });
    const postList = userPosts?.structuredContent?.posts || [];
    if (postList[0]?.model?.id) context.postId = Number(postList[0].model.id);
  } catch {}
  try {
    const identities = await client.callTool({ name: "treehole_list_identities", arguments: {} });
    const list = identities?.structuredContent?.identities || [];
    if (list[0]?.model?.id) context.identityId = Number(list[0].model.id);
    if (list[0]?.code) context.identityCode = String(list[0].code);
  } catch {}
  try {
    const notifications = await client.callTool({ name: "treehole_list_notifications", arguments: { limit: 1, onlyUnread: false, type: "all" } });
    const list = notifications?.structuredContent?.notifications || [];
    if (list[0]?.model?.id) context.notificationId = Number(list[0].model.id);
  } catch {}
  try {
    const upload = await client.callTool({
      name: "treehole_get_upload_url",
      arguments: {
        fileName: "availability-check.txt",
        contentType: "text/plain",
        size: 1,
        md5: "0cc175b9c0f1b6a831c399e269772661",
        width: 0,
        height: 0,
      },
    });
    if (!upload?.isError && upload?.structuredContent?.uuid) {
      context.downloadUuid = String(upload.structuredContent.uuid);
    }
  } catch {}

  const toolList = await client.listTools();
  const toolNames = toolList.tools.map((tool) => tool.name);
  const clearSessionTool = "treehole_clear_session";
  const prioritizedToolNames = toolNames.filter((name) => name !== clearSessionTool);
  if (toolNames.includes(clearSessionTool)) prioritizedToolNames.push(clearSessionTool);

  for (const name of prioritizedToolNames) {
    report.tools[name] = { ok: false, attempts: 0, lastError: "" };
    const args = defaultToolArgs(name, context);

    if (name === clearSessionTool && !hasRestorableSession) {
      report.tools[name] = {
        ok: true,
        attempts: 0,
        mode: "skipped_no_session_backup",
        lastError: "No backup token available; skipped destructive clear test.",
      };
      continue;
    }

    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      report.tools[name].attempts = attempt;
      try {
        const result = await client.callTool({ name, arguments: args });

        if (result?.isError) {
          if (isExpectedToolError(name, result, "")) {
            report.tools[name] = { ok: true, attempts: attempt, mode: "expected_error", lastError: contentText(result) };
            break;
          }
          report.tools[name].lastError = contentText(result) || "tool returned isError";
        } else {
          if (name === clearSessionTool && hasRestorableSession) {
            await client.callTool({
              name: "treehole_save_session_token",
              arguments: { token: sessionBackup.token, host: sessionBackup.host || "https://proxy.treehole.qaq.ac.cn" },
            });
          }
          report.tools[name] = { ok: true, attempts: attempt, mode: "success" };
          break;
        }
      } catch (error) {
        const message = String(error?.message || error || "unknown error");
        if (isExpectedToolError(name, null, message)) {
          report.tools[name] = { ok: true, attempts: attempt, mode: "expected_exception", lastError: message };
          break;
        }
        report.tools[name].lastError = message;
      }
      if (attempt < RETRIES) await sleep(WAIT_MS * attempt);
    }
  }

  if (sessionBackup?.token) {
    try {
      await client.callTool({
        name: "treehole_save_session_token",
        arguments: { token: sessionBackup.token, host: sessionBackup.host || "https://proxy.treehole.qaq.ac.cn" },
      });
    } catch {}
  }

  const resources = await client.listResources();
  for (const resource of resources.resources || []) {
    const uri = resource.uri;
    report.resources[uri] = { ok: false, attempts: 0, lastError: "" };
    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      report.resources[uri].attempts = attempt;
      try {
        const result = await client.readResource({ uri });
        if (Array.isArray(result.contents) && result.contents.length > 0) {
          report.resources[uri] = { ok: true, attempts: attempt };
          break;
        }
        report.resources[uri].lastError = "empty resource contents";
      } catch (error) {
        report.resources[uri].lastError = String(error?.message || error || "unknown error");
      }
      if (attempt < RETRIES) await sleep(WAIT_MS * attempt);
    }
  }

  const templates = await client.listResourceTemplates();
  const templateUriSamples = {
    "treehole://thread/{threadId}": `treehole://thread/${context.threadId}`,
    "treehole://thread/{threadId}/posts": `treehole://thread/${context.threadId}/posts`,
    "treehole://post/{postId}": `treehole://post/${context.postId}`,
    "treehole://thread/{threadId}/subscribe": `treehole://thread/${context.threadId}/subscribe`,
    "treehole://identity/{code}": `treehole://identity/${encodeURIComponent(context.identityCode || "FineSong")}`,
  };

  for (const template of templates.resourceTemplates || []) {
    const uriTemplate = template.uriTemplate;
    const sampleUri = templateUriSamples[uriTemplate];
    const key = `template:${uriTemplate}`;
    report.resources[key] = { ok: false, attempts: 0, sampleUri: sampleUri || "", lastError: "" };
    if (!sampleUri) {
      report.resources[key].lastError = "no sample uri mapping";
      continue;
    }
    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      report.resources[key].attempts = attempt;
      try {
        const result = await client.readResource({ uri: sampleUri });
        if (Array.isArray(result.contents) && result.contents.length > 0) {
          report.resources[key] = { ok: true, attempts: attempt, sampleUri };
          break;
        }
        report.resources[key].lastError = "empty resource contents";
      } catch (error) {
        report.resources[key].lastError = String(error?.message || error || "unknown error");
      }
      if (attempt < RETRIES) await sleep(WAIT_MS * attempt);
    }
  }

  const prompts = await client.listPrompts();
  for (const prompt of prompts.prompts || []) {
    const name = prompt.name;
    report.prompts[name] = { ok: false, attempts: 0, lastError: "" };
    const args = promptArgs(name, context);
    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      report.prompts[name].attempts = attempt;
      try {
        const result = await client.getPrompt({ name, arguments: args });
        if (Array.isArray(result.messages) && result.messages.length > 0) {
          report.prompts[name] = { ok: true, attempts: attempt };
          break;
        }
        report.prompts[name].lastError = "empty prompt messages";
      } catch (error) {
        report.prompts[name].lastError = String(error?.message || error || "unknown error");
      }
      if (attempt < RETRIES) await sleep(WAIT_MS * attempt);
    }
  }

  report.bannedTools = Object.entries(report.tools)
    .filter(([, status]) => !status.ok && status.attempts >= RETRIES)
    .map(([name]) => name)
    .sort();

  const outFile = path.resolve(process.cwd(), "mcp-availability-report.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outFile,
    totals: {
      tools: Object.keys(report.tools).length,
      resources: Object.keys(report.resources).length,
      prompts: Object.keys(report.prompts).length,
    },
    failedTools: report.bannedTools,
  }, null, 2));

  await transport.close();
  process.exit(report.bannedTools.length ? 2 : 0);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
