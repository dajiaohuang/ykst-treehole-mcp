const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const { saveSession, authSummary } = require("../src/session");

async function main() {
  const rl = readline.createInterface({ input, output });
  const token = (await rl.question("Paste treehole_session token: ")).trim();
  rl.close();
  const saved = saveSession({ token });
  console.log(JSON.stringify({ saved, auth: authSummary() }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
