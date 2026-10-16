/**
 * context-mode-plus: event-driven nudges. Fires from PostToolUse, after the size of
 * what a Read/Bash actually returned is known, instead of a generic once-per-session advisory.
 */
import { guidancePeriodic } from "./routing.mjs";

const READ_MIN_CHARS = 8000;
const BASH_MIN_CHARS = 5000;
const EVERY = 5; // nudge on the 1st, 6th, 11th... qualifying call per session
const kb = (chars) => Math.round(chars / 1024);

export function decidePostNudge({ toolName, toolInput, responseText, sessionId }) {
  const len = responseText?.length ?? 0;
  let type, text;
  if (toolName === "Read") {
    if (toolInput?.offset != null || toolInput?.limit != null || len < READ_MIN_CHARS) return null;
    type = "post-read";
    text = `Esse Read trouxe ${kb(len)} KB de ${String(toolInput?.file_path ?? "").slice(0, 200)}. Se você não vai editar o arquivo, use ctx_execute_file(path, language, code) e imprima só o que precisa.`;
  } else if (toolName === "Bash") {
    if (len < BASH_MIN_CHARS) return null;
    type = "post-bash";
    text = `Esse comando imprimiu ${kb(len)} KB. Para processar saídas desse tamanho, use ctx_execute(language: "shell", code) e imprima só o resultado.`;
  } else {
    return null;
  }
  return guidancePeriodic(type, text, sessionId, EVERY)?.additionalContext ?? null;
}
