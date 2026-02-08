import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface ActivityWithProfile {
  id: string;
  user_id: string;
  action: string;
  target: string;
  target_type: string;
  created_at: string;
  user_name: string | null;
}

export function useActivityLog(limit: number = 10) {
  return useQuery({
    queryKey: ["activity_log", limit],
    queryFn: async () => {
      return api.get<ActivityWithProfile[]>("/api/activity-log", { limit });
    },
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      action,
      target,
      targetType = "document",
    }: {
      action: string;
      target: string;
      targetType?: string;
    }) => {
      if (!user) throw new Error("Must be logged in");

      return api.post<ActivityWithProfile>("/api/activity-log", {
        userId: user.id,
        action,
        target,
        targetType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
  });
}
