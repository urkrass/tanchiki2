#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const HARNESS_COMMIT = "69df33aafbe6f2738b87419d449fd3ee4f84f018";
const SOURCE_FILES = [
  "scripts/deep-agent-stub-runtime.mjs",
  "src/orchestrator/deep-agent-stub-runtime.js",
  "src/orchestrator/deep-agent-runtime-contract.js",
  "src/orchestrator/attended-v2-operating-mode.js",
  "src/observability/deep-agent-attended-v2-telemetry.js",
  "src/observability/trace.js",
];
const ROLE_NAMES = new Map([
  ["project_steward", "Project Steward"],
  ["architecture_keeper", "Architecture Keeper"],
  ["review_warden", "Review Warden"],
  ["git_discipline_agent", "Git Discipline"],
  ["validation_agent", "Validation Agent"],
  ["release_warden", "Release Warden"],
  ["implementation_executor", "Implementation Executor"],
  ["memory_curator", "Memory Curator"],
]);

try {
  const root = process.cwd();
  await assertPinnedAdapter(root);
  const { runtimeArgs, scenarioPath, outputPath, planOutputPath } = parseArgs(process.argv.slice(2));
  const runtimeRoot = await materializeRuntime();
  const runtimeModule = await import(pathToFileURL(resolve(runtimeRoot, "scripts/deep-agent-stub-runtime.mjs")).href);
  const exitCode = await runtimeModule.main({
    argv: runtimeArgs,
    cwd: root,
    stdout: (message) => process.stdout.write(message),
  });
  if (exitCode !== 0) {
    throw new Error(`Deep Agents stub runtime exited with code ${exitCode}.`);
  }
  if (planOutputPath) {
    await writePlanMarkdown({ root, scenarioPath, outputPath, planOutputPath });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function assertPinnedAdapter(root) {
  const lockfile = JSON.parse(await readFile(resolve(root, ".agentic-harness/agentic-harness.lock.json"), "utf8"));
  if (lockfile?.core?.ref !== HARNESS_COMMIT || lockfile?.core?.resolved_commit !== HARNESS_COMMIT) {
    throw new Error(`Tanchiki2 harness lock must pin ${HARNESS_COMMIT}.`);
  }
  const adapter = await readFile(resolve(root, ".agentic-harness/project-adapter.yml"), "utf8");
  if (!adapter.includes(`upstream_ref: "${HARNESS_COMMIT}"`)) {
    throw new Error(`Tanchiki2 project adapter must pin ${HARNESS_COMMIT}.`);
  }
}

function parseArgs(argv) {
  const runtimeArgs = [];
  let scenarioPath = "";
  let outputPath = "";
  let planOutputPath = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = String(argv[index]);
    const equalsIndex = arg.indexOf("=");
    const key = equalsIndex === -1 ? arg : arg.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? null : arg.slice(equalsIndex + 1);

    if (key === "--plan-output") {
      const value = inlineValue ?? argv[index + 1];
      if (value === undefined) throw new Error("--plan-output requires a path.");
      if (inlineValue === null) index += 1;
      planOutputPath = requireRepoPath(value, "plan-output");
      continue;
    }

    if (key === "--scenario") {
      const value = inlineValue ?? argv[index + 1];
      if (value === undefined) throw new Error("--scenario requires a path.");
      scenarioPath = requireRepoPath(value, "scenario");
      runtimeArgs.push(arg);
      if (inlineValue === null) {
        index += 1;
        runtimeArgs.push(String(value));
      }
      continue;
    }

    if (key === "--output") {
      const value = inlineValue ?? argv[index + 1];
      if (value === undefined) throw new Error("--output requires a path.");
      outputPath = requireRepoPath(value, "output");
      runtimeArgs.push(arg);
      if (inlineValue === null) {
        index += 1;
        runtimeArgs.push(String(value));
      }
      continue;
    }

    runtimeArgs.push(arg);
  }

  if (!scenarioPath) {
    scenarioPath = ".agentic-harness/deep-agents/scenarios/polish-planning.json";
  }
  return { runtimeArgs, scenarioPath, outputPath, planOutputPath };
}

async function materializeRuntime() {
  const harnessRepo = resolve(process.env.AGENTIC_HARNESS_REPO || process.env.AGENTIC_HARNESS_STUB_RUNTIME_REPO || "D:/agentic-harness/repo");
  execGit(["-C", harnessRepo, "cat-file", "-e", `${HARNESS_COMMIT}^{commit}`]);

  const cacheBase = resolve(process.env.AGENTIC_HARNESS_STUB_RUNTIME_CACHE_ROOT || join(tmpdir(), "tanchiki2-agentic-harness-stub-runtime"));
  const cacheRoot = resolve(cacheBase, HARNESS_COMMIT);
  assertWithin(cacheRoot, cacheBase);

  const markerPath = resolve(cacheRoot, ".source-commit");
  const packageJsonPath = resolve(cacheRoot, "package.json");
  try {
    const marker = await readFile(markerPath, "utf8");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    const sourceFilesPresent = await materializedSourceFilesPresent(cacheRoot);
    if (marker.trim() === HARNESS_COMMIT && packageJson?.type === "module" && sourceFilesPresent) {
      return cacheRoot;
    }
  } catch {
    // Missing cache marker is expected on the first run.
  }

  await rm(cacheRoot, { recursive: true, force: true });
  await mkdir(cacheRoot, { recursive: true });
  await writeFile(packageJsonPath, `${JSON.stringify({ type: "module" }, null, 2)}\n`, "utf8");
  for (const sourceFile of SOURCE_FILES) {
    const contents = execGit(["-C", harnessRepo, "show", `${HARNESS_COMMIT}:${sourceFile}`]);
    const targetPath = resolve(cacheRoot, sourceFile);
    assertWithin(targetPath, cacheRoot);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, contents, "utf8");
  }
  await writeFile(markerPath, `${HARNESS_COMMIT}\n`, "utf8");
  return cacheRoot;
}

async function materializedSourceFilesPresent(cacheRoot) {
  for (const sourceFile of SOURCE_FILES) {
    try {
      await readFile(resolve(cacheRoot, sourceFile), "utf8");
    } catch {
      return false;
    }
  }
  return true;
}

async function writePlanMarkdown({ root, scenarioPath, outputPath, planOutputPath }) {
  const scenario = JSON.parse(await readFile(resolve(root, scenarioPath), "utf8"));
  const runtimeOutput = outputPath
    ? JSON.parse(await readFile(resolve(root, outputPath), "utf8"))
    : {};
  const targetPath = resolve(root, planOutputPath);
  assertRepoWritePath(targetPath, root);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, renderPlanMarkdown({ scenario, runtimeOutput }), "utf8");
}

function renderPlanMarkdown({ scenario, runtimeOutput }) {
  const plan = scenario.polish_plan || {};
  const roleSequence = Array.isArray(runtimeOutput.role_sequence) ? runtimeOutput.role_sequence : [];
  const roles = roleSequence.map((roleId) => ROLE_NAMES.get(roleId) || roleId).join(", ");
  const candidateAreas = list(plan.candidate_areas);
  const constraints = list(plan.constraints);
  const packages = Array.isArray(plan.packages) ? plan.packages : [];
  const selected = plan.next_recommended_package || {};
  const lines = [
    "# Tanchiki2 Polish Plan v1",
    "",
    "Generated by the deterministic Deep Agents stub-runtime scenario.",
    "",
    `- Runtime source: urkrass/agentic-harness@${HARNESS_COMMIT}`,
    `- Scenario: ${scenario.scenario_id || "unknown"}`,
    `- Runtime outcome: ${runtimeOutput.terminal_outcome || "unknown"}`,
    `- Evaluated at: ${runtimeOutput.evaluated_at || "2026-07-01T00:00:00.000Z"}`,
    `- Consulted roles: ${roles || "not recorded"}`,
    `- Trace events: ${runtimeOutput.trace_event_count ?? list(runtimeOutput.trace).length}`,
    "",
    "## Authority",
    "",
    "- This is a planning artifact only.",
    "- It grants no deployment, publish, release, merge, GitHub, Linear, provider, or external network authority.",
    "- Review Warden memory is evidence and context only.",
    "- Git artifacts remain authority.",
    "- Future packages must stop if open blocking P1/P2 Review Warden debt appears.",
    "",
    "## Candidate Areas",
    "",
    ...candidateAreas.map((item) => `- ${item}`),
    "",
    "## Constraints",
    "",
    ...constraints.map((item) => `- ${item}`),
    "",
    "## Bounded Future Packages",
    "",
  ];

  for (const item of packages) {
    lines.push(`### ${item.package_id} - ${item.title}`, "");
    lines.push(`- Primary areas: ${list(item.primary_areas).join(", ")}`);
    lines.push(`- Objective: ${item.objective}`);
    lines.push(`- Allowed changes: ${list(item.allowed_changes).join("; ")}`);
    lines.push(`- Out of scope: ${list(item.out_of_scope).join("; ")}`);
    lines.push(`- Required validation: ${list(item.validation).join("; ")}`);
    lines.push(`- Review Warden gate: ${item.review_warden_gate === true ? "required" : "not recorded"}`);
    lines.push("");
  }

  lines.push("## Next Package", "");
  lines.push(`- ${selected.package_id || "I9"} - ${selected.title || "Implement first bounded polish package selected from this plan."}`);
  lines.push("");
  lines.push("## Terminal Outcome", "");
  lines.push("- I8_TANCHIKI2_DEEP_AGENT_POLISH_PLAN_READY");
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function execGit(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = String(error.stderr || "").trim();
    const detail = stderr ? `: ${stderr}` : "";
    throw new Error(`Unable to materialize pinned Agentic Harness runtime${detail}`);
  }
}

function requireRepoPath(value, label) {
  const text = String(value || "").trim().replace(/\\/g, "/");
  if (!text || text.startsWith("/") || /^[a-zA-Z]:\//.test(text) || text.includes("../")) {
    throw new Error(`${label} must be a repository-relative path.`);
  }
  return text;
}

function assertRepoWritePath(targetPath, root) {
  assertWithin(targetPath, root);
  const normalized = targetPath.replace(/\\/g, "/").toLowerCase();
  if (
    normalized.includes("/.env") ||
    normalized.includes("/secrets/") ||
    normalized.includes("/credentials/") ||
    normalized.includes("/billing/") ||
    normalized.includes("/branch-protection/") ||
    normalized.includes("/production/") ||
    normalized.includes("/deployment/")
  ) {
    throw new Error("Refusing to write Deep Agents plan output to a sensitive path.");
  }
}

function assertWithin(targetPath, root) {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(targetPath);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Refusing path outside expected root: ${resolvedTarget}`);
  }
}

function list(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}
