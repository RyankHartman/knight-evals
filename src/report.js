import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function pct(n, d) {
  return d ? Math.round((n / d) * 100) : 0;
}

export function writeReport(run) {
  const { results } = run;
  const passed = results.filter((r) => r.pass).length;
  const byCategory = {};
  for (const r of results) {
    byCategory[r.category] ??= { pass: 0, total: 0 };
    byCategory[r.category].total++;
    if (r.pass) byCategory[r.category].pass++;
  }
  const failures = results.filter((r) => !r.pass);
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const median = latencies[Math.floor(latencies.length / 2)] ?? 0;
  const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, 220);

  const lines = [
    "# Knight eval report",
    "",
    `**Score: ${passed}/${results.length} (${pct(passed, results.length)}%)** · model \`${run.model ?? "unknown"}\` · ${run.date}`,
    "",
    `Median response time: ${(median / 1000).toFixed(1)}s · endpoint: \`${run.endpoint}\``,
    "",
    "## By category",
    "",
    "| Category | Passed | Score |",
    "| --- | --- | --- |",
    ...Object.entries(byCategory).map(([c, v]) => `| ${c} | ${v.pass}/${v.total} | ${pct(v.pass, v.total)}% |`),
    "",
    "## Failures",
    "",
    failures.length
      ? "| Case | Question | Why it failed | Knight's reply (trimmed) |\n| --- | --- | --- | --- |\n" +
        failures
          .map((f) => `| ${f.id} | ${oneLine(f.question)} | ${oneLine(f.error || f.failures.join("; "))} | ${oneLine(f.reply)} |`)
          .join("\n")
      : "None. Every case passed.",
    "",
    "Full replies for every case are in [`results/latest.json`](latest.json).",
    "",
  ];
  fs.writeFileSync(path.join(root, "results", "REPORT.md"), lines.join("\n"));
  return { passed, total: results.length };
}

