// Re-grades the saved replies in results/latest.json with the current graders
// and rewrites the report. No API calls. Usage: npm run regrade
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grade } from "./grade.js";
import { pct, writeReport } from "./report.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = JSON.parse(fs.readFileSync(path.join(root, "results", "latest.json"), "utf8"));
const cases = new Map(JSON.parse(fs.readFileSync(path.join(root, "evals", "cases.json"), "utf8")).map((c) => [c.id, c]));

for (const r of run.results) {
  if (r.error) continue;
  const { pass, failures } = grade(r.reply, cases.get(r.id)?.expect);
  r.pass = pass;
  r.failures = failures;
}
fs.writeFileSync(path.join(root, "results", "latest.json"), JSON.stringify(run, null, 2));
const { passed, total } = writeReport(run);
console.log(`Re-graded: ${passed}/${total} (${pct(passed, total)}%). Report: results/REPORT.md`);
