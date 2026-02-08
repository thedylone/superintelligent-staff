import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  ChevronRight,
  AlertTriangle,
  Clock,
  Zap,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useActionItems, SortField, SortOrder } from "@/hooks/useActionItems";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { MarkdownContent } from "@/components/ui/markdown-content";

const priorityConfig = {
  high: {
    label: "High Priority",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  medium: {
    label: "Medium",
    icon: Zap,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  low: {
    label: "Low",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function PendingActionsList() {
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const {
    data: pendingActions,
    isLoading,
    error,
  } = useActionItems({
    status: "pending",
    sortBy,
    sortOrder,
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Pending Action Items
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortField)}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="importance">Importance</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSortOrder}
          >
            <ArrowUpDown
              className={`h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`}
            />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/action-items">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center text-muted-foreground py-8">
              Failed to load action items
            </div>
          ) : !pendingActions || pendingActions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No pending action items
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {pendingActions.slice(0, 4).map((action) => {
                const config = priorityConfig[action.priority];
                return (
                  <Link
                    key={action.id}
                    to={`/action-items?id=${action.id}`}
                    className="block p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {action.title}
                          </h4>
                          <Badge variant="outline" className={config.className}>
                            <config.icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {action.importance && action.importance >= 8 && (
                            <Badge variant="secondary" className="text-xs">
                              Importance: {action.importance}/10
                            </Badge>
                          )}
                        </div>
                        <div className="line-clamp-2">
                          <MarkdownContent content={action.summary} />
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span>{action.source || "Unknown source"}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(action.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          {action.deadline && action.deadline != "null" && (
                            <>
                              <span>•</span>
                              <span
                                className={
                                  new Date(action.deadline) < new Date()
                                    ? "text-destructive"
                                    : "text-warning"
                                }
                              >
                                Due:{" "}
                                {format(
                                  new Date(action.deadline),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
