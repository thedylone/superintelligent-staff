import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Activity,
  FileText,
  MessageSquare,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useActivityLog } from "@/hooks/useActivityLog";

const iconMap: Record<string, React.ElementType> = {
  approved: CheckCircle,
  commented: MessageSquare,
  added: FileText,
  updated: Activity,
};

const iconColorMap: Record<string, string> = {
  approved: "text-success",
  commented: "text-primary",
  added: "text-accent",
  updated: "text-chart-4",
};

export function RecentActivityFeed() {
  const { data: activities, isLoading, error } = useActivityLog(10);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center text-muted-foreground py-8">
              Failed to load activity
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {activities.map((activity) => {
                const Icon = iconMap[activity.action] || Activity;
                const iconColor =
                  iconColorMap[activity.action] || "text-muted-foreground";
                const userName = activity.user_name || "Unknown User";

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-secondary">
                        {userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{userName}</span>{" "}
                        <span className="text-muted-foreground">
                          {activity.action}
                        </span>{" "}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
