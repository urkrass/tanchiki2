#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";

const ROOT = new URL("./", import.meta.url);
const REQUIRED_LOCAL_FILES = [
  "project-adapter.yml",
  "agentic-harness.lock.json",
  "validation-profile.yml",
  "resource-locks.yml",
  "human-gates.yml",
  "SMOKE_CHECKLIST.md",
];
const COMMANDS = new Set(["validate", "smoke", "run", "review", "pin-bump"]);
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

if (command === "validate") {
  console.log("consumer wrapper contract validated");
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
