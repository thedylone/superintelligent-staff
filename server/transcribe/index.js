// ElevenLabs transcription functionality using their official approach
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const createElevenLabsEndpoints = (app, getBearerToken, getSessionUser, jsonError) => {
  // Authentication middleware for ElevenLabs endpoints
  const requireAuth = async (req, res, next) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return jsonError(res, 401, "Not authenticated.");
      }
      const user = await getSessionUser(token);
      if (!user) {
        return jsonError(res, 401, "Not authenticated.");
      }
      req.user = user;
      next();
    } catch (error) {
      console.error("ElevenLabs auth check failed:", error);
      return jsonError(res, 500, "Failed to authenticate.");
    }
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
