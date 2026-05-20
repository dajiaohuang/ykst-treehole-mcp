const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SESSION_FILE = path.resolve(process.cwd(), ".treehole-session.json");

function sessionFile() {
  return path.resolve(process.env.TREEHOLE_SESSION_FILE || DEFAULT_SESSION_FILE);
}

function readStoredSession() {
  const file = sessionFile();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function getToken() {
  return process.env.TREEHOLE_SESSION || process.env.TREEHOLE_TOKEN || readStoredSession().token || "";
}

function getHost() {
  return process.env.TREEHOLE_RPC_HOST || readStoredSession().host || "https://proxy.treehole.qaq.ac.cn";
}

function saveSession({ token, host }) {
  if (!token || typeof token !== "string") {
    throw new Error("token is required");
  }
  const file = sessionFile();
  const payload = {
    token,
    host: host || getHost(),
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return { file, host: payload.host, savedAt: payload.savedAt };
}

function clearSession() {
  const file = sessionFile();
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return { file };
}

function authSummary() {
  const envToken = Boolean(process.env.TREEHOLE_SESSION || process.env.TREEHOLE_TOKEN);
  const stored = readStoredSession();
  const token = getToken();
  return {
    authenticated: Boolean(token),
    source: envToken ? "env" : stored.token ? "file" : "none",
    host: getHost(),
    sessionFileName: path.basename(sessionFile()),
    savedAt: stored.savedAt || "",
  };
}

module.exports = {
  authSummary,
  clearSession,
  getHost,
  getToken,
  saveSession,
};
