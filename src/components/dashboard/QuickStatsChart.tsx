import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { useWeeklyActivityStats } from "@/hooks/useWeeklyActivityStats";

const chartConfig = {
  actions: {
    label: "Actions",
    color: "hsl(var(--primary))",
  },
  updates: {
    label: "Updates",
    color: "hsl(var(--accent))",
  },
};

export function QuickStatsChart() {
  const { data, isLoading } = useWeeklyActivityStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Weekly Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.every((d) => d.actions === 0 && d.updates === 0) ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No activity this week
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={data}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="actions"
                fill="var(--color-actions)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="updates"
                fill="var(--color-updates)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
