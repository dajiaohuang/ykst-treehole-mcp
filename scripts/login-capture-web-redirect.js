const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");
const { spawn } = require("node:child_process");
const selfsigned = require("selfsigned");
const client = require("../src/treeholeClient");

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

function html(body) {
  return `<!doctype html><meta charset="utf-8"><title>Treehole MCP Login</title><body style="font-family: system-ui; max-width: 720px; margin: 48px auto; line-height: 1.6">${body}</body>`;
}

async function main() {
  const chrome = findChrome();
  if (!chrome) throw new Error("Chrome not found. Set CHROME_PATH to chrome.exe and retry.");

  const attrs = [{ name: "commonName", value: "web.treehole.space" }];
  const pems = selfsigned.generate(attrs, {
    days: 1,
    keySize: 2048,
    extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: "web.treehole.space" }] }],
  });

  const server = https.createServer({ key: pems.private, cert: pems.cert }, async (req, res) => {
    const url = new URL(req.url, "https://web.treehole.space");
    if (url.pathname !== "/auth/jaccount") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html("<h1>Treehole MCP login capture is running</h1>"));
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      res.end(html("<h1>No OAuth code found</h1><p>The callback did not contain a code parameter.</p>"));
      return;
    }

    try {
      const result = await client.loginWithCode(code);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html(`<h1>Login saved</h1><p>You can close this Chrome window.</p><pre>${JSON.stringify({ authenticated: result.authenticated, host: result.host, savedAt: result.savedAt }, null, 2)}</pre>`));
      console.log(JSON.stringify({ ok: true, authenticated: result.authenticated, host: result.host, savedAt: result.savedAt }, null, 2));
      setTimeout(() => server.close(() => process.exit(0)), 1000);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
      res.end(html(`<h1>Token exchange failed</h1><pre>${String(error.stack || error.message || error)}</pre>`));
      console.error(error);
    }
  });

  server.listen(443, "127.0.0.1", async () => {
    const { loginUrl } = await client.getLoginUrl({ redirectUri: "https://web.treehole.space/auth/jaccount" });
    const profile = path.resolve(process.cwd(), ".tmp-chrome-login");
    fs.mkdirSync(profile, { recursive: true });
    console.log("Opening isolated Chrome login window. Complete jAccount login there.");
    console.log(loginUrl);
    spawn(chrome, [
      `--user-data-dir=${profile}`,
      "--new-window",
      "--ignore-certificate-errors",
      "--host-resolver-rules=MAP web.treehole.space 127.0.0.1",
      loginUrl,
    ], { detached: true, stdio: "ignore" }).unref();
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
