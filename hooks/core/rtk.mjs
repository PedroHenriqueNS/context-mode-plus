/**
 * context-mode-plus: is RTK's PreToolUse hook registered on Bash?
 *
 * RTK (`rtk hook claude`) rewrites Bash commands through `updatedInput`. When it
 * is active, context-mode must not return its own Bash `modify` (ambiguous), so
 * the router denies instead. Called on every Bash PreToolUse: reads only the
 * given settings files, spawns nothing, never throws.
 */
import { readFileSync } from "node:fs";

const RTK_HOOK = /\brtk\b[^|;&]*\bhook\b|rtk-rewrite/;

export function isRtkBashHookActive(settingsPaths) {
  for (const path of settingsPaths) {
    try {
      const entries = JSON.parse(readFileSync(path, "utf8"))?.hooks?.PreToolUse;
      if (!Array.isArray(entries)) continue;
      for (const e of entries) {
        if (!/\bBash\b/.test(String(e?.matcher ?? ""))) continue;
        if ((e.hooks ?? []).some((h) => RTK_HOOK.test(String(h?.command ?? "")))) return true;
      }
    } catch { /* missing or invalid file: ignore */ }
  }
  return false;
}
