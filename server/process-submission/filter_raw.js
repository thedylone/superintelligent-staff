import crypto from "crypto";
import {
    runQuery,
    toSingleNode
} from "../neo4j.js";
import {
    findNearestFilteredInfoByEmbedding,
    generateEmbedding
} from "../rag/ranking.js";
import {
    FILTER_SYSTEM_PROMPT
} from "./prompts/filter_prompt.js";
import {
    callLLM,
    enqueueFilteredInfo
} from "./index.js";


// Constants
const PROCESSING_STATUSES = {
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
};

const INFORMATION_TYPES = [
    "meeting",
    "email",
    "leadership",
    "hiring",
    "budget",
    "research_review",
    "cross_team_sync",
];

const TEAMS = ["HR", "Finance", "Research"];
const PRIORITY_LEVELS = ["critical", "high", "medium", "low"];

// Schema definition
const FILTER_SCHEMA = {
    type: "object",
    properties: {
        information_type: {
            type: "string",
            enum: INFORMATION_TYPES,
        },
        teams_involved: {
            type: "array",
            items: {
                type: "string",
                enum: TEAMS,
            },
        },
        strategic_priority: {
            type: "string",
            enum: PRIORITY_LEVELS,
        },
        title: {
            type: "string",
            description: "Clear title for this information",
        },
        summary: {
            type: "string",
            description: "Brief executive summary",
        },
        structured_notes: {
            type: "string",
            description: "Detailed structured notes in markdown",
        },
        potential_action_items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    task: {
                        type: "string",
                    },
                    owner: {
                        type: "string",
                    },
                    urgency: {
                        type: "string",
                        enum: PRIORITY_LEVELS,
                    },
                    context: {
                        type: "string",
                    },
                },
                required: ["task", "owner", "urgency", "context"],
            },
        },
    },
    required: [
        "information_type",
        "teams_involved",
        "strategic_priority",
        "title",
        "summary",
        "structured_notes",
        "potential_action_items",
    ],
};

/**
 * Fetches a raw submission by ID
 * @param {string} submissionId - The ID of the submission to fetch
 * @returns {Promise<Object>} The submission object
 * @throws {Error} If submission is not found
 */
const fetchSubmission = async (submissionId) => {
    const submissionResult = await runQuery(
        `MATCH (r:RawSubmission { id: $submissionId }) RETURN r`, {
            submissionId
        }
    );

    const submission = toSingleNode(submissionResult, "r");
    if (!submission) {
        throw new Error("Submission not found");
    }

    return submission;
};

/**
 * Updates the processing status of a submission
 * @param {string} submissionId - The ID of the submission
 * @param {string} status - The new status
 * @param {Object} additionalFields - Additional fields to update
 */
const updateSubmissionStatus = async (
    submissionId,
    status,
    additionalFields = {}
) => {
    const fields = Object.entries(additionalFields)
        .map(([key, _]) => `r.${key} = $${key}`)
        .join(", ");

    const setClause = fields ?
        `SET r.processing_status = $status, ${fields}` :
        `SET r.processing_status = $status`;

    await runQuery(`MATCH (r:RawSubmission { id: $submissionId }) ${setClause}`, {
        submissionId,
        status,
        ...additionalFields,
    });
};

/**
 * Extracts and formats content from a submission
 * @param {Object} submission - The submission object
 * @returns {string} Formatted content string
 */
const extractSubmissionContent = (submission) => {
    const contentParts = [];

    if (submission.text_input) {
        contentParts.push(`## Text Input:\n${submission.text_input}`);
    }

    if (submission.audio_transcript) {
        contentParts.push(`## Audio Transcript:\n${submission.audio_transcript}`);
    }

    if (submission.image_urls?.length > 0) {
        contentParts.push(
            `## Attached Images: ${submission.image_urls.join(", ")}`
        );
    }

    return contentParts.join("\n\n---\n\n");
};

/**
 * Processes content through LLM filtering
 * @param {string} content - The content to filter
 * @returns {Promise<Object>} The filtered result
 */
const filterContent = async (content) => {
    const filterResult = await callLLM(
        FILTER_SYSTEM_PROMPT,
        `Analyze and filter the following content:\n\n${content}`,
        "filter_information",
        FILTER_SCHEMA
    );

    if (!filterResult) {
        throw new Error("Failed to filter information");
    }

    return filterResult;
};

/**
 * Creates a FilteredInformation node in the database
 * @param {string} submissionId - The original submission ID
 * @param {Object} filterResult - The enhanced filtered data with RAG results
 * @returns {Promise<string>} The ID of the created filtered information
 */
const createFilteredInformation = async (submissionId, filterResult) => {
    const filteredInfoId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const embeddingContext = [
            filterResult.title,
            filterResult.summary,
            filterResult.structured_notes,
        ]
        .filter(Boolean)
        .join(" ")
        .trim();
    const embedding = embeddingContext ?
        await generateEmbedding(embeddingContext) :
        null;

    await runQuery(
        `
    MATCH (r:RawSubmission { id: $submissionId })
    CREATE (f:FilteredInformation {
      id: $filteredInfoId,
      created_at: $createdAt,
      raw_submission_id: $submissionId,
      information_type: $informationType,
      teams_involved: $teamsInvolved,
      strategic_priority: $strategicPriority,
      title: $title,
      summary: $summary,
      structured_notes: $structuredNotes,
      potential_action_items: $potentialActionItems,
      embedding: $embedding,
      processing_status: 'pending'
    })
    CREATE (f)-[:DERIVED_FROM]->(r)
    `, {
            filteredInfoId,
            createdAt,
            submissionId,
            informationType: filterResult.information_type,
            teamsInvolved: filterResult.teams_involved,
            strategicPriority: filterResult.strategic_priority,
            title: filterResult.title,
            summary: filterResult.summary,
            structuredNotes: filterResult.structured_notes,
            potentialActionItems: JSON.stringify(filterResult.potential_action_items),
            embedding,
        }
    );

    if (embeddingContext) {
        try {
            const relatedMatches = await findNearestFilteredInfoByEmbedding(
                embeddingContext, {
                    threshold: 0.3,
                    limit: 10
                }
            );
            const uniqueRelatedMatches = relatedMatches.filter(
                (match) => match?.id && match.id !== filteredInfoId
            );

            if (uniqueRelatedMatches.length) {
                await runQuery(
                    `
          MATCH (source:FilteredInformation { id: $filteredInfoId })
          UNWIND $relatedMatches AS relatedMatch
          MATCH (target:FilteredInformation { id: relatedMatch.id })
          MERGE (source)-[r:SUPERSEDES]->(target)
          SET r.similarity = relatedMatch.similarity
          `, {
                        filteredInfoId,
                        relatedMatches: uniqueRelatedMatches,
                    }
                );
            }
        } catch (error) {
            console.log("No similar filtered info:", error);
        }
    }

    return filteredInfoId;
};

/**
 * Enqueues filtered information for background processing
 * @param {string} filteredInfoId - The ID of the filtered information
 */
const enqueueForProcessing = (filteredInfoId) => {
    if (typeof enqueueFilteredInfo === "function") {
        try {
            enqueueFilteredInfo(filteredInfoId);
        } catch (error) {
            console.error("Failed to enqueue filtered info for processing:", error);
        }
    }
};

/**
 * Creates an activity log entry for the submission
 * @param {string} submissionId - The submission ID
 * @param {Object} filterResult - The filtered result
 * @param {string} userId - The user who submitted
 */
const createActivityLog = async (submissionId, filterResult, userId) => {
    if (!userId) return;

    await runQuery(
        `
    MATCH (r:RawSubmission { id: $submissionId })
    OPTIONAL MATCH (p:Profile { user_id: $userId })
    CREATE (a:ActivityLog {
      id: $activityId,
      created_at: $createdAt,
      action: 'submitted',
      target: $target,
      target_type: $targetType,
      user_id: $userId
    })
    CREATE (a)-[:RELATES_TO]->(r)
    FOREACH (profile IN CASE WHEN p IS NOT NULL THEN [p] ELSE [] END |
      CREATE (a)-[:PERFORMED_BY]->(profile)
    )
    `, {
            submissionId,
            activityId: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            target: filterResult.title,
            targetType: filterResult.information_type,
            userId,
        }
    );
};

/**
 * Main function to process a raw submission through filtering and create structured information
 * @param {string} submissionId - The ID of the submission to process
 * @returns {Promise<Object>} Processing result with success status and metadata
 */
export const processSubmission = async (submissionId) => {
    if (!submissionId) {
        throw new Error("submissionId is required");
    }

    try {
        // Fetch and validate submission
        const submission = await fetchSubmission(submissionId);

        // Mark as processing
        await updateSubmissionStatus(submissionId, PROCESSING_STATUSES.PROCESSING);

        // Extract and validate content
        const fullContent = extractSubmissionContent(submission);
        if (!fullContent.trim()) {
            await updateSubmissionStatus(submissionId, PROCESSING_STATUSES.FAILED, {
                processing_error: "No content to process",
            });
            return {
                success: false,
                error: "No content to process",
            };
        }

        // Filter content through LLM
        const filterResult = await filterContent(fullContent);
        const filteredInfoId = await createFilteredInformation(submissionId, filterResult);
        // Enqueue for background processing
        enqueueForProcessing(filteredInfoId);

        // Mark submission as completed
        await updateSubmissionStatus(submissionId, PROCESSING_STATUSES.COMPLETED, {
            processed_at: new Date().toISOString(),
        });

        // Create activity log
        await createActivityLog(
            submissionId,
            filterResult,
            submission.submitted_by
        );

        return {
            success: true,
            filtered_info_id: filteredInfoId,
        };
    } catch (error) {
        console.error("Error processing submission:", submissionId, error);

        // Mark submission as failed
        try {
            await updateSubmissionStatus(submissionId, PROCESSING_STATUSES.FAILED, {
                processing_error: error.message,
            });
        } catch (updateError) {
            console.error("Failed to update submission status:", updateError);
        }

        throw error;
    }
};