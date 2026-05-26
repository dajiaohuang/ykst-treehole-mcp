---
name: ykst-treehole-mcp
description: "Use when working with YKST/Treehole through the `ykst-treehole-mcp` server: login/auth checks, read/write operations, resources/prompts usage, identity switching, notifications/subscriptions, and moderation-safe drafting aligned with local site rules."
---

# YKST Treehole MCP

Use this skill when the user wants Codex to operate YKST/Treehole through this repository's MCP server.

## Core Workflow

1. Check local state first:
   - Confirm the workspace is the MCP repo or locate it.
   - Check auth with `treehole_auth_status` or `node -e "const {authSummary}=require('./src/session'); console.log(authSummary())"`.
   - If unauthenticated, run `npm run login` and let the user finish jAccount login in the opened Chrome window.
2. For read tasks:
   - Prefer `resources` for stable snapshots (`treehole://...`) and `tools` for paginated/filter-heavy queries.
   - Summarize user content sparingly; avoid copying private or sensitive text into final answers unless needed.
3. For write tasks:
   - Read `references/site-rules.md` before drafting or calling write tools.
   - Confirm the target category, identity, title/body, and whether the action is public.
   - For preview-enabled tools, call once without `confirm` to get a structured preview, revise if needed, then rerun with `confirm: true`.
   - For other write tools, call only with `confirm: true`.
4. After write tasks:
   - Read the created/updated object back when possible.
   - Report the public thread/post id or URL, not session details.

## MCP Primitive Usage

- `tools`: execution surface for read/write RPC operations.
- `resources`: read-mostly URI-addressable snapshots/context.
- `prompts`: reusable workflow templates/checklists before calls.

### Preview-Enabled Write Tools

These tools return preview payloads when `confirm` is omitted:

- `treehole_create_thread`
- `treehole_reply_thread`
- `treehole_delete_thread`
- `treehole_delete_post`
- `treehole_report`
- `treehole_put_subscribe`
- `treehole_set_active_identity`
- `treehole_create_identity`
- `treehole_disable_identity`
- `treehole_update_setting`

Use prompts when the user asks for drafting/checklist/analysis framing:

- `treehole_prompt_read_thread`
- `treehole_prompt_draft_thread`
- `treehole_prompt_safe_write_check`
- `treehole_prompt_login_recovery`

## Runtime Availability

Run this before large refactors or release:

```powershell
node scripts/validate-mcp-availability.js
```

Policy used in this repo:

- If a tool fails 3 times in availability checks, ban (remove/disable) it until fixed.
- Current banned tools are tracked in `references/tool-map.md`.

## Safety Defaults

- Never print session tokens, OAuth callback codes, cookies, raw `.treehole-session.json`, or personal account identifiers.
- Do not automate bulk posting, voting, reporting, deleting, or identity cycling.
- Do not help bypass bans, rate limits, moderation, hidden categories, or identity restrictions.
- Treat identity names as user-private unless the user explicitly asks to reveal them.
- Prefer stdio mode. Use HTTP mode only when the client needs a URL endpoint.

## References

- For tool names and common argument patterns, read `references/tool-map.md`.
- For current local site-rule notes gathered from official station posts, read `references/site-rules.md`.
