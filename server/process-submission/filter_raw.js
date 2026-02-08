import crypto from "crypto";
import { runQuery, toSingleNode } from "../neo4j.js";
import { FILTER_SYSTEM_PROMPT } from "./prompts/filter_prompt.js";
import { callLLM, enqueueFilteredInfo } from "./index.js";
import { getRankedFilteredInfo } from "../rag/ranking.js";

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
    `MATCH (r:RawSubmission { id: $submissionId }) RETURN r`,
    { submissionId }
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

  const setClause = fields
    ? `SET r.processing_status = $status, ${fields}`
    : `SET r.processing_status = $status`;

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
      `## Attached Images: ${submission.image_urls.length} image(s)`
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
      related_information: $relatedInformation,
      similarity_analysis: $similarityAnalysis,
      processing_status: 'pending'
    })
    CREATE (f)-[:DERIVED_FROM]->(r)
    `,
    {
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
      relatedInformation: JSON.stringify(filterResult.related_information || []),
      similarityAnalysis: JSON.stringify(filterResult.similarity_analysis || {}),
    }
  );

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
    `,
    {
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
 * Processes RAG results to enhance filtered information with related documents
 * @param {Object} filterResult - The filtered result from LLM
 * @param {Object} ragResults - Results from RAG similarity search
 * @returns {Object} Enhanced filter result with related information
 */
const enhanceWithRagResults = (filterResult, ragResults) => {
  if (!ragResults?.similar_documents?.length) {
    return {
      ...filterResult,
      related_information: [],
      similarity_analysis: {
        total_similar_found: 0,
        processing_time_ms: ragResults?.processing_time_ms || 0,
        keywords_used: ragResults?.keywords_extracted || [],
      },
    };
  }

  const relatedInfo = ragResults.similar_documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    information_type: doc.information_type,
    strategic_priority: doc.strategic_priority,
    similarity_score: doc.similarity_score || doc.llm_relevance_score,
    relationship_type: doc.relationship_type || "related",
    context: doc.context || "Similar content detected",
    suggested_action: doc.suggested_action,
    created_at: doc.created_at,
    summary:
      doc.summary.substring(0, 200) +
      (doc.summary.length > 200 ? "..." : ""),
  }));

  // Detect potential duplicates (high similarity + same type)
  const potentialDuplicates = relatedInfo.filter(
    (doc) =>
      doc.similarity_score > 0.8 &&
      doc.information_type === filterResult.information_type
  );

  // Identify follow-up opportunities
  const followUps = relatedInfo.filter(
    (doc) =>
      doc.relationship_type === "follow_up" ||
      doc.information_type === filterResult.information_type
  );

  return {
    ...filterResult,
    related_information: relatedInfo,
    similarity_analysis: {
      total_similar_found: ragResults.total_found,
      processing_time_ms: ragResults.processing_time_ms,
      keywords_used: ragResults.keywords_extracted,
      potential_duplicates: potentialDuplicates.length,
      follow_up_opportunities: followUps.length,
      similarity_threshold: ragResults.similarity_threshold,
    },
  };
};

/**
 * Creates bidirectional relationships between the new FilteredInformation and similar existing ones
 * Also updates existing FilteredInformation with latest action items if they're on the same topic
 * @param {string} filteredInfoId - ID of the new filtered information
 * @param {Array} similarDocuments - Array of similar documents from RAG
 * @param {Object} newFilterResult - The new filter result with latest action items
 */
const createSimilarityRelationships = async (filteredInfoId, similarDocuments, newFilterResult) => {
  if (!similarDocuments?.length) return;

  const updatedDocuments = [];

  for (const doc of similarDocuments.slice(0, 5)) { // Increased to top 5 for better coverage
    try {
      // Create bidirectional SIMILAR_TO relationships
      await runQuery(
        `
        MATCH (new:FilteredInformation { id: $newId })
        MATCH (existing:FilteredInformation { id: $existingId })
        
        // Create relationship from new to existing
        CREATE (new)-[:SIMILAR_TO {
          similarity_score: $similarityScore,
          relationship_type: $relationshipType,
          context: $context,
          created_at: $createdAt,
          direction: 'outbound'
        }]->(existing)
        
        // Create relationship from existing to new
        CREATE (existing)-[:SIMILAR_TO {
          similarity_score: $similarityScore,
          relationship_type: $relationshipType,
          context: $contextReverse,
          created_at: $createdAt,
          direction: 'inbound'
        }]->(new)
        `,
        {
          newId: filteredInfoId,
          existingId: doc.id,
          similarityScore: doc.similarity_score || doc.llm_relevance_score,
          relationshipType: doc.relationship_type || "related",
          context: doc.context || "Similar content detected via RAG",
          contextReverse: `Related to: ${newFilterResult.title}`,
          createdAt: new Date().toISOString(),
        }
      );

      // If similarity is high and same topic, update existing document with latest action items
      const shouldUpdate = (
        (doc.similarity_score || doc.llm_relevance_score) > 0.7 && 
        doc.information_type === newFilterResult.information_type &&
        (doc.relationship_type === 'duplicate' || doc.relationship_type === 'follow_up')
      );

      if (shouldUpdate) {
        const updatedDoc = await updateExistingWithLatestActionItems(doc.id, newFilterResult, doc);
        updatedDocuments.push(updatedDoc);
      }

    } catch (error) {
      console.error("Failed to create similarity relationship:", error);
    }
  }

  return updatedDocuments;
};

/**
 * Updates existing FilteredInformation with latest approved action items from new submission
 * @param {string} existingDocId - ID of the existing document to update
 * @param {Object} newFilterResult - The new filter result with latest action items
 * @param {Object} existingDoc - The existing document data
 * @returns {Promise<Object>} Updated document information
 */
const updateExistingWithLatestActionItems = async (existingDocId, newFilterResult, existingDoc) => {
  try {
    // Parse existing action items
    const existingActionItems = JSON.parse(existingDoc.potential_action_items || '[]');
    const newActionItems = newFilterResult.potential_action_items || [];
    
    // Merge and deduplicate action items based on task similarity
    const mergedActionItems = mergeActionItems(existingActionItems, newActionItems);
    
    // Update the existing document with merged action items and latest information
    const updatedAt = new Date().toISOString();
    
    await runQuery(
      `
      MATCH (f:FilteredInformation { id: $docId })
      SET f.potential_action_items = $mergedActionItems,
          f.updated_at = $updatedAt,
          f.last_update_source = $sourceId,
          f.update_count = COALESCE(f.update_count, 0) + 1,
          f.summary = CASE 
            WHEN $updateSummary THEN $newSummary 
            ELSE f.summary 
          END,
          f.structured_notes = CASE
            WHEN $updateNotes THEN f.structured_notes + "\n\n## Latest Update (" + $updatedAt + "):\n" + $newNotes
            ELSE f.structured_notes
          END
      `,
      {
        docId: existingDocId,
        mergedActionItems: JSON.stringify(mergedActionItems),
        updatedAt,
        sourceId: newFilterResult.raw_submission_id || 'unknown',
        updateSummary: shouldUpdateSummary(existingDoc, newFilterResult),
        newSummary: newFilterResult.summary,
        updateNotes: shouldUpdateNotes(existingDoc, newFilterResult),
        newNotes: newFilterResult.structured_notes,
      }
    );

    // Create an update log entry
    await createUpdateLog(existingDocId, newFilterResult, mergedActionItems.length - existingActionItems.length);

    console.log(`Updated existing document ${existingDocId} with ${mergedActionItems.length - existingActionItems.length} new action items`);
    
    return {
      document_id: existingDocId,
      action_items_added: mergedActionItems.length - existingActionItems.length,
      total_action_items: mergedActionItems.length,
      updated_at: updatedAt,
    };

  } catch (error) {
    console.error(`Failed to update existing document ${existingDocId}:`, error);
    return null;
  }
};

/**
 * Merges action items from existing and new documents, avoiding duplicates
 * @param {Array} existingItems - Existing action items
 * @param {Array} newItems - New action items to merge
 * @returns {Array} Merged and deduplicated action items
 */
const mergeActionItems = (existingItems, newItems) => {
  const merged = [...existingItems];
  
  for (const newItem of newItems) {
    // Check if this action item is similar to any existing ones
    const isDuplicate = existingItems.some(existingItem => {
      const taskSimilarity = calculateStringSimilarity(
        existingItem.task.toLowerCase(),
        newItem.task.toLowerCase()
      );
      return taskSimilarity > 0.8 && existingItem.owner === newItem.owner;
    });
    
    if (!isDuplicate) {
      // Add metadata to track when this item was added
      merged.push({
        ...newItem,
        added_at: new Date().toISOString(),
        source: 'rag_update',
      });
    } else {
      // Update existing item if new one has higher urgency
      const existingIndex = existingItems.findIndex(existingItem => {
        const taskSimilarity = calculateStringSimilarity(
          existingItem.task.toLowerCase(),
          newItem.task.toLowerCase()
        );
        return taskSimilarity > 0.8 && existingItem.owner === newItem.owner;
      });
      
      if (existingIndex !== -1) {
        const urgencyPriority = { critical: 4, high: 3, medium: 2, low: 1 };
        if (urgencyPriority[newItem.urgency] > urgencyPriority[merged[existingIndex].urgency]) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            urgency: newItem.urgency,
            context: `${merged[existingIndex].context}\n\nUpdated: ${newItem.context}`,
            updated_at: new Date().toISOString(),
          };
        }
      }
    }
  }
  
  return merged;
};

/**
 * Simple string similarity calculation using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
const calculateStringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

/**
 * Calculates Levenshtein distance between two strings
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Determines if the summary should be updated based on content comparison
 */
const shouldUpdateSummary = (existingDoc, newFilterResult) => {
  // Update summary if new one is significantly longer or contains more recent information
  const existingSummaryLength = existingDoc.summary?.length || 0;
  const newSummaryLength = newFilterResult.summary?.length || 0;
  
  return newSummaryLength > existingSummaryLength * 1.5; // 50% longer
};

/**
 * Determines if structured notes should be updated (append new information)
 */
const shouldUpdateNotes = (existingDoc, newFilterResult) => {
  // Always append new structured notes to maintain history
  return newFilterResult.structured_notes && newFilterResult.structured_notes.trim().length > 0;
};

/**
 * Creates an update log entry when a document is modified
 */
const createUpdateLog = async (documentId, newFilterResult, actionItemsAdded) => {
  try {
    await runQuery(
      `
      MATCH (f:FilteredInformation { id: $documentId })
      CREATE (l:UpdateLog {
        id: $logId,
        created_at: $createdAt,
        document_id: $documentId,
        update_type: 'rag_merge',
        action_items_added: $actionItemsAdded,
        source_type: $sourceType,
        summary: $updateSummary
      })
      CREATE (l)-[:UPDATED]->(f)
      `,
      {
        documentId,
        logId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        actionItemsAdded,
        sourceType: newFilterResult.information_type,
        updateSummary: `Merged ${actionItemsAdded} new action items from similar submission: ${newFilterResult.title}`,
      }
    );
  } catch (error) {
    console.error('Failed to create update log:', error);
  }
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

    // Perform RAG similarity search before processing
    console.log("Performing RAG similarity search...");
    const ragResults = await getRankedFilteredInfo(fullContent);
    
    // Filter content through LLM
    const filterResult = await filterContent(fullContent);
    
    // Enhance filter result with RAG findings
    const enhancedFilterResult = enhanceWithRagResults(filterResult, ragResults);

    // Create filtered information in database with enhanced data
    const filteredInfoId = await createFilteredInformation(
      submissionId,
      enhancedFilterResult
    );
    
    // Create similarity relationships in the database and update existing documents
    let updatedDocuments = [];
    if (ragResults?.similar_documents?.length > 0) {
      updatedDocuments = await createSimilarityRelationships(
        filteredInfoId, 
        ragResults.similar_documents,
        enhancedFilterResult
      );
    }

    // Enqueue for background processing
    enqueueForProcessing(filteredInfoId);

    // Mark submission as completed
    await updateSubmissionStatus(submissionId, PROCESSING_STATUSES.COMPLETED, {
      processed_at: new Date().toISOString(),
    });

    // Create activity log
    await createActivityLog(
      submissionId,
      enhancedFilterResult,
      submission.submitted_by
    );

    return {
      success: true,
      filtered_info_id: filteredInfoId,
      action_items_created: 0, // Will be created by background worker
      information_type: enhancedFilterResult.information_type,
      strategic_priority: enhancedFilterResult.strategic_priority,
      related_information: enhancedFilterResult.related_information || [],
      similarity_analysis: enhancedFilterResult.similarity_analysis || {},
      updated_documents: updatedDocuments.filter(Boolean), // Filter out null results
      database_updates: {
        documents_updated: updatedDocuments.filter(Boolean).length,
        total_action_items_added: updatedDocuments.reduce((sum, doc) => sum + (doc?.action_items_added || 0), 0),
      },
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
