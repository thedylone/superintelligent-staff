import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ActionItem, ActionItemUpdate, ActionStatus } from "@/types/db";
import { api } from "@/lib/api";

export type SortField = "created_at" | "deadline" | "importance" | "priority";
export type SortOrder = "asc" | "desc";

interface UseActionItemsOptions {
  status?: ActionStatus | "all";
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export function useActionItems(options: UseActionItemsOptions = {}) {
  const { status, sortBy = "created_at", sortOrder = "desc" } = options;

  return useQuery({
    queryKey: ["action_items", status, sortBy, sortOrder],
    queryFn: async () => {
      const data = await api.get<ActionItem[]>("/api/action-items", {
        status,
        sortBy,
        sortOrder,
      });

      // Sort by priority in code if needed
      if (sortBy === "priority" && data) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        data.sort((a, b) => {
          const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
          return sortOrder === "asc" ? diff : -diff;
        });
      }

      return data as ActionItem[];
    },
  });
}

interface CommentWithProfile {
  id: string;
  content: string;
  action_item_id: string;
  user_id: string;
  created_at: string;
  user_name: string | null;
}

export function useActionItemComments(actionItemId: string) {
  return useQuery({
    queryKey: ["action_comments", actionItemId],
    queryFn: async () => {
      return api.get<CommentWithProfile[]>(
        `/api/action-items/${actionItemId}/comments`
      );
    },
    enabled: !!actionItemId,
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: ActionItemUpdate;
    }) => {
      const updateData: ActionItemUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // If resolving (approving/rejecting), add resolution info
      if (updates.status === "approved" || updates.status === "rejected") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      // If resubmitting (changing from revision to pending), clear revision notes
      if (updates.status === "pending") {
        updateData.resolved_at = null;
        updateData.resolved_by = null;
      }

      return api.patch<ActionItem>(`/api/action-items/${id}`, {
        updates: updateData,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["action_items"] });
      const statusMessages: Record<string, string> = {
        pending: "Action item resubmitted for approval",
        approved: "Action item approved",
        rejected: "Action item rejected",
        revision: "Revision requested",
      };
      const status = variables.updates.status;
      toast.success(
        status
          ? statusMessages[status] || "Action item updated"
          : "Action item updated"
      );
    },
    onError: (error) => {
      toast.error("Failed to update action item", {
        description: error.message,
      });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      actionItemId,
      content,
    }: {
      actionItemId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Must be logged in");

      return api.post<CommentWithProfile>(
        `/api/action-items/${actionItemId}/comments`,
        {
          userId: user.id,
          content,
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["action_comments", variables.actionItemId],
      });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error("Failed to add comment", { description: error.message });
    },
  });
}
