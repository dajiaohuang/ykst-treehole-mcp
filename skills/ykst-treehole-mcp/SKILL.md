---
name: ykst-treehole-mcp
description: "Use when working with YKST/Treehole through the `ykst-treehole-mcp` server: logging in, checking auth, reading threads/posts/categories/tags/identities, posting or replying, switching identities, handling notifications/subscriptions, or drafting safe Treehole actions that must respect local site rules."
---

# YKST Treehole MCP

Use this skill when the user wants Codex to operate YKST/Treehole through this repository's MCP server.

## Core Workflow

1. Check local state first:
   - Confirm the workspace is the MCP repo or locate it.
   - Check auth with `treehole_auth_status` or `node -e "const {authSummary}=require('./src/session'); console.log(authSummary())"`.
   - If unauthenticated, run `npm run login` and let the user finish jAccount login in the opened Chrome window.
2. For read tasks:
   - Use the smallest relevant read tool.
   - Summarize user content sparingly; avoid copying private or sensitive text into final answers unless needed.
3. For write tasks:
   - Read `references/site-rules.md` before drafting or calling write tools.
   - Confirm the target category, identity, title/body, and whether the action is public.
   - Use write tools only with `confirm: true`.
4. After write tasks:
   - Read the created/updated object back when possible.
   - Report the public thread/post id or URL, not session details.

## Safety Defaults

- Never print session tokens, OAuth callback codes, cookies, raw `.treehole-session.json`, or personal account identifiers.
- Do not automate bulk posting, voting, reporting, deleting, or identity cycling.
- Do not help bypass bans, rate limits, moderation, hidden categories, or identity restrictions.
- Treat identity names as user-private unless the user explicitly asks to reveal them.
- Prefer stdio mode. Use HTTP mode only when the client needs a URL endpoint.

## References

- For tool names and common argument patterns, read `references/tool-map.md`.
- For current local site-rule notes gathered from official station posts, read `references/site-rules.md`.
