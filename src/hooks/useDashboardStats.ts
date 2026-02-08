import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      return api.get<{
        pendingActions: number;
        approvedActions: number;
        revisionActions: number;
        activeUpdates: number;
        teamMembers: number;
      }>("/api/dashboard-stats");
    },
  });
}
