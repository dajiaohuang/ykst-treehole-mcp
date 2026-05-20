const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const client = require("../src/treeholeClient");

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function callbackFromTarget(target) {
  const targetUrl = target.url || "";
  if (!targetUrl.includes("/auth/jaccount")) return null;
  const parsed = new URL(targetUrl);
  if (!parsed.searchParams.get("code")) return null;
  return parsed.toString();
}

async function waitForCallbackUrl(port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      const callbackUrl = targets.map(callbackFromTarget).find(Boolean);
      if (callbackUrl) return callbackUrl;
    } catch {
      // Chrome may need a moment to open the debugging endpoint.
    }
    await sleep(800);
  }
  throw new Error("Timed out waiting for the browser to reach the Treehole OAuth callback URL.");
}

async function main() {
  const chrome = findChrome();
  if (!chrome) throw new Error("Chrome not found. Set CHROME_PATH to chrome.exe and retry.");

  const port = Number(process.env.TREEHOLE_LOGIN_DEBUG_PORT) || await freePort();
  const timeoutMs = Number(process.env.TREEHOLE_LOGIN_TIMEOUT_MS) || 180000;
  const profile = path.resolve(process.env.TREEHOLE_LOGIN_CHROME_PROFILE || ".tmp-chrome-login");
  fs.mkdirSync(profile, { recursive: true });

  const { loginUrl } = await client.getLoginUrl({
    redirectUri: "https://web.treehole.space/auth/jaccount",
  });

  console.log("Opening an isolated Chrome login window.");
  console.log("Complete jAccount login there; this script will read the callback URL and save the session.");
  console.log(loginUrl);

  const browser = spawn(chrome, [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    "--new-window",
    loginUrl,
  ], { detached: true, stdio: "ignore" });
  browser.unref();

  const callbackUrl = await waitForCallbackUrl(port, timeoutMs);
  const result = await client.loginWithCallbackUrl(callbackUrl);
  console.log(JSON.stringify({
    ok: true,
    authenticated: result.authenticated,
    host: result.host,
    savedAt: result.savedAt,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
