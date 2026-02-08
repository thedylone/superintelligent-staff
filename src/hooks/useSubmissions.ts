import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export interface RawSubmission {
  id: string;
  created_at: string;
  submitted_by: string | null;
  title: string | null;
  text_input: string | null;
  audio_file_url: string | null;
  audio_transcript: string | null;
  image_urls: string[] | null;
  processing_status: string;
  processing_error: string | null;
  processed_at: string | null;
}

export interface FilteredInformation {
  id: string;
  created_at: string;
  raw_submission_id: string | null;
  information_date: string;
  information_type: string;
  teams_involved: string[] | null;
  strategic_priority: string;
  status: string;
  title: string;
  summary: string;
  structured_notes: string | null;
  potential_action_items: object[] | null;
}

export function useRawSubmissions() {
  return useQuery({
    queryKey: ["raw_submissions"],
    queryFn: async () => {
      const response = await api.get<{ submissions: RawSubmission[] }>(
        "/api/raw-submissions"
      );
      return response.submissions;
    },
  });
}

export function useFilteredInformation() {
  return useQuery({
    queryKey: ["filtered_information"],
    queryFn: async () => {
      const response = await api.get<{ information: FilteredInformation[] }>(
        "/api/filtered-information"
      );
      return response.information;
    },
  });
}

interface SubmitFormData {
  title: string;
  textInput: string;
  audioFile: File | null;
  imageFiles: File[];
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      title,
      textInput,
      audioFile,
      imageFiles,
    }: SubmitFormData) => {
      if (!user) throw new Error("You must be logged in to submit");

      const formData = new FormData();
      formData.append("userId", user.id);
      formData.append("title", title || "");
      formData.append("textInput", textInput || "");
      if (audioFile) {
        toast.info("Transcribing audio...", { id: "transcribe" });
        formData.append("audioFile", audioFile);
      }
      imageFiles.forEach((file) => formData.append("imageFiles", file));

      const response = await api.upload<{
        submission: RawSubmission;
        audioTranscript?: string | null;
        actionItemsCreated: number;
      }>("/api/submissions", formData);

      if (audioFile) {
        if (response.audioTranscript) {
          toast.success("Audio transcribed", { id: "transcribe" });
        } else {
          toast.warning("Audio uploaded but transcription failed", {
            id: "transcribe",
          });
        }
      }

      toast.info("Processing with AI...", { id: "process" });
      if (response.actionItemsCreated > 0) {
        toast.success(`Created ${response.actionItemsCreated} action item(s)`, {
          id: "process",
        });
      } else {
        toast.success("Submission saved", { id: "process" });
      }

      return response.submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["filtered_information"] });
      queryClient.invalidateQueries({ queryKey: ["action_items"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
    onError: (error) => {
      toast.error("Submission failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
