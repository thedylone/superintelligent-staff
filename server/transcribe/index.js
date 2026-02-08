// ElevenLabs transcription functionality using their official approach
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const createElevenLabsEndpoints = (app, getBearerToken, sessions, jsonError) => {
  // Authentication middleware for ElevenLabs endpoints
  const requireAuth = (req, res, next) => {
    const token = getBearerToken(req);
    if (!token || !sessions.has(token)) {
      return jsonError(res, 401, "Not authenticated.");
    }
    req.user = sessions.get(token).user;
    next();
  };

  // ElevenLabs signed URL endpoint for real-time transcription
  app.get("/api/elevenlabs-token", requireAuth, async (req, res) => {
    try {
      const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
      if (!ELEVENLABS_API_KEY) {
        return jsonError(res, 500, "ElevenLabs API key not configured");
      }

      // Create a single-use token for realtime scribe
      const token = await elevenlabs.tokens.singleUse.create("realtime_scribe");

      res.json({
        token: token.token,
        success: true,
        type: "signed_url",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      });

    } catch (error) {
      console.error("ElevenLabs token generation failed:", error);
      jsonError(res, 500, "Failed to generate transcription token");
    }
  });
};
