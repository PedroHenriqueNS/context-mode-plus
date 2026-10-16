/**
 * context-mode-plus: the user's own routing rules.
 *
 * Reads <configDir>/context-mode-usage.md. Never throws; returns null when the
 * file is missing, unreadable, blank, or larger than 64 KB (a mistaken huge
 * file must not flood the session context).
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_BYTES = 64 * 1024;

export function loadUserRules(configDir) {
  try {
    const file = join(configDir, "context-mode-usage.md");
    if (statSync(file).size > MAX_BYTES) return null;
    const text = readFileSync(file, "utf8").trim();
    return text ? `<context_mode_rules>\n${text}\n</context_mode_rules>` : null;
  } catch {
    return null;
  }
}
