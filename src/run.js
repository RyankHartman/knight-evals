// Runs the eval set against the live Knight chatbot and writes a report.
//
// Usage:
//   npm run eval                       # all cases
//   npm run eval -- --only Privacy     # one category (case-insensitive substring)
//   npm run eval -- --limit 5          # first N cases (quick smoke test)
//   npm run eval -- --ids off-06,life-06  # specific cases, merged into the latest results
//
// Env:
//   KNIGHT_URL   chat endpoint (default: the live demo)
//   DELAY_MS     pause between requests to respect rate limits (default 8000)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grade } from "./grade.js";
import { pct, writeReport } from "./report.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KNIGHT_URL = process.env.KNIGHT_URL || "https://knightbot-pi.vercel.app/api/chat";
const DELAY_MS = Number(process.env.DELAY_MS ?? 8000);
const MAX_RETRIES = 4;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(messages) {
  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    let res;
    try {
      res = await fetch(KNIGHT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "about", messages }),
      });
    } catch (err) {
      // Network blip (DNS, connection reset): wait and retry instead of crashing the run.
      if (attempt < MAX_RETRIES) {
        console.log(`    network error (${err.cause?.code || err.message}), retrying in 15s`);
        await sleep(15000);
        continue;
      }
      return { reply: "", error: `network error: ${err.cause?.code || err.message}`, ms: Date.now() - started };
    }
    const data = await res.json().catch(() => ({}));
    const ms = Date.now() - started;

    // Rate limited: back off and retry.
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = 20000 * (attempt + 1);
      console.log(`    rate limited, retrying in ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) return { reply: "", error: data?.error?.message || `HTTP ${res.status}`, ms };
    return { reply: data.reply, model: data.model, ms };
  }
}

async function main() {
  let cases = JSON.parse(fs.readFileSync(path.join(root, "evals", "cases.json"), "utf8"));
  const only = flag("--only");
  const limit = Number(flag("--limit")) || undefined;
  if (only) cases = cases.filter((c) => c.category.toLowerCase().includes(only.toLowerCase()));
  if (limit) cases = cases.slice(0, limit);
  const ids = flag("--ids")?.split(",").map((s) => s.trim());
  if (ids) cases = cases.filter((c) => ids.includes(c.id));

  // With --ids, merge into the latest run instead of replacing it.
  const latestPath = path.join(root, "results", "latest.json");
  const previous = ids && fs.existsSync(latestPath) ? JSON.parse(fs.readFileSync(latestPath, "utf8")) : null;
  const save = (results, model) => {
    const merged = previous
      ? previous.results.map((p) => results.find((r) => r.id === p.id) ?? p)
      : results;
    const run = { date: new Date().toISOString().slice(0, 10), endpoint: KNIGHT_URL, model: model ?? previous?.model, results: merged };
    fs.mkdirSync(path.join(root, "results"), { recursive: true });
    fs.writeFileSync(latestPath, JSON.stringify(run, null, 2));
    return run;
  };

  console.log(`Running ${cases.length} cases against ${KNIGHT_URL}\n`);
  const results = [];
  let model;

  for (const [i, c] of cases.entries()) {
    const messages = c.messages ?? [{ role: "user", content: c.question }];
    const question = messages[messages.length - 1].content;
    const { reply, error, ms, model: m } = await ask(messages);
    model ??= m;
    const { pass, failures } = error ? { pass: false, failures: [] } : grade(reply, c.expect);
    results.push({ id: c.id, category: c.category, question, reply, pass, failures, error, ms, why: c.why });
    console.log(`${pass ? "PASS" : "FAIL"}  ${c.id.padEnd(9)} ${question.slice(0, 60)}${pass ? "" : `\n      -> ${error || failures.join("; ")}`}`);
    save(results, model); // save after every case so a crash loses nothing
    if (i < cases.length - 1) await sleep(DELAY_MS);
  }

  const run = save(results, model);
  const { passed, total } = writeReport(run);
  console.log(`\nScore: ${passed}/${total} (${pct(passed, total)}%). Report: results/REPORT.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
