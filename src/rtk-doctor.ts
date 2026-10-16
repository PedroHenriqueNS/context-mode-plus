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

  const warnings: string[] = [];
  if (/\[\[hook\.after_tool\.(mcp|any)\]\]/.test(pipelineOut)) {
    warnings.push("Pipeline after_tool.mcp/any do RTK pode comprimir as saídas ctx_*.");
  }
  if (/\[\[hook\.before_tool\.read\]\]/.test(pipelineOut)) {
    warnings.push("Pipeline before_tool.read do RTK disputa o Read com o context-mode.");
  }
  // Each TOML block starts at a header line; only an enabled `lockfiles` rule is harmless.
  const readRules = pipelineOut.split(/^(?=\s*\[)/m).filter((b) => /^\s*\[\[hook\.after_tool\.read\]\]/.test(b));
  const harmless = (b: string) => /^\s*name\s*=\s*["']lockfiles["']/m.test(b) && !/^\s*enabled\s*=\s*false\b/m.test(b);
  if (readRules.some((b) => !harmless(b))) {
    warnings.push("Pipeline after_tool.read do RTK altera a saída do Read (só a regra lockfiles habilitada é inofensiva).");
  }
  return { summary: `${version} — pipelines lidas`, warnings };
}
