import { processSubmission } from "./filter_raw.js";
import { processFilteredInfo } from "./action_filtered.js";
import { runQuery } from "../neo4j.js";

const queue = [];
let isRunning = false;
let hasRecoveredStuckSubmissions = false;

const claimNextSubmission = async () => {
  const result = await runQuery(
    `
    MATCH (r:RawSubmission)
    WHERE r.processing_status = 'pending'
    WITH r ORDER BY r.created_at ASC LIMIT 1
    SET r.processing_status = 'processing'
    RETURN r.id AS id, 'submission' AS type
    `
  );
  const record = result.records[0];
  return record ? { id: record.get("id"), type: record.get("type") } : null;
};

const claimNextFilteredInfo = async () => {
  const result = await runQuery(
    `
    MATCH (f:FilteredInformation)
    WHERE f.processing_status = 'pending'
    WITH f ORDER BY f.created_at ASC LIMIT 1
    SET f.processing_status = 'processing'
    RETURN f.id AS id, 'filtered_info' AS type
    `
  );
  const record = result.records[0];
  return record ? { id: record.get("id"), type: record.get("type") } : null;
};

const claimNextItem = async () => {
  // Try to claim a submission first, then filtered info
  let item = await claimNextSubmission();
  if (!item) {
    item = await claimNextFilteredInfo();
  }
  return item;
};

const recoverStuckSubmissions = async () => {
  if (hasRecoveredStuckSubmissions) return;

  console.log("Checking for stuck submissions and filtered info...");

  // Recover stuck RawSubmissions
  const submissionResult = await runQuery(
    `
    MATCH (r:RawSubmission)
    WHERE r.processing_status = 'processing'
    SET r.processing_status = 'pending'
    RETURN r.id AS id
    `
  );

  const stuckSubmissions = submissionResult.records
    .map((record) => record.get("id"))
    .filter((id) => id);

  // Recover stuck FilteredInformation
  const filteredInfoResult = await runQuery(
    `
    MATCH (f:FilteredInformation)
    WHERE f.processing_status = 'processing'
    SET f.processing_status = 'pending'
    RETURN f.id AS id
    `
  );

  const stuckFilteredInfo = filteredInfoResult.records
    .map((record) => record.get("id"))
    .filter((id) => id);

  const totalStuck = stuckSubmissions.length + stuckFilteredInfo.length;

  if (totalStuck > 0) {
    console.log(
      `Found ${stuckSubmissions.length} stuck submissions and ${stuckFilteredInfo.length} stuck filtered info, reset to pending status`
    );
  } else {
    console.log("No stuck items found");
  }

  hasRecoveredStuckSubmissions = true;
};

const runNext = async () => {
  if (isRunning) return;

  const next = queue.shift();
  if (next) {
    isRunning = true;
    try {
      if (next.type === 'submission') {
        await processSubmission(next.submissionId);
      } else if (next.type === 'filtered_info') {
        await processFilteredInfo(next.filteredInfoId);
      }
      next.resolve();
    } catch (error) {
      next.reject(error);
    } finally {
      isRunning = false;
      if (queue.length) {
        setImmediate(runNext);
      }
    }
    return;
  }

  const claimedItem = await claimNextItem();
  if (!claimedItem) return;

  isRunning = true;
  try {
    if (claimedItem.type === 'submission') {
      await processSubmission(claimedItem.id);
    } else if (claimedItem.type === 'filtered_info') {
      await processFilteredInfo(claimedItem.id);
    }
  } catch (error) {
    console.error(`Background ${claimedItem.type} processing failed:`, error);
  } finally {
    isRunning = false;
    setImmediate(runNext);
  }
};

export const enqueueSubmission = (submissionId) =>
  new Promise((resolve, reject) => {
    queue.push({
      submissionId,
      type: 'submission',
      resolve,
      reject,
    });
    setImmediate(runNext);
  });

export const enqueueFilteredInfo = (filteredInfoId) =>
  new Promise((resolve, reject) => {
    queue.push({
      filteredInfoId,
      type: 'filtered_info',
      resolve,
      reject,
    });
    setImmediate(runNext);
  });

export const startSubmissionWorker = async () => {
  // Recover any stuck submissions on startup
  await recoverStuckSubmissions();

  const pollIntervalMs = Number.parseInt(
    process.env.PROCESS_QUEUE_POLL_MS || "5000",
    10
  );
  setInterval(
    () => {
      if (!isRunning) {
        runNext().catch((error) =>
          console.error("Queue polling failed:", error)
        );
      }
    },
    Number.isFinite(pollIntervalMs) ? pollIntervalMs : 5000
  );
  setImmediate(runNext);
};
