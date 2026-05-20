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

async function main() {
  const { loginUrl } = await client.getLoginUrl({
    redirectUri: "https://web.treehole.space/auth/jaccount",
  });
  console.log(loginUrl);
  openUrl(loginUrl);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
