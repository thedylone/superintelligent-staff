import { useState } from "react";
import { api } from "@/lib/api";
import type { ActionItem } from "@/types/db";

interface Recipient {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  role_title: string | null;
}

interface NotificationResponse {
  recipients: Recipient[];
  reasoning: string;
  emailSubject: string;
  emailBody: string;
  method?: string;
  similarityScores?: { name: string; score: number }[];
}

interface NotificationState {
  isLoading: boolean;
  recipients: Recipient[];
  reasoning: string;
  actionTitle: string;
  decision: "approved" | "rejected" | "revision";
  emailSubject: string;
  emailBody: string;
}

export function useNotificationRecipients() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, setState] = useState<NotificationState>({
    isLoading: false,
    recipients: [],
    reasoning: "",
    actionTitle: "",
    decision: "approved",
    emailSubject: "",
    emailBody: "",
  });

  const suggestRecipients = async (
    actionItem: ActionItem,
    decision: "approved" | "rejected" | "revision"
  ) => {
    setState({
      isLoading: true,
      recipients: [],
      reasoning: "",
      actionTitle: actionItem.title,
      decision,
      emailSubject: "",
      emailBody: "",
    });
    setDialogOpen(true);

    try {
      const response = await api.post("/api/suggest-notification-recipients", {
        actionItem: {
          id: actionItem.id,
          title: actionItem.title,
          summary: actionItem.summary,
          details: actionItem.details,
          source: actionItem.source,
          status: actionItem.status,
          priority: actionItem.priority,
        },
        decision,
      }) as NotificationResponse;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        recipients: response.recipients || [],
        reasoning: response.reasoning || "",
        emailSubject: response.emailSubject || "",
        emailBody: response.emailBody || "",
      }));
    } catch (err) {
      console.error("Error in suggestRecipients:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        reasoning: "An error occurred while fetching suggestions.",
        emailSubject: "",
        emailBody: "",
      }));
    }
  };

  return {
    dialogOpen,
    setDialogOpen,
    suggestRecipients,
    ...state,
  };
}