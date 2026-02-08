import { useQuery } from "@tanstack/react-query";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { api } from "@/lib/api";

interface DailyStats {
  day: string;
  actions: number;
  updates: number;
}

export function useWeeklyActivityStats() {
  return useQuery({
    queryKey: ["weekly_activity_stats"],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6);

      const activityLogs = await api.get<
        { created_at: string; action: string; target_type: string }[]
      >("/api/activity-log", {
        start: weekStart.toISOString(),
        end: addDays(weekEnd, 1).toISOString(),
      });

      // Initialize daily stats
      const dailyStats: Record<string, { actions: number; updates: number }> =
        {};
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const dayKey = format(date, "yyyy-MM-dd");
        dailyStats[dayKey] = { actions: 0, updates: 0 };
      }

      // Aggregate activity logs
      activityLogs?.forEach((log) => {
        const dayKey = format(parseISO(log.created_at), "yyyy-MM-dd");
        if (dailyStats[dayKey]) {
          // Count action_item related activities as "actions"
          if (log.target_type === "action_item") {
            dailyStats[dayKey].actions += 1;
          }
          // Count all activities as "updates" (general activity)
          dailyStats[dayKey].updates += 1;
        }
      });

      // Convert to array format for the chart
      const result: DailyStats[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const dayKey = format(date, "yyyy-MM-dd");
        result.push({
          day: dayNames[i],
          actions: dailyStats[dayKey].actions,
          updates: dailyStats[dayKey].updates,
        });
      }

      return result;
    },
  });
}
