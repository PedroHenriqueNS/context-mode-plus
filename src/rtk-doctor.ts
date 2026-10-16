/**
 * context-mode-plus: informational RTK checks for `doctor`. Never affects the exit code.
 */
import { execFileSync } from "node:child_process";

export interface RtkAnalysis {
  summary: string;
  warnings: string[];
}

function run(args: string[]): string | null {
  try {
    return execFileSync("rtk", args, { encoding: "utf8", timeout: 3000, stdio: "pipe" });
  } catch {
    return null;
  }
}

/** Runs `rtk --version` and `rtk pipeline show`; each is null when it fails. */
export function probeRtk(): RtkAnalysis {
  const version = run(["--version"]);
  return analyzeRtk(version, version === null ? null : run(["pipeline", "show"]));
}

export function analyzeRtk(versionOut: string | null, pipelineOut: string | null): RtkAnalysis {
  if (versionOut === null) return { summary: "RTK não instalado", warnings: [] };
  const version = versionOut.trim();
  const m = version.match(/(\d+)\.\d+\.\d+/);
  if (m && Number(m[1]) < 1) {
    return { summary: `${version} — pipelines indisponíveis antes da 1.0`, warnings: [] };
  }
  if (pipelineOut === null) {
    return { summary: `${version} — edição oss (sem \`rtk pipeline show\`)`, warnings: [] };
  }

  const rules = enabledRules(pipelineOut);
  const warnings: string[] = [];
  if ((rules.get("hook.after_tool.mcp")?.length ?? 0) + (rules.get("hook.after_tool.any")?.length ?? 0) > 0) {
    warnings.push("Pipeline after_tool.mcp/any do RTK pode comprimir as saídas ctx_*.");
  }
  if (rules.get("hook.before_tool.read")?.length) {
    warnings.push("Pipeline before_tool.read do RTK disputa o Read com o context-mode.");
  }
  if ((rules.get("hook.after_tool.read") ?? []).some((name) => name !== "lockfiles")) {
    warnings.push("Pipeline after_tool.read do RTK altera a saída do Read (só a regra lockfiles é inofensiva).");
  }
  return { summary: `${version} — pipelines lidas`, warnings };
}

/**
 * Parses the resolved-pipeline listing of `rtk pipeline show` (rtk 1.0.1):
 * a 2-space-indented position line (`  hook.after_tool.read`) followed by
 * 4-space-indented rule lines (`    name  [origin] when … -> …`, suffixed
 * `(disabled)` when off). Returns enabled rule names per position.
 */
function enabledRules(out: string): Map<string, string[]> {
  const rules = new Map<string, string[]>();
  let position: string | null = null;
  for (const line of out.split(/\r?\n/)) {
    const pos = line.match(/^ {2}(\S+)\s*$/);
    if (pos) {
      position = pos[1];
      continue;
    }
    const rule = line.match(/^ {4}(\S+)\s/);
    if (rule && position) {
      if (!/\(disabled\)\s*$/.test(line)) rules.set(position, [...(rules.get(position) ?? []), rule[1]]);
      continue;
    }
    if (!line.startsWith("  ")) position = null;
  }
  return rules;
}
