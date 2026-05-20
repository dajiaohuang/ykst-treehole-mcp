const http = require("node:http");
const { spawn } = require("node:child_process");
const client = require("../src/treeholeClient");

function openUrl(url) {
  if (process.platform === "win32") {
    spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

function html(body) {
  return `<!doctype html><meta charset="utf-8"><title>Treehole MCP Login</title><body style="font-family: system-ui; max-width: 720px; margin: 48px auto; line-height: 1.6">${body}</body>`;
}

async function main() {
  if (process.env.TREEHOLE_ALLOW_LOCAL_OAUTH_REDIRECT !== "true") {
    console.error("This helper is experimental: Treehole OAuthLogin currently expects codes minted for https://web.treehole.space/auth/jaccount.");
    console.error("Use the normal web login, then copy treehole_session and run: npm run save-token");
    process.exit(2);
  }

  const port = Number(process.env.TREEHOLE_LOGIN_PORT || 37971);
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, redirectUri);
    if (url.pathname !== "/callback") {
      res.writeHead(404).end("not found");
      return;
    }
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      res.end(html(`<h1>No code found</h1><p>Callback URL did not include <code>code</code>.</p>`));
      return;
    }
    try {
      const result = await client.loginWithCode(code);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html(`<h1>Login saved</h1><p>You can close this tab.</p><pre>${JSON.stringify({ authenticated: result.authenticated, host: result.host, savedAt: result.savedAt }, null, 2)}</pre>`));
      console.log(JSON.stringify({ ok: true, authenticated: result.authenticated, host: result.host, savedAt: result.savedAt }, null, 2));
      setTimeout(() => server.close(() => process.exit(0)), 500);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
      res.end(html(`<h1>Login exchange failed</h1><pre>${String(error.stack || error.message || error)}</pre>`));
      console.error(error);
    }
  });

  server.listen(port, "127.0.0.1", async () => {
    const { loginUrl } = await client.getLoginUrl({ redirectUri });
    console.log(`Opening login URL with redirect: ${redirectUri}`);
    console.log(loginUrl);
    openUrl(loginUrl);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
