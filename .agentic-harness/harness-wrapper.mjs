#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";

const ROOT = new URL("./", import.meta.url);
const REPO_ROOT = decodeURIComponent(ROOT.pathname).replace(/\/$/, "").endsWith("/.agentic-harness")
  ? new URL("../", ROOT)
  : ROOT;
const REQUIRED_LOCAL_FILES = [
  "project-adapter.yml",
  "agentic-harness.lock.json",
  "validation-profile.yml",
  "resource-locks.yml",
  "human-gates.yml",
  "SMOKE_CHECKLIST.md",
];
const COMMANDS = new Set(["validate", "smoke", "run", "review", "pin-bump", "deep-agent-stub-runtime"]);
const REQUIRED_MEMORY_KINDS = [
  "project_memory",
  "role_memory",
  "review_debt",
  "validation_memory",
  "closeout_memory",
];
const UNSAFE_COMMANDS = new Set([
  "deploy",
  "dashboard",
  "billing",
  "branch-protection",
  "production-settings",
  "secrets",
]);
const FLOATING_REFS = new Set([
  "latest",
  "main",
  "master",
  "head",
  "default",
  "origin/main",
  "origin/master",
  "refs/heads/main",
  "refs/heads/master",
  "refs/tags/latest",
]);

const command = process.argv[2] ?? "validate";

if (!COMMANDS.has(command) || UNSAFE_COMMANDS.has(command)) {
  throw new Error(`Unsupported or unsafe wrapper command: ${command}`);
}

await assertLocalKitFilesPresent();
const lockfile = await readJson(new URL("agentic-harness.lock.json", ROOT));
assertPinnedLockfile(lockfile);
const persistentMemory = await assertPersistentMemory(lockfile);
const deepAgentsStubRuntime = await assertDeepAgentsStubRuntime(lockfile);

if (command === "validate") {
  console.log("consumer wrapper contract validated");
} else if (command === "review") {
  console.log(`consumer wrapper review memory validated; dispatch ${persistentMemory.review_command}`);
} else if (command === "deep-agent-stub-runtime") {
  console.log(`consumer wrapper deep agent stub runtime validated; dispatch ${deepAgentsStubRuntime.run_command}`);
} else {
  console.log(`consumer wrapper accepted ${command}; dispatch pinned core from lockfile`);
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function assertLocalKitFilesPresent() {
  const missing = [];

  for (const file of REQUIRED_LOCAL_FILES) {
    try {
      await access(new URL(file, ROOT));
    } catch {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing local consumer bootstrap files: ${missing.join(", ")}`);
  }
}

function assertPinnedLockfile(lockfile) {
  const ref = String(lockfile?.core?.ref ?? "").trim().toLowerCase();
  if (lockfile?.schema_version !== "agentic_harness.consumer_lock.v1") {
    throw new Error("Lockfile schema_version must be agentic_harness.consumer_lock.v1");
  }
  if (!ref || FLOATING_REFS.has(ref) || ref.startsWith("refs/heads/")) {
    throw new Error("Lockfile core.ref must be pinned and must not use latest/main/master/head");
  }
  if (!lockfile?.core?.resolved_commit) {
    throw new Error("Lockfile core.resolved_commit is required");
  }
  if (lockfile?.pin_bump_policy?.forbids_dynamic_latest !== true) {
    throw new Error("Lockfile must forbid dynamic latest consumption");
  }
}

async function assertPersistentMemory(lockfile) {
  const memory = lockfile?.persistent_memory;
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Lockfile persistent_memory must be present");
  }
  if (memory.required !== true) {
    throw new Error("Lockfile persistent_memory.required must be true");
  }

  assertMemoryAuthority(memory.authority);

  const records = collectMemoryRecords(memory);
  const filesToCheck = [];
  const gatePath = requirePath(memory.review_warden_gate_path, "persistent_memory.review_warden_gate_path");
  filesToCheck.push(gatePath);

  if (memory.memory_ledger_path) {
    const ledgerPath = requirePath(memory.memory_ledger_path, "persistent_memory.memory_ledger_path");
    filesToCheck.push(ledgerPath);
    try {
      await access(repoUrl(ledgerPath));
      const ledger = await readJson(repoUrl(ledgerPath));
      records.push(...collectMemoryRecords(ledger));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const refsByKind = new Map();
  for (const record of records) {
    const kind = normalizeMemoryKind(record.kind ?? record.memory_kind ?? record.type);
    const path = requirePath(record.path ?? record.file ?? record.memory_path ?? record.ref, `persistent_memory.records.${kind || "unknown"}`);
    if (kind) refsByKind.set(kind, path);
  }

  const missingKinds = REQUIRED_MEMORY_KINDS.filter((kind) => !refsByKind.has(kind));
  if (missingKinds.length > 0) {
    throw new Error(`Missing persistent memory references: ${missingKinds.join(", ")}`);
  }

  for (const path of refsByKind.values()) filesToCheck.push(path);

  const missingFiles = [];
  for (const path of unique(filesToCheck)) {
    try {
      await access(repoUrl(path));
    } catch {
      missingFiles.push(path);
    }
  }
  if (missingFiles.length > 0) {
    throw new Error(`Missing persistent memory files: ${missingFiles.join(", ")}`);
  }

  const reviewDebtCheck = memory.review_debt_check ?? {};
  if (reviewDebtCheck.blocks_complete !== true) {
    throw new Error("persistent_memory.review_debt_check.blocks_complete must be true");
  }
  if (reviewDebtCheck.green_validation_requires_scan !== true) {
    throw new Error("persistent_memory.review_debt_check.green_validation_requires_scan must be true");
  }

  return {
    review_command: requirePath(reviewDebtCheck.command, "persistent_memory.review_debt_check.command"),
  };
}

async function assertDeepAgentsStubRuntime(lockfile) {
  const stub = lockfile?.deep_agents_stub_runtime;
  if (!stub || typeof stub !== "object" || Array.isArray(stub)) {
    throw new Error("Lockfile deep_agents_stub_runtime must be present");
  }
  if (stub.required !== true) {
    throw new Error("deep_agents_stub_runtime.required must be true");
  }
  const resolvedCommit = String(lockfile?.core?.resolved_commit ?? "").trim();
  const sourceCommit = String(stub?.source?.resolved_commit ?? "").trim();
  if (!sourceCommit || sourceCommit !== resolvedCommit) {
    throw new Error("deep_agents_stub_runtime source commit must match lockfile core.resolved_commit");
  }
  for (const [field, expected] of [
    ["network_allowed", false],
    ["provider_calls_allowed", false],
    ["external_mutations_allowed", false],
    ["deployment_or_publish_authority", false],
    ["product_source_mutation_allowed", false],
    ["memory_is_authority", false],
    ["git_artifacts_remain_authority", true],
  ]) {
    if (stub[field] !== expected) {
      throw new Error(`deep_agents_stub_runtime.${field} must be ${expected}`);
    }
  }

  const requiredPaths = [
    requirePath(stub.runtime_profile_path, "deep_agents_stub_runtime.runtime_profile_path"),
    requirePath(stub.scenario_path, "deep_agents_stub_runtime.scenario_path"),
    requirePath(stub.output_path, "deep_agents_stub_runtime.output_path"),
    requirePath(stub.plan_output_path, "deep_agents_stub_runtime.plan_output_path"),
  ];
  const missingFiles = [];
  for (const path of requiredPaths) {
    try {
      await access(repoUrl(path));
    } catch {
      missingFiles.push(path);
    }
  }
  if (missingFiles.length > 0) {
    throw new Error(`Missing Deep Agents stub runtime files: ${missingFiles.join(", ")}`);
  }

  return {
    run_command: requirePath(stub.run_command, "deep_agents_stub_runtime.run_command"),
  };
}

function assertMemoryAuthority(authority) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    throw new Error("persistent_memory.authority must be present");
  }
  if (authority.memory_is_authority !== false) {
    throw new Error("persistent memory cannot be authority over Git artifacts");
  }
  if (authority.git_artifacts_remain_authority !== true) {
    throw new Error("Git artifacts must remain authority");
  }
  if (
    authority.memory_grants_merge_authority !== false ||
    authority.memory_grants_review_authority !== false ||
    authority.memory_grants_validation_authority !== false
  ) {
    throw new Error("persistent memory cannot grant merge, review, or validation authority");
  }
}

function collectMemoryRecords(source = {}) {
  const records = [];
  if (Array.isArray(source.records)) records.push(...source.records);
  if (Array.isArray(source.entries)) records.push(...source.entries);
  if (source.paths && typeof source.paths === "object" && !Array.isArray(source.paths)) {
    for (const kind of REQUIRED_MEMORY_KINDS) {
      if (source.paths[kind]) {
        records.push({ kind, path: source.paths[kind], required: true });
      }
    }
  }
  return records;
}

function normalizeMemoryKind(value) {
  const kind = String(value ?? "").trim();
  if (kind === "closeout_claim") return "closeout_memory";
  return REQUIRED_MEMORY_KINDS.includes(kind) ? kind : "";
}

function requirePath(value, label) {
  const path = String(value ?? "").trim();
  if (!path) throw new Error(`${label} is required`);
  return path;
}

function repoUrl(relativePath) {
  const normalized = String(relativePath ?? "").replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.includes("../")) {
    throw new Error(`Unsafe repository-relative path: ${relativePath}`);
  }
  return new URL(normalized, REPO_ROOT);
}

function unique(values) {
  return [...new Set(values)];
}
