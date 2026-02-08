// RAG-based notification recipients system
// Uses database context and transformers to find relevant people to notify

import { pipeline } from '@huggingface/transformers';

let embeddingModel = null;

// Initialize the embedding model
const initializeEmbeddingModel = async () => {
  if (!embeddingModel) {
    try {
      embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('RAG embedding model initialized');
    } catch (error) {
      console.error('Failed to initialize embedding model:', error);
      throw error;
    }
  }
  return embeddingModel;
};

// Generate embeddings for text
const generateEmbedding = async (text) => {
  const model = await initializeEmbeddingModel();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

// Calculate cosine similarity between two vectors
const cosineSimilarity = (a, b) => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Extract relevant context from action item for RAG
const extractActionItemContext = (actionItem) => {
  const contexts = [];
  
  // Main content
  contexts.push(`${actionItem.title} ${actionItem.summary}`);
  
  // Details if available
  if (actionItem.details) {
    contexts.push(actionItem.details);
  }
  
  // Source context
  if (actionItem.source) {
    contexts.push(`Source: ${actionItem.source}`);
  }
  
  // Priority and status context
  contexts.push(`Priority: ${actionItem.priority} Status: ${actionItem.status}`);
  
  return contexts.join(' ');
};

// Create searchable profile context
const createProfileContext = (profile) => {
  const contexts = [];
  
  // Basic info
  if (profile.full_name) contexts.push(profile.full_name);
  if (profile.email) contexts.push(profile.email);
  
  // Professional info
  if (profile.department) contexts.push(`Department: ${profile.department}`);
  if (profile.role_title) contexts.push(`Role: ${profile.role_title}`);
  
  // Additional context that might exist
  if (profile.skills) contexts.push(`Skills: ${profile.skills}`);
  if (profile.expertise) contexts.push(`Expertise: ${profile.expertise}`);
  if (profile.responsibilities) contexts.push(`Responsibilities: ${profile.responsibilities}`);
  
  return contexts.join(' ');
};

// Find relevant recipients using RAG
const findRelevantRecipients = async (actionItemContext, profiles, maxRecipients = 5) => {
  try {
    // Generate embedding for the action item context
    const actionItemEmbedding = await generateEmbedding(actionItemContext);
    
    // Generate embeddings for all profiles and calculate similarity
    const profileSimilarities = [];
    
    for (const profile of profiles) {
      const profileContext = createProfileContext(profile);
      const profileEmbedding = await generateEmbedding(profileContext);
      const similarity = cosineSimilarity(actionItemEmbedding, profileEmbedding);
      
      profileSimilarities.push({
        profile,
        similarity,
        context: profileContext
      });
    }
    
    // Sort by similarity and return top matches
    profileSimilarities.sort((a, b) => b.similarity - a.similarity);
    
    // Filter by a minimum similarity threshold (0.3 is a reasonable baseline)
    const relevantProfiles = profileSimilarities
      .filter(item => item.similarity > 0.3)
      .slice(0, maxRecipients);
    
    return relevantProfiles;
    
  } catch (error) {
    console.error('RAG similarity calculation failed:', error);
    // Fallback to simple keyword matching
    return fallbackKeywordMatching(actionItemContext, profiles, maxRecipients);
  }
};

// Fallback keyword matching if RAG fails
const fallbackKeywordMatching = (actionItemContext, profiles, maxRecipients) => {
  const actionItemLower = actionItemContext.toLowerCase();
  const keywords = actionItemLower.split(/\s+/);
  
  const profileMatches = profiles.map(profile => {
    const profileContext = createProfileContext(profile).toLowerCase();
    let score = 0;
    
    // Simple keyword matching
    keywords.forEach(keyword => {
      if (keyword.length > 3 && profileContext.includes(keyword)) {
        score += 1;
      }
    });
    
    // Boost for department/role matches
    if (profile.department && actionItemLower.includes(profile.department.toLowerCase())) {
      score += 3;
    }
    if (profile.role_title && actionItemLower.includes(profile.role_title.toLowerCase())) {
      score += 2;
    }
    
    return {
      profile,
      similarity: score / keywords.length,
      context: createProfileContext(profile)
    };
  });
  
  return profileMatches
    .filter(item => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxRecipients);
};

// Main notification endpoint with RAG
export const createRAGNotificationEndpoint = (app, runQuery, getBearerToken, jsonError) => {
  
  // Suggest notification recipients using RAG
  app.post("/api/suggest-notification-recipients", async (req, res) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return jsonError(res, 401, "Not authenticated.");
      }

      const { actionItem, decision } = req.body || {};
      
      if (!actionItem || !decision) {
        return jsonError(res, 400, "Missing actionItem or decision");
      }

      // Fetch all approved users from Neo4j with additional context
      const usersResult = await runQuery(`
        MATCH (u:User { approval_status: 'approved' })
        RETURN u.id as id, u.full_name as full_name, 
               u.email as email, u.department as department, u.role_title as role_title,
               u.skills as skills, u.expertise as expertise, u.responsibilities as responsibilities
      `);

      const profiles = usersResult.records.map(record => ({
        id: record.get('id'),
        full_name: record.get('full_name'),
        email: record.get('email'),
        department: record.get('department'),
        role_title: record.get('role_title'),
        skills: record.get('skills'),
        expertise: record.get('expertise'),
        responsibilities: record.get('responsibilities'),
      }));

      if (profiles.length === 0) {
        return res.json({ 
          recipients: [], 
          reasoning: "No approved profiles found.",
          emailSubject: `Action Item Update: ${actionItem.title}`,
          emailBody: `An action item has been ${decision}.`,
          method: "no_profiles"
        });
      }

      // Extract action item context for RAG
      const actionItemContext = extractActionItemContext(actionItem);
      
      // Find relevant recipients using RAG
      const relevantMatches = await findRelevantRecipients(actionItemContext, profiles);
      
      if (relevantMatches.length === 0) {
        return res.json({
          recipients: [],
          reasoning: "No relevant recipients found based on content analysis.",
          emailSubject: `Action Item Update: ${actionItem.title}`,
          emailBody: `An action item has been ${decision}.\n\n**Title:** ${actionItem.title}\n\n**Summary:** ${actionItem.summary}`,
          method: "rag_no_matches"
        });
      }

      // Use LLM to enhance the analysis and draft the email
      const LLM_API_URL = process.env.LLM_API_URL;
      const LLM_API_KEY = process.env.LLM_API_KEY;
      const LLM_MODEL = process.env.LLM_MODEL;

      if (!LLM_API_URL || !LLM_API_KEY) {
        // Return RAG results without LLM enhancement
        const recipients = relevantMatches.map(match => match.profile);
        const reasoning = `Found ${recipients.length} relevant recipients using content similarity analysis. Top matches: ${relevantMatches.slice(0, 3).map(m => `${m.profile.full_name} (${m.profile.department})`).join(', ')}.`;
        
        return res.json({
          recipients,
          reasoning,
          emailSubject: `Action Item ${decision}: ${actionItem.title}`,
          emailBody: `An action item has been ${decision}.\n\n**Title:** ${actionItem.title}\n\n**Summary:** ${actionItem.summary}`,
          method: "rag_only",
          similarityScores: relevantMatches.map(m => ({ name: m.profile.full_name, score: m.similarity }))
        });
      }

      // Enhance with LLM analysis
      const topMatches = relevantMatches.slice(0, 5);
      const matchesList = topMatches.map(match => 
        `- ${match.profile.full_name || "Unknown"} (${match.profile.email || "no email"}): ${match.profile.department || "No dept"}, ${match.profile.role_title || "No title"} [Similarity: ${match.similarity.toFixed(3)}]`
      ).join("\n");

      const decisionContext = decision === "revision" 
        ? "REVISION REQUESTED (needs changes before approval)"
        : decision.toUpperCase();

      const prompt = `You are an assistant that analyzes AI-suggested notification recipients and drafts professional email notifications.

Action Item: "${actionItem.title}"
Summary: ${actionItem.summary}
Details: ${actionItem.details || "N/A"}
Source: ${actionItem.source || "Unknown"}
Priority: ${actionItem.priority}
Decision: ${decisionContext}

AI-suggested relevant team members (based on content similarity):
${matchesList}

The AI has already analyzed content similarity and suggested these recipients. Please:
1. Review the suggestions and confirm which ones make sense
2. Draft a professional email notification with:
   - A clear, concise subject line
   - Professional email body that explains the decision and any required actions
   - Keep the tone professional but warm

Respond ONLY with valid JSON in this exact format:
{
  "recipients": ["email1@example.com", "email2@example.com"],
  "reasoning": "Brief explanation of why these people were selected based on the AI analysis",
  "emailSubject": "Clear subject line for the notification email",
  "emailBody": "Professional email body content explaining the decision. Use markdown formatting for better readability."
}`;

      const aiResponse = await fetch(LLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("LLM API error:", errorText);
        
        // Fallback to RAG-only results
        const recipients = topMatches.map(match => match.profile);
        const reasoning = `AI content analysis found ${recipients.length} relevant recipients. LLM enhancement unavailable.`;
        
        return res.json({
          recipients,
          reasoning,
          emailSubject: `Action Item ${decision}: ${actionItem.title}`,
          emailBody: `An action item has been ${decision}.\n\n**Title:** ${actionItem.title}\n\n**Summary:** ${actionItem.summary}`,
          method: "rag_fallback",
          similarityScores: topMatches.map(m => ({ name: m.profile.full_name, score: m.similarity }))
        });
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      
      // Parse the JSON response from AI
      let aiResult;
      try {
        // Extract JSON from the response (handle markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        aiResult = { 
          recipients: topMatches.map(match => match.profile.email).filter(Boolean),
          reasoning: "AI analysis completed, using RAG-suggested recipients.",
          emailSubject: `Action Item Update: ${actionItem.title}`,
          emailBody: `An action item has been ${decision}.\n\n**Title:** ${actionItem.title}\n\n**Summary:** ${actionItem.summary}`
        };
      }

      // Match emails to full profile data
      const matchedRecipients = profiles.filter(p => 
        p.email && aiResult.recipients.includes(p.email)
      );

      res.json({
        recipients: matchedRecipients,
        reasoning: aiResult.reasoning,
        emailSubject: aiResult.emailSubject || `Action Item Update: ${actionItem.title}`,
        emailBody: aiResult.emailBody || `An action item has been ${decision}.`,
        method: "rag_enhanced",
        similarityScores: topMatches.map(m => ({ name: m.profile.full_name, score: m.similarity }))
      });

    } catch (error) {
      console.error("RAG notification recipients suggestion failed:", error);
      jsonError(res, 500, "Failed to suggest notification recipients");
    }
  });
};
