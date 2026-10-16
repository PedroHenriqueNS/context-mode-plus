/**
 * context-mode-plus: decide whether a subagent type can call ctx_* tools.
 *
 * Routing text is only useful to a subagent whose `tools:` allowlist includes
 * them. Fails open: anything unknown or unreadable returns true (inject).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const WITH_CTX = new Set(["", "general-purpose", "Explore", "Plan", "Bash"]);
const WITHOUT_CTX = new Set(["claude-code-guide", "statusline-setup"]);

function findAgentFile(type, { configDir, projectDir }) {
  const sep = type.indexOf(":");
  if (sep > 0) {
    const plugin = type.slice(0, sep);
    const name = type.slice(sep + 1);
    const cache = join(configDir, "plugins", "cache");
    let best = null;
    for (const mkt of readdirSync(cache)) {
      const pluginDir = join(cache, mkt, plugin);
      let versions;
      try { versions = readdirSync(pluginDir); } catch { continue; }
      for (const v of versions) {
        try {
          const dir = join(pluginDir, v);
          const mtime = statSync(dir).mtimeMs;
          const file = join(dir, "agents", `${name}.md`);
          statSync(file);
          if (!best || mtime > best.mtime) best = { file, mtime };
        } catch { /* no agent in this version */ }
      }
    }
    return best?.file ?? null;
  }
  for (const file of [join(projectDir, ".claude", "agents", `${type}.md`), join(configDir, "agents", `${type}.md`)]) {
    try { statSync(file); return file; } catch { /* try next */ }
  }
  return null;
}

// Returns the `tools:` items from the leading frontmatter, or null when absent.
function parseTools(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const i = lines.findIndex((l) => /^tools:/.test(l));
  if (i < 0) return null;
  const inline = lines[i].slice("tools:".length).trim();
  const items = inline ? inline.split(",") : [];
  for (let j = i + 1; !inline && j < lines.length; j++) {
    const li = lines[j].match(/^\s+-\s*(.+)$/);
    if (!li) break;
    items.push(li[1]);
  }
  return items.map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

export function subagentHasCtxTools(subagentType, dirs) {
  try {
    const type = String(subagentType ?? "");
    if (WITH_CTX.has(type)) return true;
    if (WITHOUT_CTX.has(type)) return false;
    const file = findAgentFile(type, dirs);
    if (!file) return true;
    const tools = parseTools(readFileSync(file, "utf8"));
    if (!tools) return true;
    return tools.some((t) => t === "*" || t.startsWith("mcp__plugin_context-mode") || t.includes("ctx_"));
  } catch {
    return true;
  }
}
