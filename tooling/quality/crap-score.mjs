#!/usr/bin/env node
// Reports a CRAP score (Change Risk Anti-Patterns: cyclomatic complexity
// combined with coverage — https://www.artima.com/weblogs/viewpost.jsp?thread=210575)
// per function, derived entirely from the istanbul-format `coverage-final.json`
// that `vitest run --coverage` already writes for every package.
//
// Complexity here is a proxy: 1 + the number of decision-point outcomes
// (`branchMap` entries, e.g. if/else, ternary, &&/||, switch) attributed to
// that function. Istanbul does not record loop constructs (for/while) as
// branches, so this under-counts true McCabe complexity for loop-heavy code —
// a known limitation, not a bug, and fine for a relative "what's riskiest"
// ranking.
//
// Report-only for now: exit code is always 0. Once coverage is high enough
// across the repo for a CRAP budget to be meaningful, this can gate CI the
// same way the coverage ratchet does.
import { globSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const HIGH_RISK = 30; // crap4j: CRAP > 30 needs urgent attention
const LOW_RISK = 10; // crap4j: CRAP <= 10 is fine

function comparePoints(a, b) {
  if (a.line !== b.line) return a.line - b.line;
  return (a.column ?? Infinity) - (b.column ?? Infinity);
}

function contains(outer, inner) {
  return (
    comparePoints(outer.start, inner.start) <= 0 &&
    comparePoints(inner.end, outer.end) <= 0
  );
}

function area(loc) {
  return comparePoints(loc.end, loc.start);
}

function analyzeFile(fileCoverage) {
  const functions = Object.entries(fileCoverage.fnMap)
    .map(([id, fn]) => ({
      id,
      name: fn.name || "<anonymous>",
      loc: fn.loc,
      line: fn.loc.start.line,
      decisionPoints: 0,
      coveredStatements: 0,
      totalStatements: 0,
    }))
    // Innermost (smallest range) first, so a statement/branch nested in two
    // functions is attributed to the closer one.
    .sort((a, b) => area(a.loc) - area(b.loc));

  function findOwner(loc) {
    return functions.find((fn) => contains(fn.loc, loc));
  }

  for (const [id, loc] of Object.entries(fileCoverage.statementMap)) {
    const owner = findOwner(loc);
    if (!owner) continue;
    owner.totalStatements += 1;
    if (fileCoverage.s[id] > 0) owner.coveredStatements += 1;
  }

  for (const branch of Object.values(fileCoverage.branchMap)) {
    const owner = findOwner(branch.loc);
    if (!owner) continue;
    owner.decisionPoints += Math.max(branch.locations.length - 1, 1);
  }

  return functions.map((fn) => {
    const complexity = 1 + fn.decisionPoints;
    const coverage =
      fn.totalStatements === 0
        ? (fileCoverage.f[fn.id] ?? 0) > 0
          ? 1
          : 0
        : fn.coveredStatements / fn.totalStatements;
    const crap = complexity ** 2 * (1 - coverage) ** 3 + complexity;
    return { ...fn, complexity, coverage, crap };
  });
}

function main() {
  const files = [
    ...globSync("apps/*/coverage/coverage-final.json", { cwd: ROOT }),
    ...globSync("packages/*/coverage/coverage-final.json", { cwd: ROOT }),
  ];

  if (files.length === 0) {
    console.log(
      "No coverage-final.json reports found. Run `pnpm test:unit:coverage` first.",
    );
    return;
  }

  const all = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    const report = JSON.parse(readFileSync(abs, "utf8"));
    for (const fileCoverage of Object.values(report)) {
      for (const fn of analyzeFile(fileCoverage)) {
        all.push({ file: path.relative(ROOT, fileCoverage.path), ...fn });
      }
    }
  }

  all.sort((a, b) => b.crap - a.crap);

  const top = all.slice(0, 25);
  console.log(
    "CRAP score (complexity² × (1 - coverage)³ + complexity) — top offenders:\n",
  );
  console.log(
    "CRAP".padEnd(8) +
      "Complexity".padEnd(12) +
      "Coverage".padEnd(10) +
      "Location",
  );
  for (const fn of top) {
    console.log(
      fn.crap.toFixed(1).padEnd(8) +
        String(fn.complexity).padEnd(12) +
        `${(fn.coverage * 100).toFixed(0)}%`.padEnd(10) +
        `${fn.file}:${fn.line} (${fn.name})`,
    );
  }

  const highRisk = all.filter((fn) => fn.crap > HIGH_RISK).length;
  const lowRisk = all.filter((fn) => fn.crap <= LOW_RISK).length;
  console.log(
    `\n${all.length} functions analyzed — ${highRisk} above CRAP ${HIGH_RISK} (high risk), ${lowRisk} at or below CRAP ${LOW_RISK} (fine).`,
  );
  console.log(
    "Report-only: this does not fail the build. Complexity is a proxy derived from " +
      "istanbul's branch data and does not count loop constructs (for/while).",
  );
}

main();
