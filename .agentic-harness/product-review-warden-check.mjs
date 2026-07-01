#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const INPUT_SCHEMA = "agentic_harness.product_review_warden_gate_input.v1";
const RESULT_SCHEMA = "agentic_harness.product_review_warden_cli_result.v1";
const GATE_RESULT_SCHEMA = "agentic_harness.product_review_warden_gate_result.v1";
const REVIEW_DEBT_SCHEMA = "agentic_harness.review_debt.v1";
const DEFAULT_INPUT = ".agentic-harness/review-warden-gate.json";
const COMPLETE_STATUSES = new Set(["COMPLETE"]);
const BLOCKING_SEVERITIES = new Set(["P0", "P1", "P2"]);
const VALID_SEVERITIES = new Set(["P0", "P1", "P2", "P3"]);

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const input = await loadGateInput(process.cwd(), options.input);
  const result = evaluateGate(input);
  const output = options.compact ? compactResult(result, options.input) : {
    ...result,
    schema_version: RESULT_SCHEMA,
    result_schema_version: result.schema_version,
    input_path: options.input,
  };

  if (options.stdout) {
    process.stdout.write(`${JSON.stringify(output, null, options.compact ? 0 : 2)}\n`);
  }

  if (options.check && !result.can_claim_complete) {
    throw new Error(`product Review Warden gate failed: ${result.finding_codes.join(", ")}`);
  }
}

function parseArgs(args) {
  const options = {
    input: DEFAULT_INPUT,
    check: true,
    compact: false,
    stdout: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const equalsIndex = arg.indexOf("=");
    const key = equalsIndex === -1 ? arg : arg.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? null : arg.slice(equalsIndex + 1);

    if (key === "--check") {
      if (inlineValue !== null) throw new Error("--check does not accept a value.");
      options.check = true;
      continue;
    }
    if (key === "--compact") {
      if (inlineValue !== null) throw new Error("--compact does not accept a value.");
      options.compact = true;
      continue;
    }
    if (key === "--stdout") {
      if (inlineValue !== null) throw new Error("--stdout does not accept a value.");
      options.stdout = true;
      continue;
    }
    if (key !== "--input") {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const value = inlineValue ?? args[index + 1];
    if (value === undefined) throw new Error("--input requires a path.");
    if (inlineValue === null) index += 1;
    options.input = requireText(value, "input");
  }

  return options;
}

async function loadGateInput(root, inputPath) {
  const input = await readJson(root, inputPath);
  if (!isObject(input) || input.schema_version !== INPUT_SCHEMA) return input;

  const memoryRefs = isObject(input.memory_refs) ? input.memory_refs : {};
  let reviewDebt = input.review_debt;
  let closeoutClaim = input.closeout_claim;
  const resolvedMemoryRefs = [];

  let reviewDebtPath = text(memoryRefs.review_debt_path);
  let closeoutClaimPath = text(memoryRefs.closeout_claim_path || memoryRefs.closeout_memory_path);
  const memoryLedgerPath = text(memoryRefs.memory_ledger_path);

  if (memoryLedgerPath) {
    const ledger = await readJson(root, memoryLedgerPath);
    reviewDebtPath ||= ledgerRecordPath(ledger, "review_debt");
    closeoutClaimPath ||= ledgerRecordPath(ledger, "closeout_claim");
    resolvedMemoryRefs.push(memoryLedgerPath);
  }

  if (!isObject(reviewDebt) && reviewDebtPath) {
    reviewDebt = await readJson(root, reviewDebtPath);
    resolvedMemoryRefs.push(reviewDebtPath);
  }
  if (!isObject(closeoutClaim) && closeoutClaimPath) {
    closeoutClaim = await readJson(root, closeoutClaimPath);
    resolvedMemoryRefs.push(closeoutClaimPath);
  }

  return {
    ...input,
    review_debt: reviewDebt,
    closeout_claim: closeoutClaim,
    resolved_memory_refs: unique([
      ...stringList(input.resolved_memory_refs),
      ...resolvedMemoryRefs,
    ]),
  };
}

function evaluateGate(input) {
  const findings = [];

  if (!isObject(input)) {
    findings.push(finding("PRODUCT_REVIEW_WARDEN_INPUT_OBJECT_REQUIRED", "product Review Warden input must be an object"));
    return gateResult(input, {}, {}, emptyDebtResult(), findings);
  }

  if (input.schema_version !== INPUT_SCHEMA) {
    findings.push(finding("PRODUCT_REVIEW_WARDEN_INPUT_SCHEMA_VERSION_INVALID", `must equal ${INPUT_SCHEMA}`, "$.schema_version"));
  }

  const productRepository = normalizeRepository(input.product_repository ?? input.repository);
  if (!productRepository.repository) {
    findings.push(finding("PRODUCT_REPOSITORY_REQUIRED", "product repository is required", "$.product_repository.repository"));
  }

  const closeoutClaim = normalizeCloseoutClaim(input.closeout_claim);
  if (!isObject(input.closeout_claim)) {
    findings.push(finding("CLOSEOUT_CLAIM_REQUIRED", "product Review Warden gate requires a closeout_claim", "$.closeout_claim"));
  }

  const reviewDebtResult = evaluateReviewDebt(input.review_debt, closeoutClaim);
  findings.push(...reviewDebtResult.findings);

  const targetStatus = text(closeoutClaim.target_status);
  if (COMPLETE_STATUSES.has(targetStatus) && reviewDebtResult.open_blocking_debt_ids.length > 0) {
    findings.push(finding(
      "PRODUCT_COMPLETE_BLOCKED_BY_REVIEW_WARDEN",
      "product package COMPLETE is blocked while unresolved P1/P2 review debt remains",
      "$.closeout_claim",
    ));
  }

  if (
    COMPLETE_STATUSES.has(targetStatus) &&
    closeoutClaim.validation.green === true &&
    closeoutClaim.review_debt_scan.performed !== true
  ) {
    findings.push(finding(
      "GREEN_VALIDATION_WITHOUT_REVIEW_WARDEN_GATE_NOT_ENOUGH",
      "green validation alone is not enough; product COMPLETE requires Review Warden scan evidence",
      "$.closeout_claim.validation",
    ));
  }

  return gateResult(input, productRepository, closeoutClaim, reviewDebtResult, findings);
}

function evaluateReviewDebt(reviewDebt, closeoutClaim) {
  const findings = [];
  const openBlockingDebtIds = [];
  let closedByLinkedRepairCount = 0;
  let closedByHumanWaiverCount = 0;
  let convertedToRepairWorkCount = 0;
  const allCommentIds = [];

  if (!isObject(reviewDebt)) {
    return {
      findings: [finding("REVIEW_DEBT_OBJECT_REQUIRED", "review debt memory must be an object", "$.review_debt")],
      open_blocking_debt_ids: openBlockingDebtIds,
      closed_by_linked_repair_count: closedByLinkedRepairCount,
      closed_by_human_waiver_count: closedByHumanWaiverCount,
      converted_to_repair_work_count: convertedToRepairWorkCount,
      all_comment_ids: allCommentIds,
    };
  }

  if (reviewDebt.schema_version !== REVIEW_DEBT_SCHEMA) {
    findings.push(finding("REVIEW_DEBT_SCHEMA_VERSION_INVALID", `must equal ${REVIEW_DEBT_SCHEMA}`, "$.review_debt.schema_version"));
  }

  const debtItems = Array.isArray(reviewDebt.debt_items) ? reviewDebt.debt_items : [];
  if (!Array.isArray(reviewDebt.debt_items)) {
    findings.push(finding("REVIEW_DEBT_ITEMS_REQUIRED", "review debt memory must include debt_items", "$.review_debt.debt_items"));
  }

  for (const [index, debt] of debtItems.entries()) {
    const path = `$.review_debt.debt_items[${index}]`;
    if (!isObject(debt)) {
      findings.push(finding("REVIEW_DEBT_ITEM_OBJECT_REQUIRED", "review debt item must be an object", path));
      addOpen(openBlockingDebtIds, `debt-${index}`);
      continue;
    }

    const debtId = text(debt.debt_id);
    const commentId = text(debt.comment_id);
    const severity = text(debt.severity).toUpperCase();
    const status = text(debt.status) || "open";
    const severityValid = VALID_SEVERITIES.has(severity);
    const blockingValid = typeof debt.blocking === "boolean";
    const blocking = debt.blocking === true || (severityValid && BLOCKING_SEVERITIES.has(severity));
    const itemDebtId = debtId || commentId || `debt-${index}`;

    requireField(findings, debtId, "debt_id", `${path}.debt_id`);
    requireField(findings, commentId, "comment_id", `${path}.comment_id`);
    requireField(findings, debt.source_pr, "source_pr", `${path}.source_pr`);
    requireField(findings, debt.summary, "summary", `${path}.summary`);
    if (!severityValid) findings.push(finding("REVIEW_DEBT_SEVERITY_INVALID", "review debt severity must be P0, P1, P2, or P3", `${path}.severity`));
    if (!blockingValid) findings.push(finding("REVIEW_DEBT_BLOCKING_INVALID", "review debt blocking must be a boolean", `${path}.blocking`));
    if (commentId) allCommentIds.push(commentId);

    if (status === "open") {
      if (blocking) {
        addOpen(openBlockingDebtIds, itemDebtId);
        findings.push(finding("OPEN_REVIEW_DEBT_BLOCKS_COMPLETE", "unresolved blocking review debt prevents COMPLETE", path));
      }
      continue;
    }

    if (status !== "closed") {
      findings.push(finding("REVIEW_DEBT_STATUS_INVALID", "review debt status must be open or closed", `${path}.status`));
      if (blocking) addOpen(openBlockingDebtIds, itemDebtId);
      continue;
    }

    const closure = isObject(debt.closure) ? debt.closure : {};
    const linkedDebtIds = new Set(stringList(closure.linked_debt_ids));
    const linkedCommentIds = new Set(stringList(closure.linked_comment_ids));
    const exactLink = linkedDebtIds.has(debtId) || linkedCommentIds.has(commentId);
    const closureKind = text(closure.kind);

    if (closureKind === "repair_pr") {
      if (!positiveInteger(closure.repair_pr) || !exactLink || !text(closure.evidence_ref)) {
        findings.push(finding("REPAIR_PR_CLOSURE_REQUIRES_EXACT_REVIEW_DEBT_LINK", "repair PR closure must link exact review debt and evidence", `${path}.closure`));
        if (blocking) addOpen(openBlockingDebtIds, itemDebtId);
      } else {
        closedByLinkedRepairCount += 1;
      }
      continue;
    }

    if (closureKind === "human_waiver") {
      const validWaiver = closure.explicit_waiver === true &&
        text(closure.authority) === "human" &&
        text(closure.approver) &&
        text(closure.reason) &&
        text(closure.evidence_ref) &&
        isIsoTimestamp(closure.waived_at);
      if (!validWaiver) {
        findings.push(finding("HUMAN_WAIVER_REQUIRES_EXPLICIT_EVIDENCE", "human waiver closure requires explicit evidence", `${path}.closure`));
        if (blocking) addOpen(openBlockingDebtIds, itemDebtId);
      } else {
        closedByHumanWaiverCount += 1;
      }
      continue;
    }

    if (closureKind === "repair_work") {
      const linkedWorkEvidence = text(closure.linked_issue) || positiveInteger(closure.linked_pr) || text(closure.linked_package);
      if (!exactLink || !linkedWorkEvidence || !text(closure.evidence_ref)) {
        findings.push(finding("REPAIR_WORK_CLOSURE_REQUIRES_LINKED_WORK_EVIDENCE", "repair work closure must link exact debt and work evidence", `${path}.closure`));
        if (blocking) addOpen(openBlockingDebtIds, itemDebtId);
      } else {
        convertedToRepairWorkCount += 1;
      }
      continue;
    }

    findings.push(finding("REVIEW_DEBT_CLOSURE_KIND_INVALID", "closed review debt must have a recognized closure kind", `${path}.closure.kind`));
    if (blocking) addOpen(openBlockingDebtIds, itemDebtId);
  }

  validateReviewDebtScan(findings, closeoutClaim, allCommentIds);

  return {
    findings,
    open_blocking_debt_ids: openBlockingDebtIds,
    closed_by_linked_repair_count: closedByLinkedRepairCount,
    closed_by_human_waiver_count: closedByHumanWaiverCount,
    converted_to_repair_work_count: convertedToRepairWorkCount,
    all_comment_ids: allCommentIds,
  };
}

function validateReviewDebtScan(findings, closeoutClaim, allCommentIds) {
  if (!COMPLETE_STATUSES.has(text(closeoutClaim.target_status))) return;

  const scan = isObject(closeoutClaim.review_debt_scan) ? closeoutClaim.review_debt_scan : {};
  if (scan.performed !== true) {
    findings.push(finding("REVIEW_DEBT_SCAN_REQUIRED_FOR_COMPLETE", "COMPLETE requires an explicit review-debt scan", "$.closeout_claim.review_debt_scan"));
    return;
  }
  if (!text(scan.evidence_ref)) {
    findings.push(finding("REVIEW_DEBT_SCAN_EVIDENCE_REQUIRED", "review-debt scan must include an evidence ref", "$.closeout_claim.review_debt_scan.evidence_ref"));
  }

  const scanned = new Set(stringList(scan.scanned_comment_ids));
  for (const commentId of allCommentIds) {
    if (!scanned.has(commentId)) {
      findings.push(finding("REVIEW_DEBT_SCAN_INCOMPLETE", `review-debt scan did not include comment ${commentId}`, "$.closeout_claim.review_debt_scan.scanned_comment_ids"));
    }
  }
}

function gateResult(input, productRepository, closeoutClaim, reviewDebtResult, findings) {
  const targetStatus = text(closeoutClaim.target_status);
  const gatePassed = findings.length === 0;
  const canClaimComplete = COMPLETE_STATUSES.has(targetStatus) && gatePassed;
  return {
    schema_version: GATE_RESULT_SCHEMA,
    case_id: text(input?.case_id) || text(input?.gate_id) || "product-review-warden-gate",
    product_repository: productRepository,
    package: {
      package_id: text(closeoutClaim.package_id),
      target_status: targetStatus,
    },
    gate_passed: gatePassed,
    can_claim_complete: canClaimComplete,
    terminal_outcome: canClaimComplete
      ? "PRODUCT_REVIEW_WARDEN_COMPLETE_ALLOWED"
      : "PRODUCT_REVIEW_WARDEN_COMPLETE_BLOCKED",
    finding_codes: findings.map((item) => item.code),
    findings,
    review_debt_summary: {
      open_blocking_count: reviewDebtResult.open_blocking_debt_ids.length,
      open_blocking_debt_ids: reviewDebtResult.open_blocking_debt_ids,
      closed_by_linked_repair_count: reviewDebtResult.closed_by_linked_repair_count,
      closed_by_human_waiver_count: reviewDebtResult.closed_by_human_waiver_count,
      converted_to_repair_work_count: reviewDebtResult.converted_to_repair_work_count,
      scanned_comment_count: stringList(closeoutClaim.review_debt_scan?.scanned_comment_ids).length,
    },
    evidence_refs: unique([
      text(closeoutClaim.review_debt_scan?.evidence_ref),
      ...stringList(input?.resolved_memory_refs),
    ]),
    authority: {
      memory_is_authority: false,
      git_artifacts_remain_authority: true,
      review_debt_blocks_complete: true,
      merge_authority: false,
      live_github_calls: false,
      live_linear_calls: false,
      provider_calls: false,
      product_repo_mutation: false,
      unattended_execution_authorized: false,
    },
  };
}

function compactResult(result, inputPath) {
  return {
    schema_version: RESULT_SCHEMA,
    result_schema_version: result.schema_version,
    input_path: inputPath,
    can_claim_complete: result.can_claim_complete,
    terminal_outcome: result.terminal_outcome,
    gate_passed: result.gate_passed,
    finding_codes: result.finding_codes,
    review_debt_summary: result.review_debt_summary,
  };
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

function ledgerRecordPath(ledger, kind) {
  const aliases = kind === "closeout_claim"
    ? new Set(["closeout_claim", "closeout_memory"])
    : new Set([kind]);
  const records = Array.isArray(ledger?.records) ? ledger.records : [];
  const record = records.find((item) => aliases.has(text(item?.kind ?? item?.memory_kind ?? item?.type)));
  return text(record?.path ?? record?.file ?? record?.memory_path ?? record?.ref);
}

function normalizeRepository(value) {
  return {
    repository: text(value?.repository ?? value?.full_name),
    adapter_path: text(value?.adapter_path),
    memory_root: text(value?.memory_root ?? ".agentic-harness/memory"),
  };
}

function normalizeCloseoutClaim(value) {
  const source = isObject(value) ? value : {};
  return {
    ...source,
    package_id: text(source.package_id),
    target_status: text(source.target_status),
    validation: isObject(source.validation) ? source.validation : {},
    review_debt_scan: isObject(source.review_debt_scan) ? source.review_debt_scan : {},
  };
}

function emptyDebtResult() {
  return {
    open_blocking_debt_ids: [],
    closed_by_linked_repair_count: 0,
    closed_by_human_waiver_count: 0,
    converted_to_repair_work_count: 0,
  };
}

function finding(code, message, path = "$") {
  return { code, message, path };
}

function requireField(findings, value, label, path) {
  if (!text(value)) findings.push(finding(`${label.toUpperCase()}_REQUIRED`, `${label} is required`, path));
}

function requireText(value, label) {
  const result = text(value);
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function addOpen(items, debtId) {
  if (!items.includes(debtId)) items.push(debtId);
}

function positiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isIsoTimestamp(value) {
  const candidate = text(value);
  return Boolean(candidate) && !Number.isNaN(Date.parse(candidate)) && /^\d{4}-\d{2}-\d{2}T/.test(candidate);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringList(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function text(value) {
  return value == null ? "" : String(value).trim();
}
