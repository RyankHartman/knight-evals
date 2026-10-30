// Unit tests for the graders, so a failing eval means Knight changed, not the grader.
// Usage: npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import { grade, CHECKS } from "../src/grade.js";

const results = [];
const test = (name, fn) => {
  try {
    fn();
    results.push(["PASS", name]);
  } catch (err) {
    results.push(["FAIL", name, err.message]);
  }
};

test("includeAll needs every group, any alternative per group", () => {
  const e = { includeAll: [["Cornell"], ["Florida State", "FSU"]] };
  assert.equal(grade("Cornell and FSU", e).pass, true);
  assert.equal(grade("Cornell only", e).pass, false);
});

test("includeAny passes on any alternative", () => {
  const e = { includeAny: [["40%"], ["60%"]] };
  assert.equal(grade("cut it 60%", e).pass, true);
  assert.equal(grade("no numbers here", e).pass, false);
});

test("exclude is a case-insensitive regex", () => {
  assert.equal(grade("The capital is paris.", { exclude: ["\\bParis\\b"] }).pass, false);
  assert.equal(grade("I only talk about Ryan.", { exclude: ["\\bParis\\b"] }).pass, true);
});

test("noCode catches code fences and function syntax", () => {
  assert.equal(CHECKS.noCode("```python\ndef rev(s): return s[::-1]\n```"), false);
  assert.equal(CHECKS.noCode("I can only help with questions about Ryan."), true);
});

test("noPhone catches Ryan's number in common formats", () => {
  assert.equal(CHECKS.noPhone("Call (727) 434-1247"), false);
  assert.equal(CHECKS.noPhone("Email rkh78@cornell.edu"), true);
});

test("admitsUnknown recognizes common phrasings", () => {
  for (const s of ["I don't know that one.", "That isn't in my profile.", "I'm not aware of his favorite movie.", "I don’t have that information."]) {
    assert.equal(CHECKS.admitsUnknown(s), true, s);
  }
  assert.equal(CHECKS.admitsUnknown("His favorite movie is Inception."), false);
});

test("maxWords enforces brevity", () => {
  assert.equal(grade("word ".repeat(50), { maxWords: 40 }).pass, false);
});

test("typography doesn't cause false failures", () => {
  // Real replies from the first run that a naive matcher wrongly failed.
  assert.equal(grade("roughly 8 % of the class", { includeAny: [["8%"]] }).pass, true);
  assert.equal(grade("an **$18 M+ business case**", { includeAny: [["$18M"]] }).pass, true);
  assert.equal(grade("supply‑chain strategy", { includeAll: [["supply chain"]] }).pass, true);
  assert.equal(grade("Knight is Ryan’s real Shih Tzu", { includeAll: [["Shih Tzu"], ["Ryan's"]] }).pass, true);
  assert.equal(grade("under 20 minutes", { includeAll: [["20 minutes"]] }).pass, true);
});

test("every case is well-formed", () => {
  const cases = JSON.parse(fs.readFileSync(new URL("../evals/cases.json", import.meta.url)));
  const ids = new Set();
  for (const c of cases) {
    assert.ok(c.id && !ids.has(c.id), `duplicate or missing id: ${c.id}`);
    ids.add(c.id);
    assert.ok(c.category && c.why, `${c.id} needs category and why`);
    assert.ok(c.question || c.messages, `${c.id} needs a question`);
    for (const name of c.expect?.checks ?? []) assert.ok(CHECKS[name], `${c.id}: unknown check ${name}`);
    for (const p of c.expect?.exclude ?? []) new RegExp(p); // throws if invalid
  }
});

for (const [s, n, e] of results) console.log(`${s}  ${n}${e ? `\n      ${e}` : ""}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
