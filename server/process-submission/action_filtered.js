import crypto from "crypto";
import { runQuery, toSingleNode } from "../neo4j.js";
import { getActionablePrompt } from "./prompts/actionable_prompt.js";
import { callLLM } from "./index.js";

// Constants
const PROCESSING_STATUSES = {
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

const TEAMS = ["HR", "Finance", "Research"];
const URGENCY_LEVELS = ["critical", "high", "medium", "low"];
const ACTION_ITEM_STATUS = {
  PENDING: "pending",
};

// Schema definition
const ACTION_SCHEMA = {
  type: "object",
  properties: {
    action_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task_name: {
            type: "string",
            description: "Clear actionable title (max 60 chars)",
          },
          summary_points: {
            type: "array",
            items: {
              type: "string",
            },
            description: "4-6 bullet points for executive brief",
          },
          owner: {
            type: "string",
            description: "Who should execute",
          },
          due_date: {
            type: "string",
            description: "ISO date or null",
            nullable: true,
          },
          team: {
            type: "string",
            enum: TEAMS,
          },
          urgency: {
            type: "string",
            enum: URGENCY_LEVELS,
          },
        },
        required: ["task_name", "summary_points", "owner", "team", "urgency"],
      },
    },
  },
  required: ["action_items"],
};

/**
 * Fetches filtered information by ID
 * @param {string} filteredInfoId - The ID of the filtered information to fetch
 * @returns {Promise<Object>} The filtered information object
 * @throws {Error} If filtered information is not found
 */
const fetchFilteredInfo = async (filteredInfoId) => {
  const filteredInfoResult = await runQuery(
    `MATCH (f:FilteredInformation { id: $filteredInfoId }) RETURN f`,
    { filteredInfoId }
  );

  const filteredInfo = toSingleNode(filteredInfoResult, "f");
  if (!filteredInfo) {
    throw new Error("FilteredInformation not found");
  }

  return filteredInfo;
};

/**
 * Updates the processing status of filtered information
 * @param {string} filteredInfoId - The ID of the filtered information
 * @param {string} status - The new status
 * @param {Object} additionalFields - Additional fields to update
 */
const updateFilteredInfoStatus = async (
  filteredInfoId,
  status,
  additionalFields = {}
) => {
  const fields = Object.entries(additionalFields)
    .map(([key, _]) => `f.${key} = $${key}`)
    .join(", ");

  const setClause = fields
    ? `SET f.processing_status = $status, ${fields}`
    : `SET f.processing_status = $status`;

  await runQuery(
    `MATCH (f:FilteredInformation { id: $filteredInfoId }) ${setClause}`,
    {
      filteredInfoId,
      status,
      ...additionalFields,
    }
  );
};

/**
 * Safely parses potential action items from JSON string
 * @param {string} potentialActionItemsJson - JSON string of potential action items
 * @returns {Array} Parsed action items array or empty array if parsing fails
 */
const parsePotentialActionItems = (potentialActionItemsJson) => {
  try {
    return JSON.parse(potentialActionItemsJson || "[]");
  } catch (error) {
    console.error("Failed to parse potential_action_items:", error);
    return [];
  }
};

/**
 * Creates the prompt for LLM action item generation
 * @param {Object} filteredInfo - The filtered information object
 * @param {Array} potentialActionItems - Array of potential action items
 * @returns {string} The formatted prompt for LLM
 */
const createActionPrompt = (filteredInfo, potentialActionItems) => {
  const teamsString = Array.isArray(filteredInfo.teams_involved)
    ? filteredInfo.teams_involved.join(", ")
    : filteredInfo.teams_involved || "Unknown";

  return `Based on this filtered information, create action items requiring Founder approval:

Title: ${filteredInfo.title}
Summary: ${filteredInfo.summary}
Priority: ${filteredInfo.strategic_priority}
Teams: ${teamsString}

Structured Notes:
${filteredInfo.structured_notes}

Potential Action Items:
${JSON.stringify(potentialActionItems, null, 2)}`;
};

/**
 * Processes action items through LLM
 * @param {Object} filteredInfo - The filtered information object
 * @param {Array} potentialActionItems - Array of potential action items
 * @returns {Promise<Object>} The LLM result with action items
 */
const generateActionItems = async (filteredInfo, potentialActionItems) => {
  const currentDate = new Date().toISOString().split("T")[0];
  const actionPrompt = createActionPrompt(filteredInfo, potentialActionItems);

  const actionResult = await callLLM(
    getActionablePrompt(currentDate),
    actionPrompt,
    "create_action_items",
    ACTION_SCHEMA
  );

  if (!actionResult) {
    throw new Error("Failed to generate action items through LLM");
  }

  return actionResult;
};

/**
 * Maps urgency level to priority and importance values
 * @param {string} urgency - The urgency level
 * @returns {Object} Object containing priority and importance values
 */
const mapUrgencyToValues = (urgency) => {
  const urgencyMap = {
    critical: { priority: "high", importance: 10 },
    high: { priority: "high", importance: 8 },
    medium: { priority: "medium", importance: 5 },
    low: { priority: "low", importance: 3 },
  };

  return urgencyMap[urgency] || urgencyMap.low;
};

/**
 * Creates a single action item in the database
 * @param {Object} item - The action item data from LLM
 * @param {string} filteredInfoId - The filtered information ID
 * @param {Object} filteredInfo - The filtered information object
 * @returns {Promise<void>}
 */
const createActionItem = async (item, filteredInfoId, filteredInfo) => {
  const { priority, importance } = mapUrgencyToValues(item.urgency);
  const actionItemId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await runQuery(
    `
    MATCH (f:FilteredInformation { id: $filteredInfoId })
    OPTIONAL MATCH (r:RawSubmission { id: $rawSubmissionId })
    CREATE (a:ActionItem {
      id: $actionItemId,
      created_at: $createdAt,
      updated_at: $createdAt,
      title: $title,
      summary: $summary,
      details: $details,
      priority: $priority,
      importance: $importance,
      deadline: $deadline,
      status: $status,
      source: $source,
      raw_submission_id: $rawSubmissionId,
      filtered_info_id: $filteredInfoId
    })
    CREATE (a)-[:GENERATED_FROM]->(f)
    FOREACH (submission IN CASE WHEN r IS NOT NULL THEN [r] ELSE [] END |
      CREATE (a)-[:ORIGINATES_FROM]->(submission)
    )
    `,
    {
      actionItemId,
      createdAt,
      title: item.task_name,
      summary: `• ${item.summary_points.join("\n• ")}`,
      details: `**Owner:** ${item.owner}\n**Team:** ${item.team}\n\n${filteredInfo.structured_notes}`,
      priority,
      importance,
      deadline: item.due_date || null,
      status: ACTION_ITEM_STATUS.PENDING,
      source: filteredInfo.title || "FilteredInformation",
      rawSubmissionId: filteredInfo.raw_submission_id,
      filteredInfoId,
    }
  );
};

/**
 * Creates multiple action items in the database
 * @param {Array} actionItems - Array of action item data from LLM
 * @param {string} filteredInfoId - The filtered information ID
 * @param {Object} filteredInfo - The filtered information object
 * @returns {Promise<number>} Number of action items created
 */
const createActionItems = async (actionItems, filteredInfoId, filteredInfo) => {
  let actionItemsCreated = 0;

  if (actionItems?.length) {
    for (const item of actionItems) {
      await createActionItem(item, filteredInfoId, filteredInfo);
      actionItemsCreated += 1;
    }
  }

  return actionItemsCreated;
};

// /**
//  * Main function to process filtered information and generate actionable items
//  * @param {string} filteredInfoId - The ID of the filtered information to process
//  * @returns {Promise<Object>} Processing result with success status and metadata
//  */
// export const processFilteredInfo = async (filteredInfoId) => {
//   if (!filteredInfoId) {
//     throw new Error("filteredInfoId is required");
//   }

//   try {
//     // Fetch and validate filtered information
//     const filteredInfo = await fetchFilteredInfo(filteredInfoId);

//     // Mark as processing
//     await updateFilteredInfoStatus(filteredInfoId, PROCESSING_STATUSES.PROCESSING);

//     // Parse potential action items
//     const potentialActionItems = parsePotentialActionItems(filteredInfo.potential_action_items);

//     // Generate action items through LLM
//     const actionResult = await generateActionItems(filteredInfo, potentialActionItems);

//     // Create action items in database
//     const actionItemsCreated = await createActionItems(
//       actionResult.action_items,
//       filteredInfoId,
//       filteredInfo
//     );

//     // Mark as completed
//     await updateFilteredInfoStatus(filteredInfoId, PROCESSING_STATUSES.COMPLETED, {
//       processed_at: new Date().toISOString(),
//       action_items_created: actionItemsCreated
//     });

//     return {
//       success: true,
//       filtered_info_id: filteredInfoId,
//       action_items_created: actionItemsCreated,
//     };

//   } catch (error) {
//     console.error("Error processing filtered info:", filteredInfoId, error);

//     // Mark filtered info as failed
//     try {
//       await updateFilteredInfoStatus(filteredInfoId, PROCESSING_STATUSES.FAILED, {
//         processing_error: error.message
//       });
//     } catch (updateError) {
//       console.error("Failed to update filtered info status:", updateError);
//     }

//     throw error;
//   }
// };

export const processFilteredInfo = async (filteredInfoId) => {
  if (!filteredInfoId) {
    throw new Error("filteredInfoId is required");
  }

  const filteredInfoResult = await runQuery(
    `
    MATCH (f:FilteredInformation { id: $filteredInfoId })
    RETURN f
    `,
    {
      filteredInfoId,
    }
  );

  const filteredInfo = toSingleNode(filteredInfoResult, "f");
  if (!filteredInfo) {
    throw new Error("FilteredInformation not found");
  }

  // Set status to processing
  await runQuery(
    `
    MATCH (f:FilteredInformation { id: $filteredInfoId })
    SET f.processing_status = 'processing'
    `,
    {
      filteredInfoId,
    }
  );

  // Parse potential action items from JSON string
  let potentialActionItems = [];
  try {
    potentialActionItems = JSON.parse(
      filteredInfo.potential_action_items || "[]"
    );
  } catch (error) {
    console.error("Failed to parse potential_action_items:", error);
  }

  const actionSchema = {
    type: "object",
    properties: {
      action_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            task_name: {
              type: "string",
              description: "Clear actionable title (max 60 chars)",
            },
            summary_points: {
              type: "array",
              items: {
                type: "string",
              },
              description: "4-6 bullet points for executive brief",
            },
            owner: {
              type: "string",
              description: "Who should execute",
            },
            due_date: {
              type: "string",
              description: "ISO date or null",
              nullable: true,
            },
            team: {
              type: "string",
              enum: ["HR", "Finance", "Research"],
            },
            urgency: {
              type: "string",
              enum: ["critical", "high", "medium", "low"],
            },
          },
          required: ["task_name", "summary_points", "owner", "team", "urgency"],
        },
      },
    },
    required: ["action_items"],
  };

  const currentDate = new Date().toISOString().split("T")[0];
  const actionPrompt = `Based on this filtered information, create action items requiring Founder approval:

Title: ${filteredInfo.title}
Summary: ${filteredInfo.summary}
Priority: ${filteredInfo.strategic_priority}
Teams: ${filteredInfo.teams_involved.join(", ")}

Structured Notes:
${filteredInfo.structured_notes}

Potential Action Items:
${JSON.stringify(potentialActionItems, null, 2)}`;

  const actionResult = await callLLM(
    getActionablePrompt(currentDate),
    actionPrompt,
    "create_action_items",
    actionSchema
  );

  let actionItemsCreated = 0;

  if (actionResult?.action_items?.length) {
    for (const item of actionResult.action_items) {
      const priority =
        item.urgency === "critical"
          ? "high"
          : item.urgency === "high"
          ? "high"
          : item.urgency === "medium"
          ? "medium"
          : "low";

      const importance =
        item.urgency === "critical"
          ? 10
          : item.urgency === "high"
          ? 8
          : item.urgency === "medium"
          ? 5
          : 3;

      const actionItemId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await runQuery(
        `
        MATCH (f:FilteredInformation { id: $filteredInfoId })
        OPTIONAL MATCH (r:RawSubmission { id: $rawSubmissionId })
        CREATE (a:ActionItem {
          id: $actionItemId,
          created_at: $createdAt,
          updated_at: $createdAt,
          title: $title,
          summary: $summary,
          details: $details,
          priority: $priority,
          importance: $importance,
          deadline: $deadline,
          status: 'pending',
          source: $source,
          raw_submission_id: $rawSubmissionId,
          filtered_info_id: $filteredInfoId
        })
        CREATE (a)-[:GENERATED_FROM]->(f)
        FOREACH (submission IN CASE WHEN r IS NOT NULL THEN [r] ELSE [] END |
          CREATE (a)-[:ORIGINATES_FROM]->(submission)
        )
        `,
        {
          actionItemId,
          createdAt,
          title: item.task_name,
          summary: `• ${item.summary_points.join("\n• ")}`,
          details: `**Owner:** ${item.owner}\n**Team:** ${item.team}\n\n${filteredInfo.structured_notes}`,
          priority,
          importance,
          deadline: item.due_date || null,
          source: filteredInfo.title || "FilteredInformation",
          rawSubmissionId: filteredInfo.raw_submission_id,
          filteredInfoId,
        }
      );

      actionItemsCreated += 1;
    }
  }

  // Mark as completed
  await runQuery(
    `
    MATCH (f:FilteredInformation { id: $filteredInfoId })
    SET f.processing_status = 'completed',
        f.processed_at = $processedAt,
        f.action_items_created = $actionItemsCreated
    `,
    {
      filteredInfoId,
      processedAt: new Date().toISOString(),
      actionItemsCreated,
    }
  );

  return {
    success: true,
    filtered_info_id: filteredInfoId,
    action_items_created: actionItemsCreated,
  };
};
