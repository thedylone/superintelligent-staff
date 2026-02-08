import {
    pipeline
} from "@huggingface/transformers";
import {
    runQuery
} from "../neo4j.js";

let embeddingModel = null;

const initializeEmbeddingModel = async () => {
    if (!embeddingModel) {
        embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embeddingModel;
};

export const generateEmbedding = async (text) => {
    const model = await initializeEmbeddingModel();
    const output = await model(text, {
        pooling: "mean",
        normalize: true
    });
    return Array.from(output.data);
};

export const findNearestFilteredInfoByEmbedding = async (
    text, {
        threshold = 0.3,
        limit = 10,
        candidateLimit = 500
    } = {}
) => {
    if (!text || !text.trim()) return [];

    const cosineSimilarity = (a, b) => {
        if (!a.length || !b.length) return 0;
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        if (!magnitudeA || !magnitudeB) return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    };

    const queryEmbedding = await generateEmbedding(text);

    const result = await runQuery(
        `
    MATCH (f:FilteredInformation)
    WHERE f.embedding IS NOT NULL
    RETURN f.id AS id, f.embedding AS embedding
    ORDER BY f.created_at DESC
    LIMIT toInteger($candidateLimit)
    `, {
            candidateLimit: Number.isFinite(candidateLimit) ?
                Math.max(1, Math.trunc(candidateLimit)) : 500,
        }
    );

    const matches = [];

    for (const record of result.records) {
        const id = record.get("id");
        const embedding = record.get("embedding");
        if (!id || !Array.isArray(embedding) || embedding.length === 0) continue;

        const similarity = cosineSimilarity(queryEmbedding, embedding);
        console.log("similarity", similarity);
        if (similarity >= threshold) {
            matches.push({
                id,
                similarity
            });
        }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, limit);
};