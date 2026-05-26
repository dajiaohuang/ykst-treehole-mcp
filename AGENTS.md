# AGENTS.md

This repository contains a Node.js MCP server for Treehole/YKST gRPC-Web APIs.

## Project Shape

- Entry point: `src/index.js`
- RPC client: `src/treeholeClient.js`
- gRPC-Web transport: `src/grpcWeb.js`
- Local session storage: `src/session.js`
- Generated protobuf stubs: `src/generated/`
- Login helpers and smoke checks: `scripts/`
- Research notes: `docs/treehole-mcp-analysis/`

## Commands

- Install dependencies: `npm install`
- Start the MCP server: `npm start`
- Run the authenticated smoke check: `npm run smoke`
- Start the browser URL watcher login flow: `npm run login`
- Save an existing session token manually: `npm run save-token`

## Safety And Privacy

- Never commit `.treehole-session.json`, `.env*`, browser profiles, APK files, decoded APK output, downloaded tools, or raw tokens.
- Do not print or paste real Treehole session tokens, OAuth callback codes, cookies, Shuiyuan cookies, or personal account identifiers in issues, commits, docs, or logs.
- Keep write tools guarded by `confirm: true`.
- Before publishing or sharing screenshots/output, remove active identity names, user ids, account names, private thread contents, and token previews.
- Treat `TREEHOLE_SESSION`, `TREEHOLE_TOKEN`, and `TREEHOLE_SESSION_FILE` as local-only configuration.
- The default login flow reads only the isolated Chrome tab URL and must not print the OAuth callback code.

## Development Notes

- Prefer adding client RPC wrappers in `src/treeholeClient.js`, then registering MCP tools in `src/index.js`.
- Return structured JSON through the existing `json(...)` helper.
- Use generated protobuf message classes from `src/generated/`; avoid ad hoc binary handling where a generated class exists.
- Preserve the current default RPC host unless verification shows it has changed.
- Keep public docs focused on behavior and setup, not on any maintainer's personal login state.

## Verification

Run `npm run smoke` after changing RPC/auth/session behavior. For tool registration changes, instantiate the MCP server or run an SDK list-tools check before publishing.

## Historical Lessons (Codex Sessions, 2026-05-20 to 2026-05-21)

- Keep `npm run login` as the primary login path. It is designed to watch an isolated Chrome tab URL and exchange the production callback URL safely.
- Do not rely on local callback URLs for OAuth exchange by default. Codes from local callback testing can fail with `OAuthLogin` 401 when redirect URI validation expects `https://web.treehole.space/auth/jaccount`.
- Be careful with OAuth URL launching on Windows: unescaped `&` in shell commands can strip parameters and trigger `Missing response_type parameter value`. Prefer URL construction via `new URL(...)` and process spawn args.
- Keep legacy login paths (`login-capture`, `login-local-callback`, `save-token`) as fallback/debug options, not the default onboarding flow.
- Preserve the current default RPC host (`https://proxy.treehole.qaq.ac.cn`) unless verification shows a change. Earlier proxy endpoints had CORS/SSL breakage.
- gRPC-Web transport should keep lightweight retry for transient network failures only (for example `TypeError: fetch failed`), and should not retry business-logic errors.
- For write operations (`PutThread`, `PutPost`), include active identity message and `identityCode`. Using only active identity state can still fail with identity-not-found errors.
- `GetUserStats` may be unavailable on some deployments; keep using `GetProfile.stat` as the fallback data source.
- There is no dedicated single-identity RPC; identity lookup should be derived from `GetProfile` (`id`/`code`/`active` filters).
- Keep `treehole_auth_status` sanitized: never expose token preview, raw token, full callback URL, or absolute session path in tool output.
