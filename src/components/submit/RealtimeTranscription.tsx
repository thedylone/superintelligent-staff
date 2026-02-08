import { useState, useCallback, useRef, useEffect } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface RealtimeTranscriptionProps {
  onTranscript: (text: string) => void;
  existingText: string;
}

export function RealtimeTranscription({
  onTranscript,
  existingText,
}: RealtimeTranscriptionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Store the text that existed before we started transcribing
  const baseTextRef = useRef<string>("");
  // Store accumulated committed transcripts
  const committedTextRef = useRef<string>("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      console.log("ElevenLabs onPartialTranscript:", data);
      setIsSpeaking(true);
      // Combine base text + committed text + current partial
      const fullText = [
        baseTextRef.current,
        committedTextRef.current,
        data.text,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      console.log("Partial fullText:", fullText);
      onTranscript(fullText);
    },
    onCommittedTranscript: (data) => {
      console.log("ElevenLabs onCommittedTranscript:", data);
      setIsSpeaking(false);
      // Add to committed text
      committedTextRef.current = [committedTextRef.current, data.text]
        .filter(Boolean)
        .join(" ")
        .trim();

      // Update with base + all committed text
      const fullText = [baseTextRef.current, committedTextRef.current]
        .filter(Boolean)
        .join(" ")
        .trim();
      console.log("Committed fullText:", fullText);
      onTranscript(fullText);
    },
  });

  const handleStart = useCallback(async () => {
    setIsConnecting(true);
    try {
      // CRITICAL: Request microphone access FIRST, directly in the click handler
      // This must happen before any async operations to maintain user gesture context
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      console.log(
        "Microphone access granted, tracks:",
        stream.getAudioTracks()
      );

      // Stop the stream immediately - we just needed to ensure permission is granted
      // The ElevenLabs SDK will create its own stream
      stream.getTracks().forEach(track => track.stop());

      // Now fetch the signed URL token from our backend
      const response = await api.get<{ 
        token: string; 
        success: boolean; 
        type: string;
        expires_at: string;
      }>("/api/elevenlabs-token");

      if (!response.success || !response.token) {
        throw new Error("No token received from server");
      }

      console.log("ElevenLabs token type:", response.type);

      // Store current text as the base
      baseTextRef.current = existingText;
      committedTextRef.current = "";

      // Connect using the signed URL token from ElevenLabs
      await scribe.connect({
        token: response.token,
        microphone: {
            echoCancellation: true,
            noiseSuppression: true,
        }
      });

      toast.success("Live transcription started - speak now");
    } catch (error) {
      console.error("Transcription start error:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error("Microphone access denied", {
          description:
            "Please allow microphone access in your browser settings",
        });
      } else {
        toast.error("Failed to start transcription", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, existingText]);

  const handleStop = useCallback(() => {
    scribe.disconnect();
    // Final text is already set via onCommittedTranscript
    toast.info("Live transcription stopped");
  }, [scribe]);

  if (scribe.isConnected) {
    const waveClass = isSpeaking
      ? "w-0.5 bg-current rounded-full animate-wave"
      : "w-0.5 bg-current rounded-full opacity-50";

    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={handleStop}
        className="gap-2"
      >
        <div className="flex items-center gap-0.5 h-4">
          <span
            className={`${waveClass} h-2`}
            style={{ animationDelay: "0ms" }}
          />
          <span
            className={`${waveClass} h-3`}
            style={{ animationDelay: "100ms" }}
          />
          <span
            className={`${waveClass} h-4`}
            style={{ animationDelay: "200ms" }}
          />
          <span
            className={`${waveClass} h-3`}
            style={{ animationDelay: "300ms" }}
          />
          <span
            className={`${waveClass} h-2`}
            style={{ animationDelay: "400ms" }}
          />
        </div>
        Stop
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleStart}
      disabled={isConnecting}
      className="gap-2"
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}
