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
- Start the captured production OAuth login flow: `npm run login`
- Save an existing session token manually: `npm run save-token`

## Safety And Privacy

- Never commit `.treehole-session.json`, `.env*`, browser profiles, APK files, decoded APK output, downloaded tools, or raw tokens.
- Do not print or paste real Treehole session tokens, OAuth callback codes, cookies, Shuiyuan cookies, or personal account identifiers in issues, commits, docs, or logs.
- Keep write tools guarded by `confirm: true`.
- Before publishing or sharing screenshots/output, remove active identity names, user ids, account names, private thread contents, and token previews.
- Treat `TREEHOLE_SESSION`, `TREEHOLE_TOKEN`, and `TREEHOLE_SESSION_FILE` as local-only configuration.

## Development Notes

- Prefer adding client RPC wrappers in `src/treeholeClient.js`, then registering MCP tools in `src/index.js`.
- Return structured JSON through the existing `json(...)` helper.
- Use generated protobuf message classes from `src/generated/`; avoid ad hoc binary handling where a generated class exists.
- Preserve the current default RPC host unless verification shows it has changed.
- Keep public docs focused on behavior and setup, not on any maintainer's personal login state.

## Verification

Run `npm run smoke` after changing RPC/auth/session behavior. For tool registration changes, instantiate the MCP server or run an SDK list-tools check before publishing.
